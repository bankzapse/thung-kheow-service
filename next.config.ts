import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      // images.unsplash.com เอาออกแล้ว — รูป landing เก็บไว้ใน public/img เอง
    ],
  },
};

export default nextConfig;
