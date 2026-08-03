/**
 * ตัวกรอง path ปลอดภัยสำหรับ redirect ภายในแอป (liff.state / ?next=)
 * แยกไฟล์นี้ให้ "ไม่มี dependency" (ไม่พึ่ง clsx/tailwind-merge) → middleware import ได้
 * โดยไม่ลากของหนักติด bundle · เป็นแหล่งความจริงเดียว (เดิม middleware เขียนซ้ำ ตรรกะอ่อนกว่า)
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//") || s.startsWith("/\\")) return null; // 🔒 กัน open redirect เป็นโดเมนนอก
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(s)) return null; // control char (เลี่ยง bypass ด้วย \t \n)
  if (s === "/app" || /^\/(login|register|forgot-password|auth)(\/|\?|$)/.test(s)) return null;
  return s;
}
