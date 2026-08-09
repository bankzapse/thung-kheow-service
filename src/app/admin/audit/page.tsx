"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { thaiDateTime } from "@/lib/utils";
import { ScrollText, RefreshCw, ShieldAlert, Banknote, UserCog, Trash2, PlusCircle, Pencil, MapPin, KeyRound } from "lucide-react";

const PAGE = 50;

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  created_at: string;
};

/** หมวดของ action → ใช้กรอง + สีป้าย */
type Cat = "money" | "account" | "other";
const CATEGORY: Record<string, Cat> = {
  "redemption.paid": "money",
  closeMonthlyBonus: "money",
  "account.delete_self": "account",
  createFranchise: "account",
  updateFranchise: "account",
  removeFranchise: "account",
  createCenter: "account",
  updateCenter: "account",
  removeCenter: "account",
  removeSeller: "account",
  resetSellerPassword: "account",
  createAdmin: "account",
  setAdminPermissions: "account",
  removeAdmin: "account",
  verifySellerPhone: "account",
  updateCabinet: "other",
  setCabinetLocation: "other",
};
const catOf = (action: string): Cat => CATEGORY[action] ?? "other";

/** ป้ายอ่านง่ายของ action */
const ACTION_LABEL: Record<string, string> = {
  "redemption.paid": "จ่ายเงินแลกคะแนน",
  "account.delete_self": "ลบบัญชีตัวเอง",
  closeMonthlyBonus: "ปิดยอดโบนัสประจำเดือน",
  createFranchise: "สร้างแฟรนไชส์",
  updateFranchise: "แก้ไขแฟรนไชส์",
  removeFranchise: "ลบแฟรนไชส์",
  createCenter: "สร้างศูนย์คัดแยก",
  updateCenter: "แก้ไขศูนย์คัดแยก",
  removeCenter: "ลบศูนย์คัดแยก",
  removeSeller: "ลบบัญชีผู้ขาย",
  resetSellerPassword: "รีเซ็ตรหัสผ่านผู้ขาย",
  createAdmin: "สร้างผู้ดูแล",
  setAdminPermissions: "ตั้งสิทธิ์ผู้ดูแล",
  removeAdmin: "ลบผู้ดูแล",
  verifySellerPhone: "ยืนยันเบอร์ผู้ขาย",
  updateCabinet: "แก้ข้อมูลตู้",
  setCabinetLocation: "ปักพิกัดตู้",
};

function actionIcon(action: string) {
  if (action === "redemption.paid" || action === "closeMonthlyBonus") return Banknote;
  if (action.startsWith("remove") || action === "account.delete_self") return Trash2;
  if (action.startsWith("create")) return PlusCircle;
  if (action.startsWith("update") || action === "updateCabinet") return Pencil;
  if (action === "setCabinetLocation") return MapPin;
  if (action === "resetSellerPassword") return KeyRound;
  if (action === "setAdminPermissions") return UserCog;
  return ScrollText;
}

