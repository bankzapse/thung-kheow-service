import { fileURLToPath } from "node:url";

/**
 * ฟอนต์เดียวกับหน้าเว็บ — layout.tsx โหลด IBM Plex Sans Thai ผ่าน
 * next/font/google และ tailwind.config.ts ตั้งเป็น font-sans ให้ทั้งแอป
 *
 * ทำไมต้อง commit ไฟล์ .ttf ลง repo:
 * ตัว SVG ระบุ font-family ได้ก็จริง แต่ตัวเรนเดอร์ต้อง "หาไฟล์ฟอนต์เจอ" ด้วย
 * IBM Plex Sans Thai ไม่ใช่ฟอนต์ที่ macOS มีมาให้ ถ้าไม่ป้อนไฟล์ให้ตรง ๆ
 * มันจะเงียบ ๆ ตกไปใช้ Thonburi (หัวตัวอักษรกลมกว่า ตัวกว้างกว่า) — รูปที่ได้
 * เลยคนละหน้ากับเว็บทั้งที่โค้ดเขียนชื่อฟอนต์ถูกแล้ว
 *
 * ⚠️ ต้องใช้กับ @resvg/resvg-js เท่านั้น ไม่ใช่ sharp — sharp เรียก librsvg
 *    ซึ่งบน macOS หาฟอนต์ผ่าน CoreText (เห็นเฉพาะฟอนต์ที่ติดตั้งในเครื่อง)
 *    ตั้ง FONTCONFIG_FILE ก็ไม่มีผล · resvg รับ fontFiles ได้และ shape
 *    ภาษาไทยถูกต้อง (วรรณยุกต์/สระบน-ล่างวางตรงตำแหน่ง เพราะใช้ rustybuzz)
 *
 * ไฟล์ฟอนต์: Google Fonts (SIL Open Font License 1.1 — แจกจ่ายซ้ำได้)
 */
export const FONT_FAMILY = "IBM Plex Sans Thai";

const f = (name) => fileURLToPath(new URL(`../fonts/${name}`, import.meta.url));

export const FONT_FILES = [
  f("IBMPlexSansThai-Regular.ttf"),
  f("IBMPlexSansThai-SemiBold.ttf"),
  f("IBMPlexSansThai-Bold.ttf"),
];
