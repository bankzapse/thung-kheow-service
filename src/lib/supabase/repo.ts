/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Data repository — โหลด/เขียนผ่าน Supabase แล้ว map เป็นรูป DB เดิมของแอป
 * เพื่อให้ selectors + ทุก component ทำงานเหมือนเดิม (ไม่ต้องแก้)
 * ใช้เมื่อ supabaseConfigured = true เท่านั้น
 */
import type { DB } from "../seed";
import type { Bill, Expense, Job, RewardDraw, RewardTicket, ScheduleSlot, User, WalletTxn, Cabinet, MeshBag, BagItem, PointTxn, Redemption, Franchise } from "../types";
import { MATERIALS } from "../materials";
import { jobCode, ticketNumber, todayISO } from "../utils";

/* ---------------- mappers (snake_case → app shape) ---------------- */
/** แปลงเบอร์ที่เก็บใน Supabase (E164 เช่น 66xxxxxxxxx / +66xxxxxxxxx) → local 0xxxxxxxxx */
function toLocalPhone(p?: string | null): string {
  const d = (p ?? "").replace(/\D/g, "");
  if (d.startsWith("66")) return "0" + d.slice(2);
  return d.startsWith("0") || d === "" ? d : "0" + d;
}
function toUser(p: any): User {
  return {
    id: p.id, role: p.role, name: p.name, phone: toLocalPhone(p.phone),
    email: p.email ?? undefined, lineUserId: p.line_user_id ?? undefined,
    lineConnected: !!p.line_connected, baseLat: p.base_lat ?? undefined, baseLng: p.base_lng ?? undefined,
    status: p.status ?? "active", credit: p.credit != null ? Number(p.credit) : 0, partner: !!p.partner,
    points: p.points != null ? Number(p.points) : 0,
    owner: !!p.owner, permissions: p.permissions ?? undefined, franchiseId: p.franchise_id ?? undefined,
    payout: p.payout ?? undefined,
    address: p.address ?? undefined, province: p.province ?? undefined, district: p.district ?? undefined, subdistrict: p.subdistrict ?? undefined,
    createdAt: p.created_at,
  };
}
function toFranchise(f: any): Franchise {
  return { id: f.id, code: f.code, name: f.name, ownerName: f.owner_name ?? "", phone: f.phone ?? "", createdAt: f.created_at };
}
function toCabinet(c: any): Cabinet {
  return { id: c.id, code: c.code, franchiseId: c.franchise_id ?? "", franchiseCode: c.franchise_code ?? "", name: c.name, location: { lat: c.lat ?? 0, lng: c.lng ?? 0, address: c.address ?? "" }, province: c.province ?? undefined, district: c.district ?? undefined, subdistrict: c.subdistrict ?? undefined, status: c.status ?? "active", createdAt: c.created_at };
}
function toBag(b: any, nameById: Map<string, string>, itemsByBag: Map<string, BagItem[]>): MeshBag {
  return {
    id: b.id, code: b.code, qr: b.qr, cabinetId: b.cabinet_id ?? "", cabinetCode: b.cabinet_code ?? "",
    userId: b.user_id, userName: nameById.get(b.user_id) ?? "", status: b.status,
    items: itemsByBag.get(b.id), valueBaht: b.value_baht != null ? Number(b.value_baht) : undefined,
    points: b.points != null ? Number(b.points) : undefined, note: b.note ?? undefined,
    droppedAt: b.dropped_at, creditedAt: b.credited_at ?? undefined,
  };
}
function toPointTxn(t: any): PointTxn {
  return { id: t.id, userId: t.user_id, type: t.type, points: Number(t.points), balanceAfter: Number(t.balance_after ?? 0), note: t.note ?? undefined, bagId: t.bag_id ?? undefined, redemptionId: t.redemption_id ?? undefined, date: t.created_at };
}
function toRedemption(r: any, nameById: Map<string, string>): Redemption {
  return { id: r.id, code: r.code, userId: r.user_id, userName: nameById.get(r.user_id) ?? "", amountBaht: Number(r.amount_baht), points: Number(r.points), method: r.method, account: r.account ?? "", status: r.status, requestedAt: r.requested_at, paidAt: r.paid_at ?? undefined };
}
function toWallet(w: any): WalletTxn {
  return { id: w.id, buyerId: w.buyer_id, type: w.type, amount: Number(w.amount), balanceAfter: Number(w.balance_after ?? 0), note: w.note ?? undefined, jobId: w.job_id ?? undefined, date: w.created_at };
}
function toDraw(d: any): RewardDraw {
  return {
    month: d.month, prizeName: d.prize_name, prizeValue: Number(d.prize_value ?? 0),
    winningNumber: d.winning_number ?? "", winnerName: d.winner_name ?? undefined,
    announcedAt: d.announced_at ?? undefined, status: d.status,
  };
}
function toTicket(t: any): RewardTicket {
  return { id: t.id, number: t.number, userId: t.user_id, month: t.month, fromJobId: t.from_job_id ?? undefined };
}
function toSlot(s: any, nameById: Map<string, string>): ScheduleSlot {
  return { id: s.id, buyerId: s.buyer_id, buyerName: nameById.get(s.buyer_id) ?? "", date: s.date, area: s.area ?? "", capacity: s.capacity, booked: s.booked };
}
function toExpense(e: any): Expense {
  return { id: e.id, buyerId: e.buyer_id, category: e.category, amount: Number(e.amount), date: e.date, note: e.note ?? undefined, createdAt: e.created_at };
}