const catBadge: Record<Cat, string> = {
  money: "bg-brand-50 text-brand-700 ring-brand-100",
  account: "bg-amber-50 text-amber-700 ring-amber-100",
  other: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

const roleLabel = (r: string | null) =>
  r === "owner" ? "เจ้าของระบบ" : r === "admin" ? "ผู้ดูแล" : r === "franchise" ? "แฟรนไชส์" : r === "buyer" ? "ศูนย์คัดแยก" : r === "seller" ? "ผู้ขาย" : "—";

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(supabaseConfigured); // ไม่ได้ตั้ง Supabase = ไม่โหลด → เริ่ม false เลย
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<"all" | Cat>("all");

  const load = useCallback(async (offset: number) => {
    const sb = createClient();
    const { data, error } = await sb
      .from("audit_logs")
      .select("id,actor_id,actor_role,action,target_type,target_id,summary,created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AuditRow[];

    // แปลง actor_id → ชื่อ (จาก public_profiles) เฉพาะที่ยังไม่มีในแคช
    const need = [...new Set(batch.map((r) => r.actor_id).filter((x): x is string => !!x))];
    if (need.length) {
      const { data: profs } = await sb.from("public_profiles").select("id,name").in("id", need);
      if (profs?.length) {
        setNames((prev) => {
          const next = { ...prev };
          for (const p of profs as { id: string; name: string | null }[]) next[p.id] = p.name ?? "—";
          return next;
        });
      }
    }
    return batch;
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return; // loading เริ่มเป็น false อยู่แล้ว
    let alive = true;
    (async () => {
      try {
        const batch = await load(0);
        if (!alive) return;
        setRows(batch);
        setDone(batch.length < PAGE);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [load]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const batch = await load(0);
      setRows(batch);
      setDone(batch.length < PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const batch = await load(rows.length);
      setRows((prev) => [...prev, ...batch]);
      setDone(batch.length < PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดเพิ่มไม่สำเร็จ");
    } finally {
      setLoadingMore(false);
    }
  };

  const shown = useMemo(() => rows.filter((r) => cat === "all" || catOf(r.action) === cat), [rows, cat]);
  const actorName = (r: AuditRow) => (r.actor_id ? names[r.actor_id] ?? "…" : r.actor_role ? "ระบบ" : "—");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">บันทึกการใช้งาน (Audit log)</h1>
          <p className="text-sm text-neutral-500">ประวัติการกระทำที่อ่อนไหว — ใครทำอะไร กับใคร เมื่อไหร่ (อ่านอย่างเดียว แก้/ลบไม่ได้)</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 ring-1 ring-amber-100">
          <ShieldAlert className="h-5 w-5 shrink-0" /> โหมดสาธิต (ไม่ได้ต่อ Supabase) — audit log ใช้ได้เฉพาะเมื่อเปิดโหมด Supabase จริง
        </div>
      )}

      {supabaseConfigured && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "ทั้งหมด"],
              ["money", "การเงิน"],
              ["account", "บัญชี & สิทธิ์"],
              ["other", "อื่น ๆ"],
            ] as const).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setCat(f)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${cat === f ? "bg-brand-600 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50"}`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-sm text-neutral-500">แสดง <b className="text-neutral-800">{shown.length}</b> รายการ</span>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">{error}</div>
          )}

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-900/[0.04]">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">เวลา</th>
                  <th className="px-4 py-2.5 font-medium">ผู้ทำ</th>
                  <th className="px-4 py-2.5 font-medium">การกระทำ</th>
                  <th className="px-4 py-2.5 font-medium">เป้าหมาย</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const Icon = actionIcon(r.action);
                  const c = catOf(r.action);
                  return (
                    <tr key={r.id} className="border-b border-neutral-50 align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{thaiDateTime(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-neutral-800">{actorName(r)}</span>
                        <span className="text-xs text-neutral-400">{roleLabel(r.actor_role)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${catBadge[c]}`}>
                          <Icon className="h-3.5 w-3.5" /> {ACTION_LABEL[r.action] ?? r.action}
                        </span>
                        {r.summary && <span className="mt-1 block text-neutral-600">{r.summary}</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {r.target_type ? <span className="block text-xs text-neutral-400">{r.target_type}</span> : null}
                        {r.target_id ? <span className="block font-mono text-xs">{r.target_id.length > 14 ? r.target_id.slice(0, 8) + "…" : r.target_id}</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
                {!loading && shown.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-neutral-400"><ScrollText className="mx-auto mb-2 h-8 w-8" /> {rows.length === 0 ? "ยังไม่มีบันทึกการใช้งาน" : "ไม่มีรายการในหมวดนี้"}</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={4} className="py-12 text-center text-neutral-400">กำลังโหลด…</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && !done && rows.length > 0 && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
              >
                {loadingMore ? "กำลังโหลด…" : "โหลดเพิ่ม"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
