import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow the current Wi-Fi host to load Next dev client chunks on physical devices.
  allowedDevOrigins: ['192.168.68.61']
};

export default nextConfig;
