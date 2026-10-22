import type { NextConfig } from 'next';

// 實機測試時，讓手機等區網裝置載入 dev client chunks。每台開發機的區網 IP 不同，
// 所以從 .env.local 讀取（逗號分隔的 hostname），不寫進版控。
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  experimental: {
    // three / gsap 只在 About 路由使用，model-viewer 只在文章內嵌使用：
    // 讓 Next 對這些包做按需導入優化，避免多餘模組進入共用包。
    optimizePackageImports: ['three', 'gsap', '@google/model-viewer']
  }
};

export default nextConfig;
