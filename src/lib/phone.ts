import { normalizeThaiPhone } from "./smsok";

/**
 * สร้าง PostgREST .or() filter หา profiles.phone ทั้ง 2 รูปแบบ (66xxxxxxxxx และ 0xxxxxxxxx)
 * จากเบอร์ที่ validate แล้ว "ในตัว helper" — กันไม่ให้ใครต่อ filter จากสตริงดิบที่ยังไม่ตรวจ
 * (PostgREST filter ต่อด้วย string interpolation ถ้าค่าไม่ถูก sanitize อาจ inject เงื่อนไขได้)
 *
 * โยน error ถ้าเบอร์ผิดรูป — ผู้เรียกทุกที่ validate + ตอบ 400 ให้ผู้ใช้ก่อนถึงจุดนี้อยู่แล้ว
 * (throw = safety net กัน bug ไม่ให้ยิง filter จากค่าที่ไม่ผ่านตรวจ)
 */
export function phoneOrFilter(phone: string): string {
  const p = normalizeThaiPhone(phone);
  if (!/^0\d{8,9}$/.test(p)) throw new Error("phoneOrFilter: invalid phone");
  return `phone.eq.66${p.slice(1)},phone.eq.${p}`;
}
