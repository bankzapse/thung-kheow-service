export type Role = "seller" | "buyer" | "admin" | "franchise";

export type JobStatus =
  | "submitted" // ส่งงาน — ผู้ขายสร้าง รอผู้ซื้อรับ
  | "confirmed" // คอนเฟิร์มงาน — ผู้ซื้อรับงานแล้ว
  | "en_route" // กำลังไปรับ
  | "completed" // งานสำเร็จ
  | "cancelled"; // ยกเลิกงาน

export interface Material {
  id: string;
  name: string;
  unit: string; // กก. / ใบ / อัน
  pricePerUnit: number;
  emoji: string;
  category: string;
}

export interface JobItem {
  materialId: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  qty: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface StatusEvent {
  status: JobStatus;
  at: string;
  note?: string;
}

export interface Job {
  id: string;
  code: string; // RF-XXXX
  sellerId: string;
  sellerName: string;
  buyerId?: string;
  buyerName?: string;
  items: JobItem[];
  estimatedTotal: number;
  location: GeoLocation;
  houseNo: string;
  landmark: string;
  contactName: string;
  contactPhone: string;
  scheduledDate: string; // YYYY-MM-DD (จองเป็น "วัน" ไม่ระบุเวลา)
  note?: string;
  status: JobStatus;
  history: StatusEvent[];
  finalAmount?: number;
  createdAt: string;
}

export interface ScheduleSlot {
  id: string;
  buyerId: string;
  buyerName: string;
  date: string; // YYYY-MM-DD (รอบเข้ารับทั้งวัน)
  area: string; // โซน/ตำบล
  capacity: number;
  booked: number;
}

export interface RewardTicket {
  id: string;
  number: string; // 6 หลัก
  userId: string;
  month: string; // YYYY-MM
  fromJobId?: string;
}

export interface RewardDraw {
  month: string; // YYYY-MM
  prizeName: string;
  prizeValue: number;
  winningNumber: string;
  winnerName?: string;
  announcedAt?: string;
  status: "pending" | "announced";
}

export type PayoutStatus = "none" | "pending" | "approved" | "rejected";
export interface PayoutAccount {
  bankName: string; // ธนาคาร
  accountNo: string; // เลขบัญชี
  accountName: string; // ชื่อบัญชี
  bookBankImage?: string; // สำเนาหน้า book bank (data URL — เดโม)
  status: PayoutStatus;
  note?: string; // เหตุผลเมื่อถูกปฏิเสธ
  submittedAt?: string;
  reviewedAt?: string;
}

export interface User {
  id: string;
  role: Role; // บทบาทที่ใช้งานอยู่ตอนนี้ (active role)
  roles?: Role[]; // บทบาททั้งหมดที่บัญชีนี้ถือได้ (multi-role) — ไม่ระบุ = [role]
  name: string;
  phone: string;
  username?: string; // ชื่อผู้ใช้สำหรับพอร์ทัลหลังบ้าน (บริษัท/แฟรนไชส์/ศูนย์คัดแยก) — ดู lib/username.ts
  email?: string;
  password?: string; // โหมดเดโม (localStorage) เท่านั้น — Supabase ใช้ auth ของตัวเอง
  payout?: PayoutAccount; // บัญชีรับเงินโอน (ต้องบริษัทอนุมัติก่อนทำธุรกรรม)
  owner?: boolean; // เจ้าของระบบ (super admin) — มีสิทธิ์ทุกเมนู + จัดการผู้ดูแล
  permissions?: string[]; // สิทธิ์เข้าถึงเมนู (สำหรับผู้ดูแลที่บริษัทเพิ่ม) — owner ไม่ต้องมี
  lineUserId?: string;
  lineConnected: boolean;
  baseLat?: number; // ตำแหน่งฐานคนขับ (ใช้คำนวณรัศมี 30 กม.)
  baseLng?: number;
  address?: string; // ที่อยู่ / จุดสังเกต (ศูนย์คัดแยก)
  province?: string; // จังหวัด (ศูนย์คัดแยก)
  district?: string; // อำเภอ/เขต (ศูนย์คัดแยก)
  subdistrict?: string; // ตำบล/แขวง (ศูนย์คัดแยก)
  status?: "active" | "suspended"; // สถานะบัญชี (แอดมินจัดการ) — ไม่ระบุ = active
  credit?: number; // เครดิตของผู้รับซื้อ (พาร์ทเนอร์) — ต้อง ≥ 300 ถึงรับงานได้
  partner?: boolean; // เป็นพาร์ทเนอร์กับโรงงานแล้ว (ได้อัตราเลท)
  points?: number; // คะแนนสะสม Drop & Go (คนทิ้ง) — แลกเป็นเงินได้
  franchiseId?: string; // สำหรับ role 'franchise' — แฟรนไชส์ที่เป็นเจ้าของ
  createdAt: string;
}

export const STATUS_META: Record<
  JobStatus,
  { label: string; color: string; dot: string; step: number }
> = {
  submitted: { label: "ส่งงาน", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500", step: 1 },
  confirmed: { label: "คอนเฟิร์มแล้ว", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", step: 2 },
  en_route: { label: "กำลังไปรับ", color: "bg-violet-100 text-violet-700", dot: "bg-violet-500", step: 3 },
  completed: { label: "สำเร็จ", color: "bg-brand-100 text-brand-700", dot: "bg-brand-600", step: 4 },
  cancelled: { label: "ยกเลิก", color: "bg-neutral-200 text-neutral-500", dot: "bg-neutral-400", step: 0 },
};

export interface BillItem {
  materialId: string;
  name: string;
  unit: string;
  qty: number; // น้ำหนัก/จำนวน
  pricePerUnit: number;
  subtotal: number;
}

export interface Bill {
  id: string;
  code: string; // B-XXXX
  buyerId: string; // ร้านที่ออกบิล
  source: "app_job" | "walk_in";
  jobId?: string;
  sellerName: string;
  sellerPhone: string;
  date: string; // ISO
  items: BillItem[];
  goodsTotal: number; // ยอดรับซื้อ
  fee: number; // ค่าบริการ
  netPaid: number; // จ่ายผู้ขายสุทธิ
  paymentMethod: "cash" | "transfer" | "promptpay";
  status: "paid" | "void";
  createdAt: string;
}

export interface Expense {
  id: string;
  buyerId: string;
  category: string; // น้ำมัน / ค่าแรง / ค่าเช่า / อื่นๆ
  amount: number;
  date: string; // ISO
  note?: string;
  createdAt: string;
}

export interface WalletTxn {
  id: string;
  buyerId: string;
  type: "topup" | "commission" | "adjust"; // เติมเงิน / หักค่าคอม / ปรับโดยแอดมิน
  amount: number; // + เข้า, − ออก
  balanceAfter: number;
  note?: string;
  jobId?: string;
  date: string; // ISO
}

/* ================= Drop & Go (ตู้รับซื้อ + ถุงตาข่าย + คะแนน) ================= */

/** คะแนน = มูลค่า(บาท) × 1 → 1 คะแนน = ฿1 */
export const POINTS_PER_BAHT = 1;
export const COUNTRY_CODE = "TH";
export const MIN_ITEMS_PER_BAG = 20; // รับขั้นต่ำ 20 ชิ้น/ถุง
export const MAX_BAGS_PER_DROP = 10;

/**
 * QR บนถุง = "GLN-AA-0000001" → อักษรย่อแฟรนไชส์ (GLN) - รหัสตู้ (AA) - รหัสถุง (0000001)
 * สแกนครั้งเดียวได้ทั้งแฟรนไชส์ ตู้ และถุง (ลดขั้นตอน)
 */
// QR ถุง = "<รหัสตู้>-<ถุง>" เช่น TK01-0000001 (รหัสตู้ TK รันทั้งระบบ ไม่ต้องมีอักษรย่อแฟรนไชส์)
export function bagQr(_franchiseCode: string, cabinetCode: string, bagCode: string): string {
  return `${(cabinetCode || "").toUpperCase()}-${bagCode}`;
}
/** แสดงรหัสตู้แบบมีขีด เช่น TK01 → TK-01 (ตัวโค้ดจริงไม่มีขีด เพื่อไม่ให้ QR แตก) */
export function displayCabinetCode(code: string): string {
  const m = /^(TK)0*(\d+)$/i.exec(code || "");
  return m ? `${m[1].toUpperCase()}-${m[2].padStart(2, "0")}` : (code || "").toUpperCase();
}
/** รหัสตู้แบบแสดงผล = TK-01 (ตัดอักษรย่อแฟรนไชส์ออก) */
export function cabinetFullCode(_franchiseCode: string, cabinetCode: string): string {
  return displayCabinetCode(cabinetCode);
}
/** แยกแฟรนไชส์/ตู้/ถุงจาก QR — รองรับ GLN-AA-0000001, AA1-0000001, และของเดิม #TH-AA-0000001 */
export function parseBagQr(raw: string): { franchise: string; cabinet: string; bag: string } {
  const parts = raw.trim().replace(/^#/, "").split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { franchise: parts[0].toUpperCase(), cabinet: parts[1].toUpperCase(), bag: parts[parts.length - 1].replace(/[^0-9]/g, "") };
  }
  if (parts.length === 2) {
    return { franchise: "", cabinet: parts[0].toUpperCase(), bag: parts[1].replace(/[^0-9]/g, "") };
  }
  return { franchise: "", cabinet: "", bag: (parts[0] || "").replace(/[^0-9]/g, "") };
}

/** ตัวเลือกแลกเงิน (คะแนน → บาท) — 1 คะแนน = ฿1 */
export const REDEEM_TIERS: { amountBaht: number; points: number }[] = [
  { amountBaht: 50, points: 50 },
  { amountBaht: 100, points: 100 },
  { amountBaht: 300, points: 300 },
  { amountBaht: 500, points: 500 },
];

/** ภารกิจ (รางวัลได้แน่นอน) — บริษัทกำหนดกิจกรรม + แต้มได้เอง
 *  metric = ตัววัดความคืบหน้าจากถุงจริง: จำนวนถุง / จำนวนประเภทวัสดุ / น้ำหนักรวม (กก.) */
export type MissionMetric = "bags" | "categories" | "weight";
export interface Mission {
  key: string;
  label: string; // ชื่อภารกิจ
  desc: string; // คำอธิบาย
  target: number; // เกณฑ์ที่ต้องทำให้ถึง
  reward: number; // แต้มโบนัสที่ได้เมื่อทำครบ
  metric: MissionMetric;
  unit: string; // หน่วยแสดงผล (ถุง/ประเภท/กก.)
}

export interface Franchise {
  id: string;
  code: string; // อักษรย่อ เช่น "GLN"
  name: string; // ชื่อแฟรนไชส์
  ownerName: string;
  phone: string;
  createdAt: string;
}

/** บันทึกการที่บริษัทโอนส่วนแบ่งให้แฟรนไชส์ */
export interface FranchisePayout {
  id: string;
  franchiseId: string;
  franchiseName: string;
  amount: number;
  note?: string;
  paidAt: string;
}

export interface Cabinet {
  id: string;
  code: string; // รหัสตู้ในแฟรนไชส์ เช่น "AA"
  franchiseId: string;
  franchiseCode: string; // อักษรย่อแฟรนไชส์ เช่น "GLN"
  name: string; // ชื่อจุดตั้ง เช่น "Lotus's ลาดพร้าว"
  location: GeoLocation;
  province?: string; // จังหวัด
  district?: string; // อำเภอ/เขต
  subdistrict?: string; // ตำบล/แขวง
  status: "active" | "full" | "maintenance";
  createdAt: string;
}

export type BagStatus =
  | "dropped" // หย่อนแล้ว รอคัดแยก
  | "sorting" // กำลังคัดแยกที่โรงงาน
  | "credited"; // ตีราคา + ให้คะแนนแล้ว

export const BAG_STATUS_META: Record<BagStatus, { label: string; color: string; dot: string; step: number }> = {
  dropped: { label: "รอคัดแยก", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500", step: 1 },
  sorting: { label: "กำลังคัดแยก", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", step: 2 },
  credited: { label: "ได้คะแนนแล้ว", color: "bg-brand-100 text-brand-700", dot: "bg-brand-600", step: 3 },
};

export interface BagItem {
  materialId: string;
  name: string;
  qty: number; // น้ำหนัก (กก.)
  pricePerUnit: number;
  subtotal: number;
}

/** รายการวัสดุในการขายให้โรงงานของเก่า (ต่อ 1 การขาย) */
export interface FactorySaleItem {
  materialId: string;
  name: string;
  qtyKg: number; // น้ำหนักที่ขาย (กก.)
  factoryPrice: number; // ราคาขายโรงงาน/กก.
  sellerPrice: number; // ราคาที่จ่ายผู้ขาย/กก. (ต้นทุน = ราคากลาง)
  revenue: number; // = qtyKg × factoryPrice
  cost: number; // = qtyKg × sellerPrice
  profit: number; // = revenue − cost
}

/** บันทึกการขายวัสดุคัดแยกให้โรงงานของเก่า → ส่วนต่างเป็นกำไรบริษัท (ชั้นที่ 3) */
export interface FactorySale {
  id: string;
  soldBy: string; // userId ศูนย์คัดแยกที่บันทึก
  soldByName: string;
  factoryName?: string; // ชื่อโรงงานของเก่า (ไม่บังคับ)
  note?: string;
  items: FactorySaleItem[];
  revenue: number; // รายได้รวมจากโรงงาน
  cost: number; // ต้นทุนรวม (จ่ายผู้ขาย)
  profit: number; // กำไรรวม = revenue − cost
  soldAt: string;
}

export interface MeshBag {
  id: string;
  code: string; // รหัสถุง 7 หลัก เช่น "0000001"
  qr: string; // "#TH-AA-0000001"
  cabinetId: string;
  cabinetCode: string;
  userId: string; // คนทิ้ง
  userName: string;
  status: BagStatus;
  items?: BagItem[]; // ผู้ดูแลกรอกตอนคัดแยก
  valueBaht?: number; // มูลค่าที่ผู้ดูแลตีราคา
  points?: number; // = valueBaht × 1 (1 คะแนน = ฿1)
  note?: string;
  droppedAt: string;
  creditedAt?: string;
}

export type PointTxnType = "earn" | "redeem" | "adjust";
export interface PointTxn {
  id: string;
  userId: string;
  type: PointTxnType; // ได้จากถุง / แลกเงิน / ปรับ
  points: number; // + ได้, − ใช้
  balanceAfter: number;
  note?: string;
  bagId?: string;
  redemptionId?: string;
  date: string; // ISO
}

export type RedemptionStatus = "pending" | "paid" | "rejected";
export interface Redemption {
  id: string;
  code: string; // R-XXXX
  userId: string;
  userName: string;
  amountBaht: number;
  points: number; // คะแนนที่ใช้
  method: "promptpay" | "bank";
  account: string; // เบอร์พร้อมเพย์/เลขบัญชี
  status: RedemptionStatus;
  requestedAt: string;
  paidAt?: string;
}
