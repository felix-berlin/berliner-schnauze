import type { Media } from "payload-app";

import { getPayloadClient, mediaUrl } from "@services/payload.ts";
import { toSeoData, wpDate } from "@services/payload/seo.ts";
import { ttl } from "@services/cache.ts";
import { SHOW_TEST_DATA } from "astro:env/client";
import { lexicalToHtml } from "payload-app/lexical-html";

import type { ArticleBlock, PostNode } from "@/types/cms.ts";

export type { PostNode };
export type PostNodes = PostNode[];

type LexicalNode = { children?: LexicalNode[]; type?: string; value?: unknown };
type LexicalRoot = { root: { children: LexicalNode[] } & Record<string, unknown> };

const html = (state: LexicalRoot, children: LexicalNode[]) => lexicalToHtml({ root: { ...state.root, children } });

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
    if (run.length) blocks.push({ name: "core/html", order: blocks.length, saveContent: html(state, run) });
    run = [];
  };

  for (const node of nodes) {
    if (node.type === "upload") {
      flush();
      const media = node.value as Media | number | undefined;
      if (typeof media === "object" && media?.mimeType?.startsWith("image") && media.url) {
        blocks.push({
          attributes: { alt: media.alt ?? "", height: String(media.height ?? ""), url: mediaUrl(media)!, width: String(media.width ?? "") },
          name: "core/image",
          order: blocks.length,
          saveContent: null,
        });
      }
    } else if (node.type === "quote") {
      flush();
      // A Lexical quote holds inline children; the article component expects the paragraphs inside the blockquote.
      const value = html(state, [{ children: node.children, type: "paragraph" }]);
      blocks.push({ attributes: { value }, name: "core/quote", order: blocks.length, saveContent: value });
    } else {
      run.push(node);
    }
  }
  flush();
  return blocks;
};

const WORDS_PER_MINUTE = 200;

const readingTime = (blocks: ArticleBlock[]): number => {
  const text = blocks.map((b) => b.saveContent ?? "").join(" ").replace(/<[^>]*>/g, " ");
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));
};

const loadPosts = async (): Promise<PostNode[]> => {
  const { docs } = await (await getPayloadClient()).find({
    collection: "posts",
    depth: 1,
    pagination: false,
    sort: "-publishedAt",
    ...(SHOW_TEST_DATA ? { draft: true } : { where: { _status: { equals: "published" } } }),
  });
  return docs.flatMap((post) => {
    if (!post.slug) return [];
    const blocks = toPostBlocks(post.content);
    const seo = toSeoData(post.seo);
    const image = mediaUrl(post.featuredImage);
    return [
      {
        blocks,
        date: wpDate(post.publishedAt),
        excerpt: post.excerpt ?? null,
        featuredImage: image ? { node: { altText: typeof post.featuredImage === "object" ? (post.featuredImage?.alt ?? null) : null, sourceUrl: image } } : null,
        id: String(post.id),
        seo: seo && { ...seo, readingTime: readingTime(blocks) },
        slug: post.slug,
        title: post.title,
      },
    ];
  });
};

export const fetchAllPosts = ttl(60_000, loadPosts);
