"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseConfigured } from "@/lib/supabase/config";
import { thaiDateTime } from "@/lib/utils";
import { ArchiveRestore, RefreshCw, ShieldAlert, RotateCcw, UserRoundX } from "lucide-react";

type DeletedAccount = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  deleted_at: string;
};

const roleLabel = (r: string) =>
  r === "seller" ? "ผู้ขาย" : r === "buyer" ? "ศูนย์คัดแยก" : r === "franchise" ? "แฟรนไชส์" : r === "admin" ? "ผู้ดูแล" : r;

async function callApi(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await r.json().catch(() => ({ ok: false, error: "อ่านผลลัพธ์ไม่ได้" }));
  if (!r.ok || j.ok === false) throw new Error(j.error || "ทำรายการไม่สำเร็จ");
  return j;
}

export default function AdminDeletedPage() {
  const [rows, setRows] = useState<DeletedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const j = await callApi("listDeleted");
      setRows((j.accounts ?? []) as DeletedAccount[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    refresh();
  }, [refresh]);

  const restore = async (id: string) => {
    setBusyId(id);
    setError(null);
    setMsg(null);
    try {
      await callApi("restoreAccount", { userId: id });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMsg("กู้คืนบัญชีสำเร็จ — ผู้ใช้ล็อกอินได้อีกครั้ง");
    } catch (e) {
      setError(e instanceof Error ? e.message : "กู้คืนไม่สำเร็จ");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">บัญชีที่ลบแล้ว</h1>
          <p className="text-sm text-neutral-500">บัญชีที่ผู้ใช้กดลบ (soft-delete) — กู้คืนได้ในช่วง grace ก่อนถูกลบถาวรอัตโนมัติ (30 วัน)</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading || !supabaseConfigured}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 ring-1 ring-amber-100">
          <ShieldAlert className="h-5 w-5 shrink-0" /> โหมดสาธิต (ไม่ได้ต่อ Supabase) — ใช้ได้เฉพาะเมื่อเปิดโหมด Supabase จริง
        </div>
      )}

      {supabaseConfigured && (
        <>
          {msg && <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700 ring-1 ring-brand-100">{msg}</div>}
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">{error}</div>}

          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-900/[0.04]">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">ชื่อ</th>
                  <th className="px-4 py-2.5 font-medium">เบอร์</th>
                  <th className="px-4 py-2.5 font-medium">บทบาท</th>
                  <th className="px-4 py-2.5 font-medium">ลบเมื่อ</th>
                  <th className="px-4 py-2.5 text-right font-medium">กู้คืน</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-neutral-800">{r.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{r.phone || "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{roleLabel(r.role)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{thaiDateTime(r.deleted_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {confirmId === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => restore(r.id)}
                            disabled={busyId === r.id}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                          >
                            {busyId === r.id ? "กำลังกู้คืน…" : "ยืนยันกู้คืน"}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100">ยกเลิก</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setConfirmId(r.id); setMsg(null); }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> กู้คืน
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-neutral-400"><UserRoundX className="mx-auto mb-2 h-8 w-8" /> ไม่มีบัญชีที่ถูกลบ</td></tr>
                )}
                {loading && <tr><td colSpan={5} className="py-12 text-center text-neutral-400">กำลังโหลด…</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
            <ArchiveRestore className="h-3.5 w-3.5" /> กู้คืน = ปลด ban + คืนสถานะบัญชี · ผู้ใช้จะล็อกอินได้อีกครั้ง (ข้อมูลเดิมอยู่ครบ)
          </p>
        </>
      )}
    </div>
  );
}
