import { expect, test } from '@playwright/test';

import {
  getAdjacentArticles,
  getAllArticles,
  getArticle,
  getArticlesByCategory,
  getRelatedArticles,
  readingMinutes
} from '../../lib/content';
import {
  ALLOWED_CATEGORIES,
  ISO_DATE_RE,
  SLUG_RE,
  frontmatterStrictSchema,
  isIsoCalendarDate,
  isUrlSafeSlug
} from '../../lib/content-contract';

test.describe('article contract: exact defaults + unchanged public queries', () => {
  test('strict schema defaults are exact (tags [], draft false, author NEHS)', () => {
    const parsed = frontmatterStrictSchema.safeParse({
      title: 'T',
      description: 'D',
      date: '2026-09-02',
      category: 'tutorial'
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tags).toEqual([]);
    expect(parsed.data.draft).toBe(false);
    expect(parsed.data.author).toBe('NEHS 攝影社');
  });

  test('validator accepts both draft defaults (legacy false, CMS true)', () => {
    const legacyDefault = frontmatterStrictSchema.safeParse({
      title: 'T',
      description: 'D',
      date: '2026-09-02',
      category: 'tutorial'
    });
    expect(legacyDefault.success).toBe(true);
    if (legacyDefault.success) expect(legacyDefault.data.draft).toBe(false);

    const cmsExplicit = frontmatterStrictSchema.safeParse({
      title: 'T',
      description: 'D',
      date: '2026-09-02',
      category: 'tutorial',
      draft: true
    });
    expect(cmsExplicit.success).toBe(true);
    if (cmsExplicit.success) expect(cmsExplicit.data.draft).toBe(true);
  });

  test('contract constants match the documented allowlist', () => {
    expect([...ALLOWED_CATEGORIES]).toEqual(['tutorial', 'news', 'showcase']);
    expect(ISO_DATE_RE.source).toBe('^\\d{4}-\\d{2}-\\d{2}$');
    expect(SLUG_RE.test('example')).toBe(true);
    expect(SLUG_RE.test('exposure_and_brightness')).toBe(true);
    expect(isUrlSafeSlug('Example')).toBe(false);
    expect(isUrlSafeSlug('has space')).toBe(false);
    expect(isIsoCalendarDate('2026-09-02')).toBe(true);
    expect(isIsoCalendarDate('2026-02-30')).toBe(false);
    expect(isIsoCalendarDate('not-a-date')).toBe(false);
  });

  test('title/description required, ISO dates enforced, tags unique', () => {
    expect(frontmatterStrictSchema.safeParse({ description: 'D', date: '2026-09-02', category: 'tutorial' }).success).toBe(false);
    expect(frontmatterStrictSchema.safeParse({ title: 'T', date: '2026-09-02', category: 'tutorial' }).success).toBe(false);
    expect(
      frontmatterStrictSchema.safeParse({ title: 'T', description: 'D', date: '09/02/2026', category: 'tutorial' }).success
    ).toBe(false);
    expect(
      frontmatterStrictSchema.safeParse({ title: 'T', description: 'D', date: '2026-02-30', category: 'tutorial' }).success
    ).toBe(false);
    expect(
      frontmatterStrictSchema.safeParse({ title: 'T', description: 'D', date: '2026-09-02', category: 'nope' }).success
    ).toBe(false);
    expect(
      frontmatterStrictSchema.safeParse({
        title: 'T',
        description: 'D',
        date: '2026-09-02',
        category: 'tutorial',
        tags: ['a', 'a']
      }).success
    ).toBe(false);
    expect(
      frontmatterStrictSchema.safeParse({
        title: 'T',
        description: 'D',
        date: '2026-09-02',
        category: 'tutorial',
        cover: '/images/generated/hero-1280.webp'
      }).success
    ).toBe(false);
  });

  test('readingMinutes uses CJK/400 + latin/220 with minimum 1', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('字'.repeat(400))).toBe(1);
    expect(readingMinutes('字'.repeat(800))).toBe(2);
    expect(readingMinutes(Array(220).fill('word').join(' '))).toBe(1);
    expect(readingMinutes(Array(440).fill('word').join(' '))).toBe(2);
  });

  test('public queries unchanged: sorting, draft filtering, slugs', () => {
    const withDrafts = getAllArticles(true);
    const slugs = withDrafts.map((article) => article.slug);
    // Both fixtures are draft:true; development-visible, production-hidden.
    expect(slugs).toContain('example');
    expect(slugs).toContain('exposure_and_brightness');
    // Descending lexicographic date: 2026-09-08 before 2026-09-02.
    expect(slugs.indexOf('exposure_and_brightness')).toBeLessThan(slugs.indexOf('example'));

    const published = getAllArticles(false);
    expect(published.find((article) => article.slug === 'example')).toBeUndefined();
    expect(published.find((article) => article.slug === 'exposure_and_brightness')).toBeUndefined();

    const example = getArticle('example');
    expect(example).not.toBeNull();
    expect(example?.slug).toBe('example');
    expect(example?.category).toBe('tutorial');
    expect(typeof example?.readingMinutes).toBe('number');

    expect(getArticlesByCategory('tutorial').map((article) => article.slug)).toEqual(slugs.filter((slug) => slug === 'example' || slug === 'exposure_and_brightness'));
    expect(getRelatedArticles('example', 2).length).toBeLessThanOrEqual(2);
    const adjacent = getAdjacentArticles('example');
    expect(adjacent).toHaveProperty('newer');
    expect(adjacent).toHaveProperty('older');
  });
});
