/**
 * ข้อมูลเว็บส่วนกลาง — ใช้ทำ metadata / canonical / OG / sitemap / JSON-LD
 *
 * ⚠️ ตั้ง NEXT_PUBLIC_SITE_URL ให้ตรงกับโดเมนจริงตอน deploy
 * ไม่ตั้ง = ใช้ค่าดีฟอลต์ด้านล่าง (canonical/OG จะชี้ผิดโดเมน → SEO เสีย)
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://thung-kheow.com").replace(/\/$/, "");

export const SITE_NAME = "ถุงเขียว";
export const SITE_TITLE = "ถุงเขียว — เปลี่ยนขยะรีไซเคิลเป็นเงิน ผ่านตู้ Drop Bag";
export const SITE_DESC =
  "ถุงเขียว (Thung Khiao): คัดแยกขยะรีไซเคิลใส่ถุง หย่อนที่ตู้ Drop Bag สแกน QR สะสมแต้ม แลกเป็นเงินจริงผ่านพร้อมเพย์ — รับซื้อของเก่าถึงชุมชน ลดขยะ สร้างรายได้ทั่วไทย";

/** นิติบุคคลผู้ให้บริการ (ใช้ใน JSON-LD ให้ตรงกับหน้า /terms · /privacy) */
export const LEGAL_NAME = "ห้างหุ้นส่วนจำกัด พุงกลม แคทเทอริ่ง";
export const LEGAL_NAME_EN = "PHOONGKLOM CATERING LIMITED PARTNERSHIP";
export const SUPPORT_EMAIL = "support@thung-kheow.com";
export const SUPPORT_TEL = "+66892616445"; // 089-261-6445 (ตรงกับหน้า /terms · /privacy)

/**
 * LINE Official Account — ID ที่ผู้ใช้ค้นหา/แอดเป็นเพื่อนได้จริง
 * ⚠️ เป็น ID ที่ LINE แจกอัตโนมัติ ถ้าวันหลังซื้อ Premium ID (เช่น @thungkhiao) ให้แก้ที่นี่ที่เดียว
 */
export const LINE_OA_ID = "@200iyzrg";
export const LINE_OA_ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
