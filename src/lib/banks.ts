/**
 * รายชื่อธนาคารในประเทศไทย (สำหรับ dropdown บัญชีรับเงินโอน)
 * — ย้ายไปอยู่ที่ @platform/core แล้ว
 *
 * โค้ดจริงอยู่ที่ micro-services/packages/core/src/banks.ts
 * สำเนาที่ใช้ build อยู่ที่ src/lib/_core/banks.ts (ไฟล์ generate — ห้ามแก้)
 *
 * core เก็บทั้งชื่อเต็ม (รูปแบบที่ repo นี้เก็บใน DB) และชื่อสั้น (รูปแบบของ chao-dee)
 * พร้อม key ถาวรไว้ join กัน → ใช้รายชื่อชุดเดียวกันได้โดยไม่ต้อง migrate ข้อมูลเก่า
 *
 * ที่นี่ส่งออกเฉพาะชื่อเต็มในชื่อเดิม THAI_BANKS — string ทั้ง 19 ตัวเหมือนเดิมทุกไบต์
 * ⚠️ ลำดับใน dropdown เปลี่ยน (core เรียงตามลำดับของ chao-dee) แต่ค่าที่เก็บไว้แล้วยังตรงทุกตัว
 *
 * ถ้าต้องการชื่อสั้นหรือ findBank() ให้ import จาก "./_core/banks" ตรง ๆ
 */
export { BANK_FULL_NAMES as THAI_BANKS } from "./_core/banks";
