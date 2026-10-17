import type { Media } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl, publicDocs } from "@services/payload.ts";
import { toSeoData } from "@services/payload/seo.ts";
import { berlinParts } from "@utils/wordOfTheDay.ts";
import { wpDate } from "@utils/wpDate.ts";
import { lexicalToHtml } from "payload-app/lexical-html";

import type { ArticleBlock, PostNode } from "@/types/cms.ts";

export type { PostNode };

type LexicalNode = { children?: LexicalNode[]; type?: string; value?: unknown };
type LexicalRoot = { root: { children: LexicalNode[] } & Record<string, unknown> };

const html = (state: LexicalRoot, children: LexicalNode[]) =>
  lexicalToHtml({ root: { ...state.root, children } });

/**
 * Splits stored rich text back into the blocks the article components render: images and quotes become
 * their own block, everything between them one html block. Inverse of the import's `mapPost`.
 */
export const toPostBlocks = (content: unknown): ArticleBlock[] => {
  const state = content as LexicalRoot | null | undefined;
  const nodes = state?.root?.children;
  if (!state || !nodes) return [];

  const blocks: ArticleBlock[] = [];
  let run: LexicalNode[] = [];
  const flush = () => {
    if (run.length)
      blocks.push({ name: "core/html", order: blocks.length, saveContent: html(state, run) });
    run = [];
  };

  for (const node of nodes) {
    if (node.type === "upload") {
      flush();
      const media = node.value as Media | number | undefined;
      if (typeof media === "object" && media?.mimeType?.startsWith("image") && media.url) {
        blocks.push({
          attributes: {
            alt: media.alt ?? "",
            height: String(media.height ?? ""),
            url: mediaUrl(media)!,
            width: String(media.width ?? ""),
          },
          name: "core/image",
          order: blocks.length,
          saveContent: null,
        });
      }
    } else if (node.type === "quote") {
      flush();
      // A Lexical quote holds inline children; the article component expects the paragraphs inside the blockquote.
      const value = html(state, [{ children: node.children, type: "paragraph" }]);
      blocks.push({
        attributes: { value },
        name: "core/quote",
        order: blocks.length,
        saveContent: value,
      });
    } else {
      run.push(node);
    }
  }
  flush();
  return blocks;
};

/** WP `date` of a post: local time of the site (Berlin), no zone, no milliseconds. */
const berlinLocalDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const p = berlinParts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
};

const WORDS_PER_MINUTE = 200;

const readingTime = (blocks: ArticleBlock[]): number => {
  const text = blocks
    .map((b) => b.saveContent ?? "")
    .join(" ")
    .replace(/<[^>]*>/g, " ");
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));
};

const loadPosts = async (): Promise<PostNode[]> => {
  const { docs } = await (
    await getPayloadClient()
  ).find({
    collection: "posts",
    depth: 1,
    pagination: false,
    sort: "-publishedAt",
    ...publicDocs(),
  });
  return docs.flatMap((post) => {
    // A draft (SHOW_TEST_DATA) may lack its title: strictDraftTypes types it optional.
    if (!post.slug || !post.title) return [];
    const blocks = toPostBlocks(post.content);
    const seo = toSeoData(post.meta, "article");
    const image = mediaUrl(post.featuredImage);
    return [
      {
        blocks,
        date: berlinLocalDate(post.publishedAt),
        excerpt: post.excerpt ?? null,
        featuredImage: image
          ? {
              node: {
                altText:
                  typeof post.featuredImage === "object" ? (post.featuredImage?.alt ?? null) : null,
                sourceUrl: image,
              },
            }
          : null,
        id: String(post.id),
        modifiedGmt: wpDate(post.contentModifiedAt),
        seo: seo && { ...seo, readingTime: readingTime(blocks) },
        slug: post.slug,
        title: post.title,
      },
    ];
  });
};

export const fetchAllPosts = ttl(60_000, loadPosts);