/** โหลดข้อมูลทั้งหมดที่ user เห็น (RLS คัดกรองให้) → รูป DB */
export async function loadAll(sb: any): Promise<DB> {
  const [users, prices, bprices, slots, jobs, jobItems, jobHist, bills, billItems, expenses, tickets, draws, wallet, cabs, meshBags, bagItems, pointTxns, redemptions, franchises, franchisePayoutsRes, factorySalesRes, publicProfilesRes] =
    await Promise.all([
      sb.from("profiles").select("*"),
      sb.from("material_prices").select("*"),
      sb.from("buyer_prices").select("*"),
      sb.from("schedule_slots").select("*"),
      sb.from("jobs").select("*"),
      sb.from("job_items").select("*"),
      sb.from("job_status_history").select("*"),
      sb.from("bills").select("*"),
      sb.from("bill_items").select("*"),
      sb.from("expenses").select("*"),
      sb.from("reward_tickets").select("*"),
      sb.from("reward_draws").select("*"),
      sb.from("wallet_transactions").select("*"),
      sb.from("cabinets").select("*"),
      sb.from("mesh_bags").select("*"),
      sb.from("bag_items").select("*"),
      sb.from("point_transactions").select("*"),
      sb.from("redemptions").select("*"),
      sb.from("franchises").select("*"),
      sb.from("franchise_payouts").select("*"),
      sb.from("factory_sales").select("*"),
      sb.from("public_profiles").select("id, name"), // ชื่อผู้ใช้ทุกคน (view เปิดเฉพาะ id/name/role) สำหรับ map ชื่อ
    ]);

  const userRows: any[] = users.data ?? [];
  // map ชื่อจาก view (มีชื่อทุกคน) — ถ้า view ยังไม่มี (ก่อนรัน migration) fallback เป็น userRows
  const nameRows: any[] = (publicProfilesRes?.data && publicProfilesRes.data.length) ? publicProfilesRes.data : userRows;
  const nameById = new Map<string, string>(nameRows.map((u) => [u.id, u.name]));

  // central prices + factory sell prices
  const centralPrices: Record<string, number> = {};
  const factoryPrices: Record<string, number> = {};
  (prices.data ?? []).forEach((p: any) => {
    centralPrices[p.id] = Number(p.price_per_unit);
    if (p.factory_price_per_unit != null) factoryPrices[p.id] = Number(p.factory_price_per_unit);
  });

  // buyer prices
  const buyerPrices: Record<string, Record<string, number>> = {};
  (bprices.data ?? []).forEach((r: any) => {
    (buyerPrices[r.buyer_id] ??= {})[r.material_id] = Number(r.price);
  });

  // jobs assemble
  const itemsByJob = new Map<string, any[]>();
  (jobItems.data ?? []).forEach((it: any) => (itemsByJob.get(it.job_id) ?? itemsByJob.set(it.job_id, []).get(it.job_id))!.push(it));
  const histByJob = new Map<string, any[]>();
  (jobHist.data ?? []).forEach((h: any) => (histByJob.get(h.job_id) ?? histByJob.set(h.job_id, []).get(h.job_id))!.push(h));
  const jobsOut: Job[] = (jobs.data ?? []).map((j: any) => ({
    id: j.id, code: j.code, sellerId: j.seller_id, sellerName: nameById.get(j.seller_id) ?? "",
    buyerId: j.buyer_id ?? undefined, buyerName: j.buyer_id ? nameById.get(j.buyer_id) : undefined,
    items: (itemsByJob.get(j.id) ?? []).map((it) => ({ materialId: it.material_id, name: it.name, unit: it.unit, pricePerUnit: Number(it.price_per_unit), qty: Number(it.qty) })),
    estimatedTotal: Number(j.estimated_total ?? 0),
    location: { lat: j.lat ?? 0, lng: j.lng ?? 0, address: j.address ?? "" },
    houseNo: j.house_no ?? "", landmark: j.landmark ?? "", contactName: j.contact_name ?? "", contactPhone: j.contact_phone ?? "",
    scheduledDate: j.scheduled_date ?? "", note: j.note ?? undefined, status: j.status,
    history: (histByJob.get(j.id) ?? []).sort((a, b) => (a.at < b.at ? -1 : 1)).map((h) => ({ status: h.status, at: h.at, note: h.note ?? undefined })),
    finalAmount: j.final_amount != null ? Number(j.final_amount) : undefined,
    createdAt: j.created_at,
  }));

  // bills assemble
  const itemsByBill = new Map<string, any[]>();
  (billItems.data ?? []).forEach((it: any) => (itemsByBill.get(it.bill_id) ?? itemsByBill.set(it.bill_id, []).get(it.bill_id))!.push(it));
  const billsOut: Bill[] = (bills.data ?? []).map((b: any) => ({
    id: b.id, code: b.code, buyerId: b.buyer_id, source: b.source, jobId: b.job_id ?? undefined,
    sellerName: b.seller_name ?? "", sellerPhone: b.seller_phone ?? "", date: b.created_at,
    items: (itemsByBill.get(b.id) ?? []).map((it) => ({ materialId: it.material_id, name: it.name, unit: it.unit ?? "", qty: Number(it.qty), pricePerUnit: Number(it.price_per_unit), subtotal: Number(it.subtotal) })),
    goodsTotal: Number(b.goods_total), fee: Number(b.fee), netPaid: Number(b.net_paid),
    paymentMethod: b.payment_method, status: b.status, createdAt: b.created_at,
  }));

  return {
    users: userRows.map(toUser),
    jobs: jobsOut,
    slots: (slots.data ?? []).map((s: any) => toSlot(s, nameById)),
    tickets: (tickets.data ?? []).map(toTicket),
    draws: (draws.data ?? []).map(toDraw),
    bills: billsOut,
    expenses: (expenses.data ?? []).map(toExpense),
    buyerPrices,
    centralPrices,
    factoryPrices,
    factorySales: (factorySalesRes.data ?? []).map((r: any) => ({
      id: r.id, soldBy: r.sold_by ?? "", soldByName: nameById.get(r.sold_by) ?? "",
      factoryName: r.factory_name ?? undefined, note: r.note ?? undefined,
      items: Array.isArray(r.items) ? r.items : [],
      revenue: Number(r.revenue), cost: Number(r.cost), profit: Number(r.profit), soldAt: r.sold_at,
    })),
    wallet: (wallet.data ?? []).map(toWallet),
    // Drop & Go
    franchises: (franchises.data ?? []).map(toFranchise),
    cabinets: (cabs.data ?? []).map(toCabinet),
    bags: (() => {
      const itemsByBag = new Map<string, BagItem[]>();
      (bagItems.data ?? []).forEach((it: any) => {
        const arr = itemsByBag.get(it.bag_id) ?? [];
        arr.push({ materialId: it.material_id, name: it.name, qty: Number(it.qty), pricePerUnit: Number(it.price_per_unit), subtotal: Number(it.subtotal) });
        itemsByBag.set(it.bag_id, arr);
      });
      return (meshBags.data ?? []).map((b: any) => toBag(b, nameById, itemsByBag));
    })(),
    pointTxns: (pointTxns.data ?? []).map(toPointTxn),
    redemptions: (redemptions.data ?? []).map((r: any) => toRedemption(r, nameById)),
    franchisePayouts: (franchisePayoutsRes.data ?? []).map((r: any) => ({ id: r.id, franchiseId: r.franchise_id ?? "", franchiseName: r.franchise_name ?? "", amount: Number(r.amount), note: r.note ?? undefined, paidAt: r.paid_at })),
    pricesUpdatedAt: todayISO(),
  };
}

