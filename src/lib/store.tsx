"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Bill, BillItem, Expense, Job, JobStatus, Role, ScheduleSlot, User, WalletTxn, MeshBag, BagItem, PointTxn, Redemption, Cabinet } from "./types";
import { POINTS_PER_BAHT, bagQr } from "./types";
import { createInitialDB, type DB } from "./seed";
import { billCode, jobCode, ticketNumber, todayISO, uid, currentMonth } from "./utils";
import { computeSettlement, MAX_TICKETS_PER_MONTH, MIN_CREDIT } from "./fees";
import { supabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/client";
import * as repo from "./supabase/repo";

/** map แถว profiles ของ Supabase → User ของแอป */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profileToUser(p: any): User {
  return {
    id: p.id,
    role: p.role,
    name: p.name,
    phone: p.phone ?? "",
    email: p.email ?? undefined,
    lineUserId: p.line_user_id ?? undefined,
    lineConnected: !!p.line_connected,
    baseLat: p.base_lat ?? undefined,
    baseLng: p.base_lng ?? undefined,
    status: (p.status as "active" | "suspended") ?? "active",
    credit: p.credit != null ? Number(p.credit) : 0,
    partner: !!p.partner,
    points: p.points != null ? Number(p.points) : 0,
    createdAt: p.created_at,
  };
}

const DB_KEY = "rf_db_v9";
const USER_KEY = "rf_user_v9";

type Toast = { id: string; text: string; kind: "success" | "info" | "line" };

interface CreateJobInput {
  items: Job["items"];
  location: Job["location"];
  houseNo: string;
  landmark: string;
  contactName: string;
  contactPhone: string;
  scheduledDate: string;
  note?: string;
  slotId?: string;
}

interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

interface CreateBillInput {
  source: "app_job" | "walk_in";
  jobId?: string;
  sellerName: string;
  sellerPhone: string;
  items: BillItem[];
  paymentMethod: "cash" | "transfer" | "promptpay";
}

interface StoreValue {
  ready: boolean;
  db: DB;
  currentUser: User | null;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  pushToast: (text: string, kind?: Toast["kind"]) => void;
  // auth
  loginAs: (userId: string) => void;
  findByPhone: (phone: string) => User | undefined;
  findByEmail: (email: string) => User | undefined;
  register: (input: RegisterInput) => User;
  loginWithLine: (profile: { userId: string; displayName: string; pictureUrl?: string }) => void;
  logout: () => void;
  connectLine: () => void;
  // seller
  createJob: (input: CreateJobInput) => Promise<Job>;
  cancelJob: (jobId: string) => void;
  // buyer
  confirmJob: (jobId: string, note?: string) => void;
  setStatus: (jobId: string, status: JobStatus, note?: string) => void;
  completeJob: (jobId: string, finalAmount: number) => void;
  claimJob: (jobId: string) => void;
  addSlot: (input: { date: string; area: string; capacity: number }) => void;
  removeSlot: (slotId: string) => void;
  // buyer prices & location
  setBuyerPrice: (materialId: string, price: number) => void;
  setBaseLocation: (lat: number, lng: number) => void;
  // shop back-office
  createBill: (input: CreateBillInput) => Promise<Bill>;
  voidBill: (billId: string) => void;
  addExpense: (input: { category: string; amount: number; date: string; note?: string }) => void;
  removeExpense: (id: string) => void;
  // admin console
  setUserStatus: (userId: string, status: "active" | "suspended") => void;
  setCentralPrice: (materialId: string, price: number) => void;
  setDrawPrize: (month: string, prizeName: string, prizeValue: number) => void;
  drawWinner: (month: string) => void;
  // credit / wallet
  topUpCredit: (amount: number) => void;
  adjustCredit: (userId: string, amount: number, note?: string) => void;
  // Drop & Go
  dropBags: (cabinetCode: string, bagCodes: string[]) => void;
  startSorting: (bagId: string) => void;
  valueBag: (bagId: string, items: BagItem[]) => void;
  redeemPoints: (amountBaht: number, points: number, method: "promptpay" | "bank", account: string) => void;
  markRedemptionPaid: (id: string) => void;
  rejectRedemption: (id: string) => void;
  addCabinet: (input: { code: string; name: string; address: string; lat?: number; lng?: number }) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storageReady, setStorageReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(!supabaseConfigured);
  const ready = storageReady && sessionReady;
  const [db, setDb] = useState<DB>(() => createInitialDB());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sbUser, setSbUser] = useState<User | null>(null); // production: จาก Supabase session
  const [toasts, setToasts] = useState<Toast[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbRef = useRef<any>(null);

  // Load from localStorage on mount (demo data layer)
  useEffect(() => {
    try {
      const rawDb = localStorage.getItem(DB_KEY);
      if (rawDb) setDb(JSON.parse(rawDb));
      const rawUser = localStorage.getItem(USER_KEY);
      if (rawUser) setCurrentUserId(rawUser);
    } catch {
      /* ignore corrupt storage */
    }
    setStorageReady(true);
  }, []);

  // Production: hydrate user + data จาก Supabase (session + ตารางทั้งหมด) + realtime
  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    sbRef.current = supabase;
    let active = true;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setSbUser(null);
      } else {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!active) return;
        setSbUser(profile ? profileToUser(profile) : null);
        try {
          const fresh = await repo.loadAll(supabase);
          if (active) setDb(fresh);
        } catch {
          /* ignore */
        }
      }
      setSessionReady(true);
    };
    load();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => load());
    const channel = supabase
      .channel("rf-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        repo.loadAll(supabase).then((d) => active && setDb(d)).catch(() => {});
      })
      .subscribe();
    return () => {
      active = false;
      authSub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist db (demo)
  useEffect(() => {
    if (storageReady) localStorage.setItem(DB_KEY, JSON.stringify(db));
  }, [db, storageReady]);
  // Persist current user (demo only)
  useEffect(() => {
    if (!storageReady || supabaseConfigured) return;
    if (currentUserId) localStorage.setItem(USER_KEY, currentUserId);
    else localStorage.removeItem(USER_KEY);
  }, [currentUserId, storageReady]);

  const currentUser = supabaseConfigured ? sbUser : db.users.find((u) => u.id === currentUserId) ?? null;

  const pushToast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = uid("toast-");
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // ---- Supabase write helper (โหมด production) ----
  const refresh = useCallback(async () => {
    if (!sbRef.current) return;
    try {
      setDb(await repo.loadAll(sbRef.current));
    } catch {
      /* ignore */
    }
  }, []);
  const sbWrite = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fn: (sb: any) => Promise<any>, msg?: string, kind?: Toast["kind"]) => {
      const sb = sbRef.current;
      if (!sb) return;
      fn(sb)
        .then(() => {
          refresh();
          if (msg) pushToast(msg, kind ?? "success");
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((e: any) => pushToast(e?.message ?? "เกิดข้อผิดพลาด", "info"));
    },
    [refresh, pushToast],
  );

  // ---- auth ----
  const loginAs = useCallback((userId: string) => setCurrentUserId(userId), []);
  const findByPhone = useCallback(
    (phone: string) => db.users.find((u) => u.phone === phone.trim()),
    [db.users],
  );
  const findByEmail = useCallback(
    (email: string) => db.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase()),
    [db.users],
  );

  const register = useCallback(
    (input: RegisterInput) => {
      const existing =
        db.users.find((u) => u.phone === input.phone.trim()) ||
        (input.email ? db.users.find((u) => u.email === input.email) : undefined);
      if (existing) {
        setCurrentUserId(existing.id);
        return existing;
      }
      const user: User = {
        id: uid("u-"),
        role: input.role,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        lineConnected: false,
        createdAt: todayISO(),
      };
      setDb((d) => ({ ...d, users: [...d.users, user] }));
      setCurrentUserId(user.id);
      return user;
    },
    [db.users],
  );

  const loginWithLine = useCallback(
    (profile: { userId: string; displayName: string; pictureUrl?: string }) => {
      if (supabaseConfigured) return; // production: exchange LIFF token → Supabase session (ฝั่ง server)
      const existing = db.users.find((u) => u.lineUserId === profile.userId);
      if (existing) {
        setCurrentUserId(existing.id);
        return;
      }
      const user: User = {
        id: uid("u-"),
        role: "seller",
        name: profile.displayName || "ผู้ใช้ LINE",
        phone: "",
        lineUserId: profile.userId,
        lineConnected: true,
        createdAt: todayISO(),
      };
      setDb((d) => ({ ...d, users: [...d.users, user] }));
      setCurrentUserId(user.id);
    },
    [db.users],
  );

  const logout = useCallback(() => {
    if (supabaseConfigured) {
      createClient().auth.signOut();
      setSbUser(null);
    } else {
      setCurrentUserId(null);
    }
  }, []);

  const connectLine = useCallback(() => {
    if (supabaseConfigured) {
      if (currentUser) sbWrite((sb) => repo.connectLine(sb, currentUser), "เชื่อมบัญชี LINE OA สำเร็จ 🎉", "line");
      return;
    }
    if (!currentUserId) return;
    setDb((d) => ({
      ...d,
      users: d.users.map((u) =>
        u.id === currentUserId ? { ...u, lineConnected: true, lineUserId: "U" + uid() } : u,
      ),
    }));
    pushToast("เชื่อมบัญชี LINE OA สำเร็จ 🎉", "line");
  }, [currentUserId, currentUser, sbWrite, pushToast]);

  // ---- jobs ----
  const createJob = useCallback(
    async (input: CreateJobInput) => {
      if (!currentUser) throw new Error("no user");
      const slot = input.slotId ? db.slots.find((s) => s.id === input.slotId) : undefined;
      if (supabaseConfigured) {
        const jobId = await repo.createJob(sbRef.current, currentUser, input, slot?.buyerId);
        await refresh();
        pushToast("ส่งรายการรับของสำเร็จ • รอผู้ซื้อคอนเฟิร์ม", "success");
        return { id: jobId } as Job;
      }
      const job: Job = {
        id: uid("job-"),
        code: jobCode(),
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        buyerId: slot?.buyerId,
        buyerName: slot?.buyerName,
        items: input.items,
        estimatedTotal: input.items.reduce((s, i) => s + i.pricePerUnit * i.qty, 0),
        location: input.location,
        houseNo: input.houseNo,
        landmark: input.landmark,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        scheduledDate: input.scheduledDate,
        note: input.note,
        status: "submitted",
        history: [{ status: "submitted", at: todayISO() }],
        createdAt: todayISO(),
      };
      setDb((d) => ({
        ...d,
        jobs: [job, ...d.jobs],
        slots: slot
          ? d.slots.map((s) => (s.id === slot.id ? { ...s, booked: s.booked + 1 } : s))
          : d.slots,
      }));
      pushToast("ส่งรายการรับของสำเร็จ • รอผู้ซื้อคอนเฟิร์ม", "success");
      return job;
    },
    [currentUser, db.slots, pushToast, refresh],
  );

  const mutateJob = useCallback(
    (jobId: string, fn: (j: Job) => Job, extra?: Partial<DB>) => {
      setDb((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === jobId ? fn(j) : j)), ...extra }));
    },
    [],
  );

  const cancelJob = useCallback(
    (jobId: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.updateJobStatus(sb, jobId, "cancelled", {}), "ยกเลิกงานแล้ว", "info");
      mutateJob(jobId, (j) => ({
        ...j,
        status: "cancelled",
        history: [...j.history, { status: "cancelled", at: todayISO() }],
      }));
      pushToast("ยกเลิกงานแล้ว", "info");
    },
    [mutateJob, pushToast, sbWrite],
  );

  const claimJob = useCallback(
    (jobId: string) => {
      if (!currentUser) return;
      if ((currentUser.credit ?? 0) < MIN_CREDIT) {
        pushToast(`เครดิตไม่พอ (ต้อง ≥ ${MIN_CREDIT}฿) — เติมเครดิตก่อนรับงาน`, "info");
        return;
      }
      if (supabaseConfigured) return sbWrite((sb) => repo.claimJob(sb, currentUser, jobId), "รับงานแล้ว • แจ้งเตือน LINE ให้ผู้ขาย", "line");
      mutateJob(jobId, (j) => ({
        ...j,
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        status: "confirmed",
        history: [...j.history, { status: "confirmed", at: todayISO(), note: "ผู้ซื้อรับงาน" }],
      }));
      pushToast("รับงานแล้ว • แจ้งเตือน LINE ให้ผู้ขาย", "line");
    },
    [currentUser, mutateJob, pushToast, sbWrite],
  );

  const confirmJob = useCallback(
    (jobId: string, note?: string) => {
      if ((currentUser?.credit ?? 0) < MIN_CREDIT) {
        pushToast(`เครดิตไม่พอ (ต้อง ≥ ${MIN_CREDIT}฿) — เติมเครดิตก่อนรับงาน`, "info");
        return;
      }
      if (supabaseConfigured) return sbWrite((sb) => repo.updateJobStatus(sb, jobId, "confirmed", {}, note), "คอนเฟิร์มงาน • แจ้งเตือน LINE ให้ผู้ขาย", "line");
      mutateJob(jobId, (j) => ({
        ...j,
        status: "confirmed",
        history: [...j.history, { status: "confirmed", at: todayISO(), note }],
      }));
      pushToast("คอนเฟิร์มงาน • แจ้งเตือน LINE ให้ผู้ขาย", "line");
    },
    [mutateJob, pushToast, sbWrite],
  );

  const setStatus = useCallback(
    (jobId: string, status: JobStatus, note?: string) => {
      if (supabaseConfigured)
        return sbWrite(
          (sb) => repo.updateJobStatus(sb, jobId, status, {}, note),
          status === "en_route" ? "อัปเดต: กำลังไปรับ • แจ้ง LINE ผู้ขาย" : undefined,
          "line",
        );
      mutateJob(jobId, (j) => ({
        ...j,
        status,
        history: [...j.history, { status, at: todayISO(), note }],
      }));
      if (status === "en_route") pushToast("อัปเดต: กำลังไปรับ • แจ้ง LINE ผู้ขาย", "line");
    },
    [mutateJob, pushToast, sbWrite],
  );

  const completeJob = useCallback(
    (jobId: string, finalAmount: number) => {
      const guard = db.jobs.find((j) => j.id === jobId);
      // อุดช่องโหว่: ปิดงานซ้ำไม่ได้ (กัน mint สิทธิ์ซ้ำ), งานที่ยกเลิกแล้วปิดไม่ได้
      if (!guard || guard.status === "completed" || guard.status === "cancelled") return;

      const s = computeSettlement(finalAmount);
      const month = currentMonth();

      setDb((d) => {
        const target = d.jobs.find((j) => j.id === jobId);
        if (!target || target.status === "completed" || target.status === "cancelled") return d; // idempotent
        // เพดานสิทธิ์รายเดือน/คน (กันการฟาร์มสิทธิ์)
        const used = d.tickets.filter((t) => t.userId === target.sellerId && t.month === month).length;
        const grant = Math.max(0, Math.min(s.tickets, MAX_TICKETS_PER_MONTH - used));
        const newTickets = Array.from({ length: grant }, () => ({
          id: uid("t-"),
          number: ticketNumber(),
          userId: target.sellerId,
          month,
          fromJobId: jobId,
        }));
        return {
          ...d,
          jobs: d.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "completed" as JobStatus,
                  finalAmount: s.goods,
                  history: [
                    ...j.history,
                    {
                      status: "completed" as JobStatus,
                      at: todayISO(),
                      note: `รับซื้อ ${s.goods} บาท · ค่าบริการ ${s.fee} · จ่ายผู้ขาย ${s.sellerNet}`,
                    },
                  ],
                }
              : j,
          ),
          tickets: [...d.tickets, ...newTickets],
        };
      });
      pushToast(
        s.tickets > 0
          ? `ปิดงานสำเร็จ • ผู้ขายได้รับ ${s.tickets} สิทธิ์ลุ้นรางวัล 🎟️`
          : "ปิดงานสำเร็จ",
        "success",
      );
    },
    [db.jobs, pushToast],
  );

  // ---- schedule slots (buyer) ----
  const addSlot = useCallback(
    (input: { date: string; area: string; capacity: number }) => {
      if (!currentUser) return;
      if (supabaseConfigured) return sbWrite((sb) => repo.addSlot(sb, currentUser, input), "เพิ่มรอบเข้ารับแล้ว", "success");
      const slot: ScheduleSlot = {
        id: uid("slot-"),
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        date: input.date,
        area: input.area,
        capacity: input.capacity,
        booked: 0,
      };
      setDb((d) => ({ ...d, slots: [...d.slots, slot] }));
      pushToast("เพิ่มรอบเข้ารับแล้ว", "success");
    },
    [currentUser, pushToast, sbWrite],
  );

  const removeSlot = useCallback(
    (slotId: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.removeSlot(sb, slotId), "ลบรอบแล้ว", "info");
      setDb((d) => ({ ...d, slots: d.slots.filter((s) => s.id !== slotId) }));
      pushToast("ลบรอบแล้ว", "info");
    },
    [pushToast, sbWrite],
  );

  // ---- buyer prices & base location ----
  const setBuyerPrice = useCallback(
    (materialId: string, price: number) => {
      if (!currentUser) return;
      if (supabaseConfigured) return sbWrite((sb) => repo.setBuyerPrice(sb, currentUser, materialId, Math.max(0, Math.round(price))));
      setDb((d) => ({
        ...d,
        buyerPrices: {
          ...d.buyerPrices,
          [currentUser.id]: {
            ...(d.buyerPrices[currentUser.id] || {}),
            [materialId]: Math.max(0, Math.round(price)),
          },
        },
      }));
    },
    [currentUser, sbWrite],
  );

  const setBaseLocation = useCallback(
    (lat: number, lng: number) => {
      if (!currentUser) return;
      if (supabaseConfigured) return sbWrite((sb) => repo.setBaseLocation(sb, currentUser, lat, lng), "อัปเดตตำแหน่งฐานแล้ว", "success");
      setDb((d) => ({
        ...d,
        users: d.users.map((u) => (u.id === currentUser.id ? { ...u, baseLat: lat, baseLng: lng } : u)),
      }));
      pushToast("อัปเดตตำแหน่งฐานแล้ว", "success");
    },
    [currentUser, pushToast, sbWrite],
  );

  // ---- shop back-office: bills & expenses ----
  const createBill = useCallback(
    async (input: CreateBillInput) => {
      if (!currentUser) throw new Error("no user");
      const goodsTotal = input.items.reduce((s, i) => s + i.subtotal, 0);
      const st = computeSettlement(goodsTotal);
      if (supabaseConfigured) {
        const billId = await repo.settleBill(sbRef.current, input);
        await refresh();
        pushToast(input.source === "app_job" ? "ออกบิล + ปิดงานแล้ว" : `ออกบิล • จ่าย ฿${st.sellerNet}`, "success");
        return { id: billId } as Bill;
      }
      const bill: Bill = {
        id: uid("bill-"),
        code: billCode(),
        buyerId: currentUser.id,
        source: input.source,
        jobId: input.jobId,
        sellerName: input.sellerName,
        sellerPhone: input.sellerPhone,
        date: todayISO(),
        items: input.items,
        goodsTotal: st.goods,
        fee: st.fee,
        netPaid: st.sellerNet,
        paymentMethod: input.paymentMethod,
        status: "paid",
        createdAt: todayISO(),
      };
      // ออกบิล + หักค่าคอมบริษัทจากเครดิตพาร์ทเนอร์ (atomic)
      setDb((d) => {
        const bal = (d.users.find((x) => x.id === currentUser.id)?.credit ?? 0) - st.fee;
        return {
          ...d,
          bills: [bill, ...d.bills],
          users: d.users.map((x) => (x.id === currentUser.id ? { ...x, credit: bal } : x)),
          wallet: [
            { id: uid("w-"), buyerId: currentUser.id, type: "commission" as const, amount: -st.fee, balanceAfter: bal, note: `ค่าคอมบิล ${bill.code}`, date: todayISO() },
            ...d.wallet,
          ],
        };
      });
      if (input.source === "app_job" && input.jobId) {
        completeJob(input.jobId, goodsTotal); // ปิดงานในแอป + ออกสิทธิ์ให้ผู้ขาย
        pushToast(`ออกบิล ${bill.code} · จ่ายผู้ขาย ฿${st.sellerNet} · หักค่าคอม ฿${st.fee}`, "success");
      } else {
        pushToast(`ออกบิล ${bill.code} · จ่ายผู้ขาย ฿${st.sellerNet} · หักค่าคอม ฿${st.fee}`, "success");
      }
      return bill;
    },
    [currentUser, completeJob, pushToast, refresh],
  );

  const voidBill = useCallback(
    (billId: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.voidBill(sb, billId), "ยกเลิกบิลแล้ว", "info");
      setDb((d) => ({
        ...d,
        bills: d.bills.map((b) => (b.id === billId ? { ...b, status: "void" as const } : b)),
      }));
      pushToast("ยกเลิกบิลแล้ว", "info");
    },
    [pushToast, sbWrite],
  );

  const addExpense = useCallback(
    (input: { category: string; amount: number; date: string; note?: string }) => {
      if (!currentUser) return;
      if (supabaseConfigured) return sbWrite((sb) => repo.addExpense(sb, currentUser, input), "บันทึกรายจ่ายแล้ว", "success");
      const exp: Expense = {
        id: uid("exp-"),
        buyerId: currentUser.id,
        category: input.category,
        amount: Math.max(0, Math.round(input.amount)),
        date: input.date,
        note: input.note,
        createdAt: todayISO(),
      };
      setDb((d) => ({ ...d, expenses: [exp, ...d.expenses] }));
      pushToast("บันทึกรายจ่ายแล้ว", "success");
    },
    [currentUser, pushToast, sbWrite],
  );

  const removeExpense = useCallback(
    (id: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.removeExpense(sb, id), "ลบรายจ่ายแล้ว", "info");
      setDb((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
      pushToast("ลบรายจ่ายแล้ว", "info");
    },
    [pushToast, sbWrite],
  );

  // ---- admin console ----
  const setUserStatus = useCallback(
    (userId: string, status: "active" | "suspended") => {
      if (supabaseConfigured) return sbWrite((sb) => repo.setUserStatus(sb, userId, status), status === "suspended" ? "ระงับบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว", "info");
      setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === userId ? { ...u, status } : u)) }));
      pushToast(status === "suspended" ? "ระงับบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว", "info");
    },
    [pushToast, sbWrite],
  );

  const setCentralPrice = useCallback(
    (materialId: string, price: number) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.setCentralPrice(sb, materialId, Math.max(0, Math.round(price))));
      setDb((d) => ({ ...d, centralPrices: { ...d.centralPrices, [materialId]: Math.max(0, Math.round(price)) } }));
    },
    [sbWrite],
  );

  const setDrawPrize = useCallback(
    (month: string, prizeName: string, prizeValue: number) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.setDrawPrize(sb, month, prizeName, prizeValue));
      setDb((d) => {
      const exists = d.draws.some((dr) => dr.month === month);
      const draws = exists
        ? d.draws.map((dr) => (dr.month === month ? { ...dr, prizeName, prizeValue } : dr))
        : [...d.draws, { month, prizeName, prizeValue, winningNumber: "", status: "pending" as const }];
      return { ...d, draws };
    });
    },
    [sbWrite],
  );

  const drawWinner = useCallback(
    (month: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.drawWinner(sb, month), `ประกาศผล ${month} • แจ้ง LINE ผู้ขายทุกคนแล้ว`, "line");
      const monthTickets = db.tickets.filter((t) => t.month === month);
      if (monthTickets.length === 0) {
        pushToast("ยังไม่มีสิทธิ์ในเดือนนี้", "info");
        return;
      }
      // สุ่มผู้โชคดีจากสิทธิ์ทั้งหมดอย่างยุติธรรม (production: ผูกเลขหวยรัฐ/commit-reveal)
      const win = monthTickets[Math.floor(Math.random() * monthTickets.length)];
      const winner = db.users.find((u) => u.id === win.userId);
      setDb((d) => {
        const exists = d.draws.some((dr) => dr.month === month);
        const patch = {
          winningNumber: win.number,
          winnerName: winner?.name,
          announcedAt: todayISO(),
          status: "announced" as const,
        };
        const draws = exists
          ? d.draws.map((dr) => (dr.month === month ? { ...dr, ...patch } : dr))
          : [...d.draws, { month, prizeName: "รางวัลประจำเดือน", prizeValue: 0, ...patch }];
        return { ...d, draws };
      });
      pushToast(`ประกาศผล ${month} • แจ้ง LINE ผู้ขายทุกคนแล้ว`, "line");
    },
    [db.tickets, db.users, pushToast, sbWrite],
  );

  // ---- credit / wallet ----
  const topUpCredit = useCallback(
    (amount: number) => {
      if (!currentUser) return;
      if (supabaseConfigured) {
        pushToast("โหมด production: ส่งคำขอเติมเครดิต (รอยืนยันการโอน)", "info");
        return;
      }
      const amt = Math.max(0, Math.round(amount));
      if (amt <= 0) return;
      setDb((d) => {
        const bal = (d.users.find((x) => x.id === currentUser.id)?.credit ?? 0) + amt;
        return {
          ...d,
          users: d.users.map((x) => (x.id === currentUser.id ? { ...x, credit: bal } : x)),
          wallet: [{ id: uid("w-"), buyerId: currentUser.id, type: "topup" as const, amount: amt, balanceAfter: bal, note: "เติมเครดิต (PromptPay)", date: todayISO() }, ...d.wallet],
        };
      });
      pushToast(`เติมเครดิต ฿${amt} สำเร็จ`, "success");
    },
    [currentUser, pushToast],
  );

  const adjustCredit = useCallback(
    (userId: string, amount: number, note?: string) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.adjustCredit(sb, userId, amount, note), "ปรับเครดิตแล้ว", "info");
      setDb((d) => {
        const bal = (d.users.find((x) => x.id === userId)?.credit ?? 0) + amount;
        return {
          ...d,
          users: d.users.map((x) => (x.id === userId ? { ...x, credit: bal } : x)),
          wallet: [{ id: uid("w-"), buyerId: userId, type: "adjust" as const, amount, balanceAfter: bal, note: note ?? "ปรับโดยแอดมิน", date: todayISO() }, ...d.wallet],
        };
      });
      pushToast("ปรับเครดิตแล้ว", "info");
    },
    [pushToast],
  );

  // ---- Drop & Go: หย่อนถุง / คัดแยก / ให้คะแนน / แลกเงิน ----
  const dropBags = useCallback(
    (cabinetCode: string, bagCodes: string[]) => {
      if (!currentUser) return;
      const code = cabinetCode.trim().toUpperCase().replace(/^#?(TH-)?/i, "").split("-")[0];
      const clean = [...new Set(bagCodes.map((b) => b.trim().split("-").pop()!.replace(/[^0-9]/g, "")).filter(Boolean))];
      if (clean.length === 0) { pushToast("กรุณาเพิ่มถุงอย่างน้อย 1 ใบ", "info"); return; }
      if (supabaseConfigured) return sbWrite((sb) => repo.dropBags(sb, code, clean), `หย่อน ${clean.length} ถุง · รอคะแนน`, "line");
      const cab = db.cabinets.find((c) => c.code === code);
      if (!cab) { pushToast(`ไม่พบตู้รหัส ${code || "-"}`, "info"); return; }
      const now = todayISO();
      const newBags: MeshBag[] = clean.map((bc) => ({
        id: uid("bag-"), code: bc, qr: bagQr(cab.code, bc), cabinetId: cab.id, cabinetCode: cab.code,
        userId: currentUser.id, userName: currentUser.name, status: "dropped", droppedAt: now,
      }));
      setDb((d) => ({ ...d, bags: [...newBags, ...d.bags] }));
      pushToast(`หย่อน ${clean.length} ถุงที่ตู้ ${cab.name} · แจ้ง LINE เมื่อได้คะแนน`, "line");
    },
    [currentUser, db.cabinets, pushToast],
  );

  const startSorting = useCallback((bagId: string) => {
    setDb((d) => ({ ...d, bags: d.bags.map((b) => (b.id === bagId && b.status === "dropped" ? { ...b, status: "sorting" } : b)) }));
  }, []);

  const valueBag = useCallback(
    (bagId: string, items: BagItem[]) => {
      if (supabaseConfigured) return sbWrite((sb) => repo.valueBag(sb, bagId, items), "ตีราคา + ให้คะแนนแล้ว", "line");
      setDb((d) => {
        const bag = d.bags.find((b) => b.id === bagId);
        if (!bag) return d;
        const valueBaht = items.reduce((s, i) => s + i.subtotal, 0);
        const points = valueBaht * POINTS_PER_BAHT;
        const now = todayISO();
        const bal = (d.users.find((u) => u.id === bag.userId)?.points ?? 0) + points;
        return {
          ...d,
          bags: d.bags.map((b) => (b.id === bagId ? { ...b, items, valueBaht, points, status: "credited", creditedAt: now } : b)),
          users: d.users.map((u) => (u.id === bag.userId ? { ...u, points: bal } : u)),
          pointTxns: [{ id: uid("pt-"), userId: bag.userId, type: "earn", points, balanceAfter: bal, note: `ถุง ${bag.qr}`, bagId: bag.id, date: now }, ...d.pointTxns],
        };
      });
      pushToast("ตีราคา + ให้คะแนนแล้ว · แจ้ง LINE คนทิ้ง", "line");
    },
    [pushToast],
  );

  const redeemPoints = useCallback(
    (amountBaht: number, points: number, method: "promptpay" | "bank", account: string) => {
      if (!currentUser) return;
      if ((currentUser.points ?? 0) < points) { pushToast("คะแนนไม่พอสำหรับตัวเลือกนี้", "info"); return; }
      if (!account.trim()) { pushToast("กรุณากรอกพร้อมเพย์/เลขบัญชีรับเงิน", "info"); return; }
      if (supabaseConfigured) return sbWrite((sb) => repo.redeemPoints(sb, amountBaht, points, method, account.trim()), `ส่งคำขอแลกเงิน ฿${amountBaht}`, "success");
      const now = todayISO();
      const bal = (currentUser.points ?? 0) - points;
      const rid = uid("r-");
      const rcode = "R-" + String(3000 + Math.floor(Math.random() * 6999));
      setDb((d) => ({
        ...d,
        users: d.users.map((u) => (u.id === currentUser.id ? { ...u, points: bal } : u)),
        pointTxns: [{ id: uid("pt-"), userId: currentUser.id, type: "redeem", points: -points, balanceAfter: bal, note: `แลกเงิน ฿${amountBaht}`, redemptionId: rid, date: now }, ...d.pointTxns],
        redemptions: [{ id: rid, code: rcode, userId: currentUser.id, userName: currentUser.name, amountBaht, points, method, account: account.trim(), status: "pending", requestedAt: now }, ...d.redemptions],
      }));
      pushToast(`ส่งคำขอแลกเงิน ฿${amountBaht} · โอนภายใน 1-3 วันทำการ`, "success");
    },
    [currentUser, pushToast],
  );

  const markRedemptionPaid = useCallback((id: string) => {
    if (supabaseConfigured) return sbWrite((sb) => repo.setRedemptionStatus(sb, id, "paid"), "ทำเครื่องหมายจ่ายเงินแล้ว", "success");
    setDb((d) => ({ ...d, redemptions: d.redemptions.map((r) => (r.id === id ? { ...r, status: "paid", paidAt: todayISO() } : r)) }));
    pushToast("ทำเครื่องหมายจ่ายเงินแล้ว", "success");
  }, [pushToast]);

  const rejectRedemption = useCallback((id: string) => {
    if (supabaseConfigured) return sbWrite((sb) => repo.setRedemptionStatus(sb, id, "rejected"), "ปฏิเสธคำขอ + คืนคะแนนแล้ว", "info");
    setDb((d) => {
      const r = d.redemptions.find((x) => x.id === id);
      if (!r || r.status !== "pending") return d;
      const bal = (d.users.find((u) => u.id === r.userId)?.points ?? 0) + r.points; // คืนคะแนน
      return {
        ...d,
        redemptions: d.redemptions.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)),
        users: d.users.map((u) => (u.id === r.userId ? { ...u, points: bal } : u)),
        pointTxns: [{ id: uid("pt-"), userId: r.userId, type: "adjust", points: r.points, balanceAfter: bal, note: `คืนคะแนน (ปฏิเสธ ${r.code})`, redemptionId: r.id, date: todayISO() }, ...d.pointTxns],
      };
    });
    pushToast("ปฏิเสธคำขอ + คืนคะแนนแล้ว", "info");
  }, [pushToast]);

  const addCabinet = useCallback(
    (input: { code: string; name: string; address: string; lat?: number; lng?: number }) => {
      const code = input.code.trim().toUpperCase();
      if (!code) { pushToast("กรุณาระบุรหัสตู้", "info"); return; }
      if (supabaseConfigured) return sbWrite((sb) => repo.addCabinet(sb, { ...input, code }), `เพิ่มตู้ ${code} แล้ว`, "success");
      if (db.cabinets.some((c) => c.code === code)) { pushToast(`มีตู้รหัส ${code} อยู่แล้ว`, "info"); return; }
      const cab: Cabinet = { id: uid("cab-"), code, name: input.name.trim() || code, location: { lat: input.lat ?? 13.7563, lng: input.lng ?? 100.5018, address: input.address.trim() }, status: "active", createdAt: todayISO() };
      setDb((d) => ({ ...d, cabinets: [...d.cabinets, cab] }));
      pushToast(`เพิ่มตู้ ${code} แล้ว`, "success");
    },
    [db.cabinets, pushToast],
  );

  const value: StoreValue = {
    ready,
    db,
    currentUser,
    toasts,
    dismissToast,
    pushToast,
    loginAs,
    findByPhone,
    findByEmail,
    register,
    loginWithLine,
    logout,
    connectLine,
    createJob,
    cancelJob,
    confirmJob,
    setStatus,
    completeJob,
    claimJob,
    addSlot,
    removeSlot,
    setBuyerPrice,
    setBaseLocation,
    createBill,
    voidBill,
    addExpense,
    removeExpense,
    setUserStatus,
    setCentralPrice,
    setDrawPrize,
    drawWinner,
    topUpCredit,
    adjustCredit,
    dropBags,
    startSorting,
    valueBag,
    redeemPoints,
    markRedemptionPaid,
    rejectRedemption,
    addCabinet,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
