import { getImageResponse } from '@/lib/og';

export const alt = 'NEHS Photography Club — NEPC Journal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return getImageResponse();
}