/* ---------------- writes ---------------- */
export async function createJob(sb: any, me: User, input: any, slotBuyerId?: string) {
  const est = input.items.reduce((s: number, i: any) => s + i.pricePerUnit * i.qty, 0);
  const { data: job, error } = await sb.from("jobs").insert({
    code: jobCode(), seller_id: me.id, buyer_id: slotBuyerId ?? null, slot_id: input.slotId ?? null,
    status: "submitted", lat: input.location.lat, lng: input.location.lng, address: input.location.address,
    house_no: input.houseNo, landmark: input.landmark, contact_name: input.contactName, contact_phone: input.contactPhone,
    scheduled_date: input.scheduledDate, note: input.note ?? null, estimated_total: est,
  }).select("id").single();
  if (error) throw error;
  if (input.items.length) {
    await sb.from("job_items").insert(input.items.map((it: any) => ({ job_id: job.id, material_id: it.materialId, name: it.name, unit: it.unit, price_per_unit: it.pricePerUnit, qty: it.qty })));
  }
  await sb.from("job_status_history").insert({ job_id: job.id, status: "submitted" });
  return job.id as string;
}
export async function updateJobStatus(sb: any, jobId: string, status: string, patch: any, note?: string) {
  await sb.from("jobs").update({ status, ...patch }).eq("id", jobId);
  await sb.from("job_status_history").insert({ job_id: jobId, status, note: note ?? null });
}
export async function claimJob(sb: any, me: User, jobId: string) {
  await sb.from("jobs").update({ status: "confirmed", buyer_id: me.id }).eq("id", jobId);
  await sb.from("job_status_history").insert({ job_id: jobId, status: "confirmed", note: "ผู้ซื้อรับงาน" });
}

