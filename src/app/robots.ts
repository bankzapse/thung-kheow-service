import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * กันไม่ให้หน้าหลังล็อกอินถูก crawl
 *
 * layout ของ /admin /shop /franchise และแอปผู้ขายเป็น client component ทั้งหมด
 * (กันด้วย useEffect + router.replace) → ใส่ `export const metadata` ไม่ได้
 * robots.txt จึงเป็นด่านหลัก
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/shop/",
          "/franchise/",
          "/reports/",
          "/auth/",
          // แอปฝั่งผู้ขาย (ต้องล็อกอิน)
          "/app",
          "/home",
          "/drop",
          "/points",
          "/status",
          "/profile",
          "/prices",
          "/rewards",
          "/wallet",
          "/income",
          "/jobs",
          "/job/",
          "/route",
          "/schedule",
          "/create",
          // หน้าล็อกอิน/สมัคร — ไม่มีประโยชน์ต่อ index
          "/login",
          "/register",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
