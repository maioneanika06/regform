import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [],
    // Allow data: URLs for QR code images
    unoptimized: true,
  },
};

export default nextConfig;
