import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * หน้าสาธารณะทั้งหมด — ที่เหลืออยู่หลังล็อกอินจึงไม่ใส่ (ดู robots.ts)
 * ถ้าวันหลังทำหน้าตู้รายจุด (/cabinets/[จังหวัด]) ให้เพิ่มที่นี่
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/delete-account`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
