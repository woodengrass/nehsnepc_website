import { getImageResponse } from '@/lib/og';
import { DEFAULT_OG_IMAGE_ALT } from '@/lib/seo';

export const alt = DEFAULT_OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return getImageResponse();
}
