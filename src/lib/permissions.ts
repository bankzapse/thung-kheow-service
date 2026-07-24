import type { User } from "./types";

/** เมนูฝั่งบริษัทที่กำหนดสิทธิ์เข้าถึงได้ (owner เข้าได้ทุกเมนูเสมอ) */
export const ADMIN_MENUS: { key: string; label: string }[] = [
  { key: "summary", label: "สรุปการเงิน" },
  { key: "dropgo", label: "Drop Bag (ภาพรวม)" },
  { key: "missions", label: "จัดการภารกิจ" },
  { key: "franchises", label: "แฟรนไชส์" },
  { key: "centers", label: "ศูนย์คัดแยก" },
  { key: "sellers", label: "จัดการผู้ขาย" },
  { key: "scrap", label: "ราคาของเก่า" },
  { key: "factory", label: "กำไรโรงงาน" },
  { key: "collect", label: "เก็บของ" },
  { key: "payouts", label: "อนุมัติบัญชี" },
  { key: "payments", label: "โอนเงิน" },
  { key: "transfers", label: "ประวัติโอน" },
];

export const ADMIN_MENU_KEYS = ADMIN_MENUS.map((m) => m.key);

/** ผู้ใช้เข้าถึงเมนูฝั่งบริษัทนี้ได้ไหม (owner = ทุกเมนู) */
export function canAccessAdminMenu(user: User | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.owner) return true;
  return (user.permissions ?? []).includes(key);
}
