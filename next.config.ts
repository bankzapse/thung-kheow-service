import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไม่ ignore lint ตอน build แล้ว → lint error จะบล็อก deploy ได้ (เดิมปิดไว้ = ไม่มีอะไรกันเลย)
  // ตอนนี้เหลือแต่ warning (unused vars/exhaustive-deps) ที่ไม่บล็อก build — ทยอยเก็บกวาดได้
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
