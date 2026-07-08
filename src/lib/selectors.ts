import type { DB } from "./seed";
import type { Bill, Expense, Job, User, WalletTxn, MeshBag, Cabinet, PointTxn, Redemption } from "./types";
import { currentMonth } from "./utils";
import { distanceKm } from "./geo";
import { MATERIAL_MAP } from "./materials";
import { PLATFORM_RATE } from "./fees";

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export function jobsForSeller(db: DB, sellerId: string): Job[] {
  return db.jobs
    .filter((j) => j.sellerId === sellerId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** งานที่จองมาให้ผู้ซื้อคนนี้ + งานที่รับไว้แล้ว */
export function jobsForBuyer(db: DB, buyerId: string): Job[] {
  return db.jobs
    .filter((j) => j.buyerId === buyerId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** งานเปิด (ยังไม่มีผู้ซื้อ) ให้คนขับหยิบเองได้ */
export function availableJobs(db: DB): Job[] {
  return db.jobs
    .filter((j) => j.status === "submitted" && !j.buyerId)
    .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate));
}

export function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status === "submitted" || j.status === "confirmed" || j.status === "en_route");
}
export function doneJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status === "completed" || j.status === "cancelled");
}

export function slotsForBuyer(db: DB, buyerId: string) {
  return db.slots
    .filter((s) => s.buyerId === buyerId && s.date >= todayYMD())
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** รอบที่ยังว่าง (เหลือ capacity) สำหรับผู้ขายจอง */
export function openSlots(db: DB) {
  return db.slots
    .filter((s) => s.date >= todayYMD() && s.booked < s.capacity)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface JobWithDistance extends Job {
  distanceKm: number;
}

/** งานเปิดในรัศมี (กม.) จากตำแหน่งคนขับ เรียงจากใกล้สุด */
export function availableJobsNear(db: DB, lat: number, lng: number, radiusKm: number): JobWithDistance[] {
  return db.jobs
    .filter((j) => j.status === "submitted" && !j.buyerId)
    .map((j) => ({ ...j, distanceKm: distanceKm(lat, lng, j.location.lat, j.location.lng) }))
    .filter((j) => j.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** ราคากลาง (แอดมินตั้ง หรือค่า default) */
export function centralPrice(db: DB, materialId: string): number {
  return db.centralPrices?.[materialId] ?? MATERIAL_MAP[materialId]?.pricePerUnit ?? 0;
}

/** ราคารับซื้อของคนขับ (ราคาที่ตั้งเอง หรือราคากลาง) */
export function buyerPrice(db: DB, buyerId: string, materialId: string): number {
  return db.buyerPrices?.[buyerId]?.[materialId] ?? centralPrice(db, materialId);
}

/** มูลค่างานคำนวณตามราคารับซื้อของคนขับ */
export function jobValueForBuyer(db: DB, buyerId: string, job: Job): number {
  return job.items.reduce((s, it) => s + buyerPrice(db, buyerId, it.materialId) * it.qty, 0);
}

export function ticketsForUser(db: DB, userId: string, month = currentMonth()) {
  return db.tickets.filter((t) => t.userId === userId && t.month === month);
}

export interface IncomeSummary {
  thisMonth: number;
  total: number;
  completedCount: number;
  byMonth: { month: string; amount: number }[];
}

export function incomeSummary(db: DB, sellerId: string): IncomeSummary {
  const completed = db.jobs.filter(
    (j) => j.sellerId === sellerId && j.status === "completed" && j.finalAmount,
  );
  const month = currentMonth();
  const byMonthMap = new Map<string, number>();
  let total = 0;
  let thisMonth = 0;
  for (const j of completed) {
    const amt = j.finalAmount || 0;
    total += amt;
    const m = (j.history.find((h) => h.status === "completed")?.at || j.createdAt).slice(0, 7);
    byMonthMap.set(m, (byMonthMap.get(m) || 0) + amt);
    if (m === month) thisMonth += amt;
  }
  return {
    thisMonth,
    total,
    completedCount: completed.length,
    byMonth: [...byMonthMap.entries()]
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => b.month.localeCompare(a.month)),
  };
}

export function announcedDraw(db: DB) {
  return db.draws
    .filter((d) => d.status === "announced")
    .sort((a, b) => b.month.localeCompare(a.month))[0];
}
export function currentDraw(db: DB) {
  return db.draws.find((d) => d.month === currentMonth());
}

/* ---------------- Shop back-office ---------------- */
export function billsForBuyer(db: DB, buyerId: string): Bill[] {
  return db.bills
    .filter((b) => b.buyerId === buyerId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function expensesForBuyer(db: DB, buyerId: string): Expense[] {
  return db.expenses
    .filter((e) => e.buyerId === buyerId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

function sameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export interface ShopSummary {
  goodsTotal: number; // ยอดรับซื้อรวม
  netPaid: number; // จ่ายผู้ขายรวม
  fee: number; // ค่าบริการ/รายได้ร้าน
  billCount: number;
  todayGoods: number;
  todayBills: number;
  byDay: { label: string; amount: number }[]; // 7 วันล่าสุด
}

export function shopSummary(db: DB, buyerId: string): ShopSummary {
  const bills = db.bills.filter((b) => b.buyerId === buyerId && b.status === "paid");
  const now = new Date();
  let goodsTotal = 0;
  let netPaid = 0;
  let fee = 0;
  let todayGoods = 0;
  let todayBills = 0;
  for (const b of bills) {
    goodsTotal += b.goodsTotal;
    netPaid += b.netPaid;
    fee += b.fee;
    if (sameDay(b.date, now)) {
      todayGoods += b.goodsTotal;
      todayBills += 1;
    }
  }
  const byDay: { label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const amount = bills.filter((b) => sameDay(b.date, day)).reduce((s, b) => s + b.goodsTotal, 0);
    byDay.push({ label: new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(day), amount });
  }
  return { goodsTotal, netPaid, fee, billCount: bills.length, todayGoods, todayBills, byDay };
}

export function expenseTotal(db: DB, buyerId: string, month?: string): number {
  return db.expenses
    .filter((e) => e.buyerId === buyerId && (!month || e.date.slice(0, 7) === month))
    .reduce((s, e) => s + e.amount, 0);
}

/** งานในแอปที่พร้อมออกบิล (คอนเฟิร์ม/กำลังไปรับ ของคนขับคนนี้) */
export function billableJobs(db: DB, buyerId: string): Job[] {
  return db.jobs
    .filter((j) => j.buyerId === buyerId && (j.status === "confirmed" || j.status === "en_route"))
    .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate));
}

/* ---------------- Admin / platform ---------------- */
export interface PlatformSummary {
  gmv: number; // มูลค่ารวมที่ซื้อขายผ่านระบบ
  commission: number; // ค่าคอมแพลตฟอร์ม
  billCount: number;
  buyerCount: number;
  sellerCount: number;
  byBuyer: { buyerId: string; name: string; gmv: number; bills: number }[];
  byMonth: { month: string; gmv: number }[];
}

export function platformSummary(db: DB): PlatformSummary {
  const paid = db.bills.filter((b) => b.status === "paid");
  const nameOf = (id: string) => db.users.find((u) => u.id === id)?.name || id;
  let gmv = 0;
  const buyerMap = new Map<string, { gmv: number; bills: number }>();
  const monthMap = new Map<string, number>();
  for (const b of paid) {
    gmv += b.goodsTotal;
    const cur = buyerMap.get(b.buyerId) || { gmv: 0, bills: 0 };
    cur.gmv += b.goodsTotal;
    cur.bills += 1;
    buyerMap.set(b.buyerId, cur);
    const m = b.date.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + b.goodsTotal);
  }
  // completed jobs ที่ยังไม่มีบิล (เช่น seed เดิม) — นับรวมเพื่อให้ตัวเลขสอดคล้องกับรายได้ผู้ขาย
  const billedJobIds = new Set(paid.map((b) => b.jobId).filter(Boolean));
  for (const j of db.jobs) {
    if (j.status !== "completed" || !j.finalAmount || !j.buyerId || billedJobIds.has(j.id)) continue;
    const amt = j.finalAmount;
    gmv += amt;
    const cur = buyerMap.get(j.buyerId) || { gmv: 0, bills: 0 };
    cur.gmv += amt;
    buyerMap.set(j.buyerId, cur);
    const m = (j.history.find((h) => h.status === "completed")?.at || j.createdAt).slice(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + amt);
  }
  return {
    gmv,
    commission: Math.round(gmv * PLATFORM_RATE),
    billCount: paid.length,
    buyerCount: db.users.filter((u) => u.role === "buyer").length,
    sellerCount: db.users.filter((u) => u.role === "seller").length,
    byBuyer: [...buyerMap.entries()]
      .map(([buyerId, v]) => ({ buyerId, name: nameOf(buyerId), gmv: v.gmv, bills: v.bills }))
      .sort((a, b) => b.gmv - a.gmv),
    byMonth: [...monthMap.entries()].map(([month, g]) => ({ month, gmv: g })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export interface BuyerStat {
  user: User;
  gmv: number;
  bills: number;
}

export function buyersWithStats(db: DB): BuyerStat[] {
  const paid = db.bills.filter((b) => b.status === "paid");
  return db.users
    .filter((u) => u.role === "buyer")
    .map((u) => {
      const bs = paid.filter((b) => b.buyerId === u.id);
      return { user: u, gmv: bs.reduce((s, b) => s + b.goodsTotal, 0), bills: bs.length };
    })
    .sort((a, b) => b.gmv - a.gmv);
}

/** ผู้มีสิทธิ์ลุ้นรางวัลในเดือน + จำนวนสิทธิ์ */
export function ticketParticipants(db: DB, month: string) {
  const map = new Map<string, number>();
  db.tickets.filter((t) => t.month === month).forEach((t) => map.set(t.userId, (map.get(t.userId) || 0) + 1));
  const nameOf = (id: string) => db.users.find((u) => u.id === id)?.name || id;
  return [...map.entries()]
    .map(([userId, count]) => ({ userId, name: nameOf(userId), count }))
    .sort((a, b) => b.count - a.count);
}

/* ---------------- Credit / wallet (พาร์ทเนอร์) ---------------- */
export function creditOf(db: DB, userId: string): number {
  return db.users.find((u) => u.id === userId)?.credit ?? 0;
}
export function walletForBuyer(db: DB, buyerId: string): WalletTxn[] {
  return (db.wallet ?? []).filter((w) => w.buyerId === buyerId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
export function todayCommission(db: DB, buyerId: string): number {
  const now = new Date();
  return (db.wallet ?? [])
    .filter((w) => w.buyerId === buyerId && w.type === "commission" && sameDay(w.date, now))
    .reduce((s, w) => s + Math.abs(w.amount), 0);
}
export function commissionCollected(db: DB, month?: string): number {
  return (db.wallet ?? [])
    .filter((w) => w.type === "commission" && (!month || w.date.slice(0, 7) === month))
    .reduce((s, w) => s + Math.abs(w.amount), 0);
}

/* ---------------- Drop & Go: ตู้ / ถุง / คะแนน / แลกเงิน ---------------- */
export function pointsOf(db: DB, userId: string): number {
  return db.users.find((u) => u.id === userId)?.points ?? 0;
}
export function bagsForUser(db: DB, userId: string): MeshBag[] {
  return (db.bags ?? [])
    .filter((b) => b.userId === userId)
    .sort((a, b) => +new Date(b.droppedAt) - +new Date(a.droppedAt));
}
/** ถุงที่รอผู้ดูแลจัดการ (หย่อนแล้ว/กำลังคัดแยก) */
export function pendingBags(db: DB): MeshBag[] {
  return (db.bags ?? [])
    .filter((b) => b.status !== "credited")
    .sort((a, b) => +new Date(a.droppedAt) - +new Date(b.droppedAt));
}
export function bagsForCabinet(db: DB, cabinetId: string): MeshBag[] {
  return (db.bags ?? [])
    .filter((b) => b.cabinetId === cabinetId)
    .sort((a, b) => +new Date(b.droppedAt) - +new Date(a.droppedAt));
}
export interface CabinetWithCounts extends Cabinet {
  pending: number; // ถุงที่ยังไม่ได้ให้คะแนน
  total: number;
}
export function cabinetsWithCounts(db: DB): CabinetWithCounts[] {
  return (db.cabinets ?? []).map((c) => {
    const bags = (db.bags ?? []).filter((b) => b.cabinetId === c.id);
    return { ...c, pending: bags.filter((b) => b.status !== "credited").length, total: bags.length };
  });
}
export function pointsLedger(db: DB, userId: string): PointTxn[] {
  return (db.pointTxns ?? [])
    .filter((t) => t.userId === userId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
export function redemptionsForUser(db: DB, userId: string): Redemption[] {
  return (db.redemptions ?? [])
    .filter((r) => r.userId === userId)
    .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
}
export function pendingRedemptions(db: DB): Redemption[] {
  return (db.redemptions ?? [])
    .filter((r) => r.status === "pending")
    .sort((a, b) => +new Date(a.requestedAt) - +new Date(b.requestedAt));
}
export interface DropStats {
  totalBags: number;
  creditedBags: number;
  pendingBags: number;
  pointsEarned: number; // รวมคะแนนที่เคยได้
}
export function dropStats(db: DB, userId: string): DropStats {
  const bags = (db.bags ?? []).filter((b) => b.userId === userId);
  const pointsEarned = (db.pointTxns ?? [])
    .filter((t) => t.userId === userId && t.type === "earn")
    .reduce((s, t) => s + t.points, 0);
  return {
    totalBags: bags.length,
    creditedBags: bags.filter((b) => b.status === "credited").length,
    pendingBags: bags.filter((b) => b.status !== "credited").length,
    pointsEarned,
  };
}

/* ---------------- Admin: ภาพรวม Drop & Go ---------------- */
export interface DropGoSummary {
  cabinetCount: number;
  bagCount: number;
  pendingBags: number;   // รอคัดแยก + กำลังคัดแยก
  creditedBags: number;
  pointsIssued: number;      // คะแนนที่จ่ายให้คนทิ้งรวม (จากถุง)
  pointsOutstanding: number; // คะแนนคงเหลือในระบบ (ยังไม่แลก)
  redeemPending: number;
  redeemPendingBaht: number;
  redeemPaidBaht: number;
  redeemPaidCount: number;
  cabinets: CabinetWithCounts[];
}
export function dropGoSummary(db: DB): DropGoSummary {
  const bags = db.bags ?? [];
  const reds = db.redemptions ?? [];
  const pending = reds.filter((r) => r.status === "pending");
  const paid = reds.filter((r) => r.status === "paid");
  return {
    cabinetCount: (db.cabinets ?? []).length,
    bagCount: bags.length,
    pendingBags: bags.filter((b) => b.status !== "credited").length,
    creditedBags: bags.filter((b) => b.status === "credited").length,
    pointsIssued: (db.pointTxns ?? []).filter((t) => t.type === "earn").reduce((s, t) => s + t.points, 0),
    pointsOutstanding: (db.users ?? []).reduce((s, u) => s + (u.points ?? 0), 0),
    redeemPending: pending.length,
    redeemPendingBaht: pending.reduce((s, r) => s + r.amountBaht, 0),
    redeemPaidBaht: paid.reduce((s, r) => s + r.amountBaht, 0),
    redeemPaidCount: paid.length,
    cabinets: cabinetsWithCounts(db).sort((a, b) => b.total - a.total),
  };
}
/** ถุงที่เพิ่งได้คะแนน (ล่าสุด) — สำหรับ activity feed */
export function recentCreditedBags(db: DB, limit = 8): MeshBag[] {
  return (db.bags ?? [])
    .filter((b) => b.status === "credited" && b.creditedAt)
    .sort((a, b) => +new Date(b.creditedAt!) - +new Date(a.creditedAt!))
    .slice(0, limit);
}
