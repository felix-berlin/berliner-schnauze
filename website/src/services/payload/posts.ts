import type { Media, Post } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl, publicDocs } from "@services/payload.ts";
import { type DefaultTypedEditorState, lexicalToHtml } from "payload-app/lexical-html";

/** A run of article html, or an image the article renders as a `<Picture>`. */
export type ArticleBlock = string | Media;

/** A post as the site renders it: the Payload doc, its rich text as article blocks and the reading time. */
export type SitePost = Pick<
  Post,
  "contentModifiedAt" | "excerpt" | "id" | "meta" | "publishedAt" | "title"
> & {
  blocks: ArticleBlock[];
  featuredImage: Media | null;
  readingTime: number;
  slug: string;
};

/** The media doc with its url made absolute, or null if it is not populated or has no file. */
const absoluteMedia = (media: Media | number | null | undefined): Media | null => {
  const url = mediaUrl(media);
  return url && typeof media === "object" ? { ...media!, url } : null;
};

type Node = DefaultTypedEditorState["root"]["children"][number];

const html = (state: DefaultTypedEditorState, children: Node[]) =>
  lexicalToHtml(
    { root: { ...state.root, children } },
    {
      converters: {
        // A Lexical quote holds inline children; the article styles the paragraphs inside the blockquote.
        quote: ({ node, nodesToHTML }) =>
          `<blockquote class="c-magazin-article__quote"><p>${nodesToHTML({ nodes: node.children }).join("")}</p></blockquote>`,
      },
    },
  );

/** Splits stored rich text at its images: each image becomes its own block, everything between them one html block. */
export const toPostBlocks = (content: unknown): ArticleBlock[] => {
  const state = content as DefaultTypedEditorState | null | undefined;
  const nodes = state?.root?.children;
  if (!state || !nodes) return [];

  const blocks: ArticleBlock[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length) blocks.push(html(state, run));
    run = [];
  };

  for (const node of nodes) {
    if (node.type !== "upload") {
      run.push(node);
      continue;
    }
    flush();
    const media = absoluteMedia(node.value as Media | number);
    if (media?.mimeType?.startsWith("image")) blocks.push(media);
  }
  flush();
  return blocks;
};

const WORDS_PER_MINUTE = 200;

const readingTime = (blocks: ArticleBlock[]): number => {
  const text = blocks
    .filter((b) => typeof b === "string")
    .join(" ")
    .replace(/<[^>]*>/g, " ");
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));
};

/** A stored post as a SitePost, or undefined when it lacks its slug or title (a draft may). */
/** A post as a draft may be stored: strictDraftTypes types its required fields optional. */
type StoredPost = Omit<Post, "createdAt" | "title" | "updatedAt"> &
  Partial<Pick<Post, "createdAt" | "title" | "updatedAt">>;

const toSitePost = ({
  content,
  contentModifiedAt,
  excerpt,
  featuredImage,
  id,
  meta,
  publishedAt,
  slug,
  title,
}: StoredPost): SitePost | undefined => {
  if (!slug || !title) return undefined;
  const blocks = toPostBlocks(content);
  return {
    blocks,
    contentModifiedAt,
    excerpt,
    featuredImage: absoluteMedia(featuredImage),
    id,
    meta,
    publishedAt,
    readingTime: readingTime(blocks),
    slug,
    title,
  };
};

const loadPosts = async (): Promise<SitePost[]> => {
  const { docs } = await (
    await getPayloadClient()
  ).find({
    collection: "posts",
    depth: 1,
    pagination: false,
    sort: "-publishedAt",
    ...publicDocs(),
  });
  return docs.flatMap((doc) => toSitePost(doc) ?? []);
};

/** The latest version of a post, draft included, for the editor's preview (never cached). */
export const fetchDraftPost = async (id: number): Promise<SitePost | undefined> => {
  const doc = await (
    await getPayloadClient()
  ).findByID({ collection: "posts", depth: 1, disableErrors: true, draft: true, id });
  return doc ? toSitePost(doc) : undefined;
};

export const fetchAllPosts = ttl(60_000, loadPosts);
