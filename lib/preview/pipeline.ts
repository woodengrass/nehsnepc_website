/**
 * Version-locked browser MDX pipeline for `/preview` (ADR-0006).
 *
 * MUST stay identical to the production render in
 * `app/tutorial/[slug]/page.tsx`:
 *   remarkPlugins: [remarkGfm]
 *   rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]
 *
 * The versions below are the exact installed pins (see ADR-0006); the
 * consistency spec fails on any drift between these constants,
 * `package.json`, and the installed `node_modules` copies.
 */

import { evaluate } from '@mdx-js/mdx';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import * as jsxRuntime from 'react/jsx-runtime';

export const PREVIEW_MDX_PIPELINE = {
  mdx: '3.1.1',
  remarkGfm: '4.0.1',
  rehypeSlug: '6.0.0',
  rehypeAutolinkHeadings: '7.1.0'
} as const;

/** Component names the MDX scope must provide — mirrors `mdxComponents` keys. */
export const PREVIEW_COMPONENT_NAMES = ['Figure', 'Callout', 'Model3D', 'a'] as const;

export type PreviewMdxModule = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: React.ComponentType<any>;
};

/**
 * Compile fetched MDX body in the browser with the production plugin set.
 * Frontmatter must already be stripped (see `parsePreviewMdx`).
 */
export async function compilePreviewBody(body: string): Promise<PreviewMdxModule> {
  const file = await evaluate(body, {
    ...jsxRuntime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]
  });
  return { default: file.default as PreviewMdxModule['default'] };
}
