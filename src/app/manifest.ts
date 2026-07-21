import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESC } from "@/lib/site";

/**
 * PWA manifest — ให้ติดตั้งลงหน้าจอได้โดยไม่ต้องผ่านสโตร์
 * start_url = /app (หน้าเลือกพอร์ทัล → เด้งเข้าล็อกอิน/หน้าแรกตามสถานะ)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ถุงเขียว — หย่อนขยะรีไซเคิล สะสมแต้ม แลกเงิน",
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    lang: "th",
    categories: ["utilities", "lifestyle", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