/** 🔒 ปิดงาน/ออกบิล/สิทธิ์ ผ่าน RPC (server-side) */
export async function settleBill(sb: any, input: any) {
  const { data, error } = await sb.rpc("settle_bill", {
    p_source: input.source, p_job_id: input.jobId ?? null,
    p_seller_name: input.sellerName, p_seller_phone: input.sellerPhone,
    p_items: input.items.map((i: any) => ({ material_id: i.materialId, name: i.name, unit: i.unit, qty: i.qty, price_per_unit: i.pricePerUnit })),
    p_payment: input.paymentMethod,
  });
  if (error) throw error;
  return data as string;
}
export const voidBill = (sb: any, id: string) => sb.from("bills").update({ status: "void" }).eq("id", id);
export const addExpense = (sb: any, me: User, i: any) => sb.from("expenses").insert({ buyer_id: me.id, category: i.category, amount: i.amount, date: i.date, note: i.note ?? null });
export const removeExpense = (sb: any, id: string) => sb.from("expenses").delete().eq("id", id);
export const addSlot = (sb: any, me: User, i: any) => sb.from("schedule_slots").insert({ buyer_id: me.id, date: i.date, area: i.area, capacity: i.capacity, booked: 0 });
export const removeSlot = (sb: any, id: string) => sb.from("schedule_slots").delete().eq("id", id);
export const setBuyerPrice = (sb: any, me: User, materialId: string, price: number) => sb.from("buyer_prices").upsert({ buyer_id: me.id, material_id: materialId, price });
export const setBaseLocation = (sb: any, me: User, lat: number, lng: number) => sb.from("profiles").update({ base_lat: lat, base_lng: lng }).eq("id", me.id);
// connectLine เอาออกแล้ว — เดิมเขียน line_user_id เป็นเลขสุ่มปลอม ทำให้ผูกกับ LINE จริงไม่ได้
// ตอนนี้ผูกผ่าน POST /api/line/link (ตรวจ access token กับ LINE ก่อน แล้วเขียนด้วย service-role)
export const setUserStatus = (sb: any, userId: string, status: string) => sb.rpc("set_user_status", { p_user: userId, p_status: status });
export const setCentralPrice = (sb: any, materialId: string, price: number) => {
  const m = MATERIALS.find((x) => x.id === materialId);
  return sb.from("material_prices").upsert({ id: materialId, name: m?.name ?? materialId, unit: m?.unit ?? "กก.", price_per_unit: price, emoji: m?.emoji, category: m?.category });
};
export const setDrawPrize = (sb: any, month: string, prizeName: string, prizeValue: number) =>
  sb.from("reward_draws").upsert({ month, prize_name: prizeName, prize_value: prizeValue });
