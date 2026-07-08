import type { Material } from "./types";

/**
 * วัสดุที่ระบบรับซื้อ/เก็บ (6 อย่าง) + ราคากลางโดยประมาณ (บาท/กก.)
 * ราคาอ้างอิงตลาดของเก่าไทย — แอดมิน/ผู้ดูแลปรับได้จริงใน production
 */
export const MATERIALS: Material[] = [
  { id: "aluminum-can", name: "กระป๋องอลูมิเนียม", unit: "กก.", pricePerUnit: 45, emoji: "🥫", category: "โลหะ" },
  { id: "pet", name: "ขวดน้ำ/ขวดอัดลม (PET)", unit: "กก.", pricePerUnit: 10, emoji: "🧴", category: "พลาสติก" },
  { id: "hdpe", name: "ขวดขาวขุ่น (HDPE)", unit: "กก.", pricePerUnit: 13, emoji: "🥛", category: "พลาสติก" },
  { id: "pp5", name: "พลาสติก PP5", unit: "กก.", pricePerUnit: 7, emoji: "🧺", category: "พลาสติก" },
  { id: "glass-bottle", name: "ขวดแก้ว", unit: "กก.", pricePerUnit: 2, emoji: "🍶", category: "แก้ว" },
  { id: "cardboard", name: "กระดาษลัง", unit: "กก.", pricePerUnit: 4, emoji: "📦", category: "กระดาษ" },
];

export const MATERIAL_MAP: Record<string, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
);

export const CATEGORIES = ["โลหะ", "พลาสติก", "แก้ว", "กระดาษ"] as const;
