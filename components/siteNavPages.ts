export const SITE_NAV_PAGES = [
  ['/', 'Home', '首頁'],
  ['/about', 'About', '關於'],
  ['/tutorial', 'Tutorial', '教學'],
  ['/tools', 'Tools', '工具'],
  ['/contact', 'Contact', '聯絡']
] as const;

export type SiteNavPage = (typeof SITE_NAV_PAGES)[number];
export type SiteNavHref = (typeof SITE_NAV_PAGES)[number][0];