export const drawWinner = (sb: any, month: string) => sb.rpc("draw_reward_winner", { p_month: month });
export const adjustCredit = (sb: any, userId: string, amount: number, note?: string) => sb.rpc("adjust_credit", { p_user: userId, p_amount: amount, p_note: note ?? null });

/* ---------------- Drop & Go ---------------- */
export const dropBags = (sb: any, franchiseCode: string, cabinetCode: string, bagCodes: string[]) =>
  sb.rpc("drop_bags", { p_franchise_code: franchiseCode, p_cabinet_code: cabinetCode, p_bag_codes: bagCodes });
export const valueBag = (sb: any, bagId: string, items: BagItem[]) =>
  sb.rpc("value_bag", { p_bag_id: bagId, p_items: items.map((i) => ({ material_id: i.materialId, name: i.name, qty: i.qty, price_per_unit: i.pricePerUnit, subtotal: i.subtotal })) });
export const redeemPoints = (sb: any, amountBaht: number, points: number, method: string, account: string) =>
  sb.rpc("redeem_points", { p_amount: amountBaht, p_points: points, p_method: method, p_account: account });
export const setRedemptionStatus = (sb: any, id: string, status: string) =>
  sb.rpc("set_redemption_status", { p_id: id, p_status: status });
export const recordFactorySale = (sb: any, items: unknown[], factoryName?: string, note?: string) =>
  sb.rpc("record_factory_sale", { p_items: items, p_factory_name: factoryName ?? null, p_note: note ?? null });
export const setFactoryPrice = (sb: any, materialId: string, price: number) =>
  sb.rpc("set_factory_price", { p_material_id: materialId, p_price: price });
export const addCabinet = async (sb: any, input: { code: string; name: string; address: string; franchiseCode: string; province?: string; district?: string; subdistrict?: string; lat?: number; lng?: number }) => {
  const { data, error } = await sb.rpc("add_cabinet", { p_franchise_code: input.franchiseCode, p_code: input.code, p_name: input.name, p_address: input.address, p_lat: input.lat ?? null, p_lng: input.lng ?? null });
  if (error) throw error;
  const id = data as string;
  if (input.province || input.district || input.subdistrict) {
    await sb.from("cabinets").update({ province: input.province ?? null, district: input.district ?? null, subdistrict: input.subdistrict ?? null }).eq("id", id);
  }
  return id;
};
export const editCabinet = (sb: any, id: string, patch: { name?: string; address?: string; province?: string; district?: string; subdistrict?: string }) =>
  sb.from("cabinets").update({
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.address != null ? { address: patch.address } : {}),
    ...(patch.province != null ? { province: patch.province } : {}),
    ...(patch.district != null ? { district: patch.district } : {}),
    ...(patch.subdistrict != null ? { subdistrict: patch.subdistrict } : {}),
  }).eq("id", id);
export const addFranchise = (sb: any, input: { code: string; name: string; ownerName: string; phone: string }) =>
  sb.rpc("add_franchise", { p_code: input.code, p_name: input.name, p_owner: input.ownerName, p_phone: input.phone });

/* ---------------- franchise payout ---------------- */
export const submitPayout = (sb: any, payout: Record<string, unknown>) => sb.rpc("submit_payout", { p_payout: payout });
export const reviewPayout = (sb: any, userId: string, approve: boolean, note?: string) =>
  sb.rpc("review_payout", { p_user: userId, p_approve: approve, p_note: note ?? null });
export const payFranchise = (sb: any, franchiseId: string, amount: number, note?: string) =>
  sb.rpc("pay_franchise", { p_franchise_id: franchiseId, p_amount: amount, p_note: note ?? null });

// อ้างอิงเพื่อกัน unused ในบางเส้นทาง
export const _unused = { ticketNumber };
