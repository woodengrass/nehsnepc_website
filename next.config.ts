import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow the current Wi-Fi host to load Next dev client chunks on physical devices.
  allowedDevOrigins: ['192.168.68.61'],
  experimental: {
    // three / gsap 只在 About 路由使用，model-viewer 只在文章內嵌使用：
    // 讓 Next 對這些包做按需導入優化，避免多餘模組進入共用包。
    optimizePackageImports: ['three', 'gsap', '@google/model-viewer']
  }
};

export default nextConfig;
