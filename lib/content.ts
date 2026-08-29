import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

export const CATEGORIES = [
  { id: 'tutorial', label: '攝影教學', description: '從看懂照片開始：曝光、構圖、光線與暗房技巧。' },
  { id: 'news', label: '社團動態', description: '活動記錄、招新資訊與作品展回顧。' },
  { id: 'showcase', label: '3D 展示', description: '以 3D 模型拆解器材與空間，可旋轉互動。' }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export function getCategory(id: string) {
  return CATEGORIES.find((category) => category.id === id);
}

const dateSchema = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value));

const frontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: dateSchema,
  updated: dateSchema.optional(),
  category: z.string().refine(isCategoryId, 'Unknown category'),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  draft: z.boolean().default(false),
  author: z.string().default('NEHS 攝影社')
});

export type ArticleFrontmatter = z.infer<typeof frontmatterSchema>;
export type ArticleMeta = ArticleFrontmatter & { slug: string; readingMinutes: number };
export type Article = ArticleMeta & { content: string };

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

export function readingMinutes(text: string): number {
  const cjkCharacters = (text.match(CJK_PATTERN) ?? []).length;
  const latinWords = (text.replace(CJK_PATTERN, ' ').match(/[A-Za-z0-9'_-]+/g) ?? []).length;
  return Math.max(1, Math.round(cjkCharacters / 400 + latinWords / 220));
}

function parseArticleFile(fileName: string): Article | null {
  const slug = fileName.replace(/\.mdx?$/, '');
  const filePath = path.join(ARTICLES_DIR, fileName);
  if (!fs.existsSync(ARTICLES_DIR)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[content] Skipping ${fileName}: invalid frontmatter`, parsed.error.flatten().fieldErrors);
    return null;
  }
  return {
    ...parsed.data,
    slug,
    readingMinutes: readingMinutes(content),
    content
  };
}

function includeDrafts(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function getAllArticles(includeDrafts?: boolean): ArticleMeta[] {
  const drafts = includeDrafts ?? (process.env.NODE_ENV !== 'production');
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((fileName) => /\.mdx?$/.test(fileName))
    .map(parseArticleFile)
    .filter((article): article is Article => article !== null)
    .filter((article) => drafts || !article.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | null {
  if (!fs.existsSync(ARTICLES_DIR)) return null;
  const fileName = fs
    .readdirSync(ARTICLES_DIR)
    .find((name) => name.replace(/\.mdx?$/, '') === slug);
  if (!fileName) return null;
  const article = parseArticleFile(fileName);
  if (!article) return null;
  if (article.draft && !includeDrafts()) return null;
  return article;
}

export function getArticlesByCategory(id: CategoryId): ArticleMeta[] {
  return getAllArticles().filter((article) => article.category === id);
}

export function getRelatedArticles(slug: string, limit = 2): ArticleMeta[] {
  const article = getAllArticles().find((item) => item.slug === slug);
  if (!article) return [];
  const sameCategory = getAllArticles().filter((item) => item.slug !== slug && item.category === article.category);
  const others = getAllArticles().filter((item) => item.slug !== slug && item.category !== article.category);
  return [...sameCategory, ...others].slice(0, limit);
}

export function getAdjacentArticles(slug: string): { newer: ArticleMeta | null; older: ArticleMeta | null } {
  const articles = getAllArticles();
  const index = articles.findIndex((item) => item.slug === slug);
  return {
    newer: index > 0 ? articles[index - 1] : null,
    older: index >= 0 && index < articles.length - 1 ? articles[index + 1] : null
  };
}
