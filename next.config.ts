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
  // HTTP security headers ทุก route
  // ⚠️ ตั้งใจไม่ใส่ X-Frame-Options / frame-ancestors — LIFF ต้องฝังแอปใน webview ของ LINE
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // บังคับ HTTPS 1 ปี (กัน downgrade/SSL strip) — โดเมนขึ้น HTTPS อยู่แล้ว
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // ห้ามเบราว์เซอร์เดา MIME (กัน XSS จากไฟล์ที่ถูกตีความผิดชนิด)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ส่ง referrer เฉพาะ origin เมื่อข้ามโดเมน (กัน path/query รั่ว)
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
