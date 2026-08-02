/* ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ไฟล์นี้ถูก generate อัตโนมัติ — ห้ามแก้ที่นี่ (แก้แล้วจะถูกทับรอบ sync ถัดไป)
 *
 * ต้นทาง : micro-services/packages/core/src/banks.ts
 * วิธีแก้ : แก้ที่ต้นทาง → รัน `npm test` แล้ว `npm run sync` ใน repo micro-services
 *          → commit ไฟล์ที่เปลี่ยนใน repo นี้ด้วย
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * รายชื่อธนาคารไทย — ชุดเดียว แต่คงรูปแบบชื่อของทั้งสองแอปไว้
 *
 * ── ทำไมไม่บังคับให้ใช้รูปแบบเดียว ────────────────────────────────────────
 * string ชื่อธนาคาร "ถูกเก็บลง DB ไปแล้ว" ทั้งสองแอป คนละรูปแบบ
 *   ChaoDee            เก็บแบบสั้น  : "กสิกรไทย"
 *   thung-kheow-service เก็บแบบเต็ม : "ธนาคารกสิกรไทย (KBank)"
 * บังคับรูปแบบเดียว = ต้องเขียน migration แปลงข้อมูลเก่าของอีกฝั่ง
 *
 * ไฟล์นี้เลยเก็บทั้งสองรูปแบบ + `key` ถาวรไว้ join กัน
 *   → แต่ละแอปดึงรูปแบบที่ตัวเองใช้อยู่ไปแสดง (adopt ได้โดยข้อมูลเก่าไม่พัง)
 *   → เมื่อไหร่อยากรวมรูปแบบจริง ค่อยใช้ key เขียน migration ทีเดียวจบ
 *
 * ⚠️ `key` เป็นคีย์ถาวร — ห้ามเปลี่ยนค่าที่มีอยู่ เพิ่มใหม่ได้อย่างเดียว
 */

export interface ThaiBank {
  /** คีย์ถาวรสำหรับ join ข้ามแอป (ห้ามเปลี่ยน) */
  key: string;
  /** รูปแบบสั้น — ตรงกับที่ ChaoDee เก็บใน DB วันนี้ */
  short: string;
  /** รูปแบบเต็ม — ตรงกับที่ thung-kheow-service เก็บใน DB วันนี้ */
  full: string;
}

/** เรียงตามลำดับที่ ChaoDee ใช้อยู่ (ถุงเขียวเรียงต่างกัน — adopt แล้วลำดับ dropdown จะเปลี่ยน) */
export const THAI_BANKS: readonly ThaiBank[] = [
  { key: "kbank", short: "กสิกรไทย", full: "ธนาคารกสิกรไทย (KBank)" },
  { key: "scb", short: "ไทยพาณิชย์", full: "ธนาคารไทยพาณิชย์ (SCB)" },
  { key: "bbl", short: "กรุงเทพ", full: "ธนาคารกรุงเทพ (BBL)" },
  { key: "ktb", short: "กรุงไทย", full: "ธนาคารกรุงไทย (KTB)" },
  { key: "bay", short: "กรุงศรีอยุธยา", full: "ธนาคารกรุงศรีอยุธยา (Krungsri)" },
  { key: "ttb", short: "ทหารไทยธนชาต (ttb)", full: "ธนาคารทหารไทยธนชาต (ttb)" },
  { key: "gsb", short: "ออมสิน", full: "ธนาคารออมสิน (GSB)" },
  { key: "baac", short: "ธ.ก.ส.", full: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)" },
  { key: "ghb", short: "อาคารสงเคราะห์ (ธอส.)", full: "ธนาคารอาคารสงเคราะห์ (ธอส.)" },
  { key: "kkp", short: "เกียรตินาคินภัทร", full: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { key: "cimbt", short: "ซีไอเอ็มบี ไทย", full: "ธนาคารซีไอเอ็มบี ไทย (CIMB)" },
  { key: "uobt", short: "ยูโอบี", full: "ธนาคารยูโอบี (UOB)" },
  { key: "tisco", short: "ทิสโก้", full: "ธนาคารทิสโก้ (TISCO)" },
  { key: "lhfg", short: "แลนด์ แอนด์ เฮ้าส์", full: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)" },
  { key: "tcd", short: "ไทยเครดิต", full: "ธนาคารไทยเครดิต (Thai Credit)" },
  { key: "icbct", short: "ไอซีบีซี (ไทย)", full: "ธนาคารไอซีบีซี (ไทย) (ICBC)" },
  { key: "hsbc", short: "เอชเอสบีซี (HSBC)", full: "ธนาคารเอชเอสบีซี (HSBC)" },
  { key: "scbt", short: "สแตนดาร์ดชาร์เตอร์ด (ไทย)", full: "ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)" },
  { key: "isbt", short: "ธนาคารอิสลามแห่งประเทศไทย", full: "ธนาคารอิสลามแห่งประเทศไทย (iBank)" },
];

/** ชื่อแบบสั้น — ใส่แทน THAI_BANKS เดิมของ ChaoDee ได้ตรง ๆ (ค่าเท่ากันทุกตัว) */
export const BANK_SHORT_NAMES: readonly string[] = THAI_BANKS.map((b) => b.short);

/** ชื่อแบบเต็ม — ตรงกับที่ thung-kheow-service ใช้ (ต่างแค่ลำดับ) */
export const BANK_FULL_NAMES: readonly string[] = THAI_BANKS.map((b) => b.full);

/** หาแบงก์จากชื่อรูปแบบไหนก็ได้ (key / สั้น / เต็ม) — ใช้ reconcile ค่าที่เก็บไว้คนละแอป */
export function findBank(name: string): ThaiBank | null {
  const n = name.trim();
  if (!n) return null;
  return (
    THAI_BANKS.find((b) => b.key === n || b.short === n || b.full === n) ?? null
  );
}
