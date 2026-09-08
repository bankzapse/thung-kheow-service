"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { MATERIALS, MATERIAL_MAP } from "@/lib/materials";
import { buyerPrice, billableJobs, creditOf } from "@/lib/selectors";
import { computeSettlement, feeRateLabel, MIN_CREDIT } from "@/lib/fees";
import { PromptPayQR } from "@/components/PromptPayQR";
import { Spinner } from "@/components/ui";
import { formatBaht, thaiDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Store, UserPlus, Save } from "lucide-react";

interface Row {
  materialId: string;
  qty: number;
  price: number;
}

export default function NewBillPage() {
  const router = useRouter();
  const { db, currentUser, createBill } = useStore();
  const u = currentUser!;
  const jobs = billableJobs(db, u.id);

  const [source, setSource] = useState<"walk_in" | "app_job">("walk_in");
  const [jobId, setJobId] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "promptpay">("cash");
  const [rows, setRows] = useState<Row[]>([{ materialId: MATERIALS[0].id, qty: 0, price: buyerPrice(db, u.id, MATERIALS[0].id) }]);
  const [err, setErr] = useState("");

  const selectJob = (id: string) => {
    setJobId(id);
    const job = db.jobs.find((j) => j.id === id);
    if (!job) return;
    setSellerName(job.contactName || job.sellerName);
    setSellerPhone(job.contactPhone || "");
    if (job.items.length > 0) {
      setRows(job.items.map((it) => ({ materialId: it.materialId, qty: it.qty, price: buyerPrice(db, u.id, it.materialId) })));
    }
  };

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { materialId: MATERIALS[0].id, qty: 0, price: buyerPrice(db, u.id, MATERIALS[0].id) }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  // ── ชั่งเร็ว: กด Enter ที่ช่องน้ำหนัก → เด้งไปช่องน้ำหนักแถวถัดไป (ถ้าอยู่แถวสุดท้าย
  //    และกรอกแล้ว จะเพิ่มแถวใหม่ให้อัตโนมัติ) → ชั่งวัสดุทีละอย่างรัว ๆ ไม่ต้องละมือจากคีย์บอร์ด
  // อ่าน input สด ๆ จาก DOM ตอนกด (แทน ref array — กันปัญหา inline-ref identity เปลี่ยนทุก render)
  const rowsRef = useRef<HTMLDivElement>(null);
  const weightInputs = () => Array.from(rowsRef.current?.querySelectorAll<HTMLInputElement>("input[data-weight]") ?? []);
  const focusNextWeight = (el: HTMLInputElement, i: number) => {
    const inputs = weightInputs();
    const next = inputs[inputs.indexOf(el) + 1];
    if (next) { next.focus(); next.select(); return; }
    if (!rows[i].qty) { el.blur(); return; }       // แถวสุดท้ายว่าง → ไม่เพิ่มแถวเปล่า
    addRow();                                        // แถวสุดท้ายกรอกแล้ว → เพิ่มแถวใหม่ + โฟกัส
    requestAnimationFrame(() => weightInputs().at(-1)?.focus());
  };

  const items = rows.map((r) => {
    const m = MATERIAL_MAP[r.materialId];
    return { materialId: r.materialId, name: m.name, unit: m.unit, qty: r.qty, pricePerUnit: r.price, subtotal: r.qty * r.price };
  });
  const goodsTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const st = computeSettlement(goodsTotal);

  const credit = creditOf(db, u.id);

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    setErr("");
    if (credit < MIN_CREDIT) return setErr(`เครดิตไม่พอ (฿${formatBaht(credit)}) — ต้องมี ≥ ฿${MIN_CREDIT} จึงจะออกบิลได้ เติมเครดิตก่อน`);
    const valid = items.filter((i) => i.qty > 0);
    if (source === "app_job" && !jobId) return setErr("กรุณาเลือกงานจากแอป");
    if (source === "walk_in" && !sellerName.trim()) return setErr("กรุณากรอกชื่อผู้ขาย");
    if (valid.length === 0) return setErr("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ (ใส่จำนวน)");
    setSaving(true);
    try {
      const bill = await createBill({
        source,
        jobId: source === "app_job" ? jobId : undefined,
        sellerName: sellerName.trim() || "ลูกค้า",
        sellerPhone: sellerPhone.trim(),
        items: valid,
        paymentMethod: method,
      });
      router.replace(`/shop/bill/${bill.id}`); // ไปหน้าบิลเฉพาะเมื่อสำเร็จ
    } catch {
      setErr("ออกบิลไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSaving(false); // สำเร็จ = redirect ออกไปแล้ว จึงไม่ต้อง reset
    }
  };

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-neutral-800">สร้างบิลรับซื้อ</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* form */}
        <div className="space-y-5">
          {/* source */}
          <div className="card">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSource("walk_in")}
                className={cn("flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold", source === "walk_in" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-500")}
              >
                <UserPlus className="h-4 w-4" /> ลูกค้า walk-in
              </button>
              <button
                onClick={() => setSource("app_job")}
                className={cn("flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold", source === "app_job" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-500")}
              >
                <Store className="h-4 w-4" /> จากงานในแอป ({jobs.length})
              </button>
            </div>

            {source === "app_job" ? (
              <div>
                <label className="label">เลือกงาน</label>
                <select className="input" value={jobId} onChange={(e) => selectJob(e.target.value)}>
                  <option value="">— เลือกงานที่จะออกบิล —</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.code} · {j.contactName} · นัด {thaiDate(j.scheduledDate)}
                    </option>
                  ))}
                </select>
                {jobs.length === 0 && <p className="mt-1 text-xs text-neutral-400">ยังไม่มีงานที่คอนเฟิร์ม/กำลังไปรับ</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input" placeholder="ชื่อผู้ขาย" value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
                <input className="input" inputMode="numeric" placeholder="เบอร์โทร (ไม่บังคับ)" value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} />
              </div>
            )}
          </div>

          {/* items */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-neutral-800">รายการรับซื้อ</h2>
              <button onClick={addRow} className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-semibold text-brand-700">
                <Plus className="h-4 w-4" /> เพิ่มรายการ
              </button>
            </div>
            <p className="mb-2 text-xs text-neutral-400">💡 ชั่งเสร็จ พิมพ์น้ำหนัก (ช่องเขียว) แล้วกด <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-sans text-[11px] text-neutral-600">Enter</kbd> เพื่อไปชั่งวัสดุถัดไป</p>
            <div className="space-y-2" ref={rowsRef}>
              <div className="hidden grid-cols-[1fr_90px_90px_90px_36px] gap-2 px-1 text-xs text-neutral-400 sm:grid">
                <span>วัสดุ</span><span className="text-right">น้ำหนัก/จำนวน</span><span className="text-right">ราคา/หน่วย</span><span className="text-right">รวม</span><span />
              </div>
              {rows.map((r, i) => {
                const m = MATERIAL_MAP[r.materialId];
                return (
                  <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_90px_90px_90px_36px]">
                    <select
                      className="input !py-2 text-sm"
                      value={r.materialId}
                      onChange={(e) => setRow(i, { materialId: e.target.value, price: buyerPrice(db, u.id, e.target.value) })}
                    >
                      {MATERIALS.map((mm) => (
                        <option key={mm.id} value={mm.id}>{mm.emoji} {mm.name}</option>
                      ))}
                    </select>
                    {/* ช่องน้ำหนัก = ฟิลด์หลัก → ทำให้เด่น: ตัวใหญ่/หนา, พื้นเขียวจาง,
                        เด้ง numeric keypad, แตะแล้วเลือกทั้งหมด (พิมพ์ทับง่าย), Enter = แถวถัดไป */}
                    <div className="relative">
                      <input
                        data-weight
                        className="input !py-2 !pr-7 bg-brand-50/50 text-right text-base font-bold text-neutral-800"
                        inputMode="decimal"
                        placeholder="0"
                        value={r.qty || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setRow(i, { qty: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextWeight(e.currentTarget, i); } }}
                        aria-label={`น้ำหนัก/จำนวน (${m.unit})`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-neutral-400">{m.unit}</span>
                    </div>
                    <input
                      className="input !py-2 text-right text-sm"
                      inputMode="numeric"
                      value={r.price || ""}
                      onChange={(e) => setRow(i, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                    />
                    <span className={cn("px-1 text-right text-sm font-bold", r.qty * r.price > 0 ? "text-brand-700" : "text-neutral-300")}>฿{formatBaht(r.qty * r.price)}</span>
                    <button onClick={() => removeRow(i)} disabled={rows.length === 1} className="flex justify-center text-neutral-400 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* payment */}
          <div className="card">
            <label className="label">วิธีชำระเงินให้ผู้ขาย</label>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "transfer", "promptpay"] as const).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setMethod(pm)}
                  className={cn("rounded-xl border-2 py-2.5 text-sm font-semibold", method === pm ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-500")}
                >
                  {pm === "cash" ? "เงินสด" : pm === "transfer" ? "โอนเงิน" : "PromptPay"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* summary */}
        <div>
          <div className="card sticky top-20">
            <h2 className="mb-3 font-bold text-neutral-800">สรุปบิล</h2>
            <div className="space-y-2 text-sm">
              <Line label="ยอดรับซื้อ" value={`฿${formatBaht(st.goods)}`} bold />
              <div className="my-2 border-t border-neutral-100" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-700">ต้องจ่ายผู้ขาย (เต็มจำนวน)</span>
                <span className="text-2xl font-extrabold text-brand-700">฿{formatBaht(st.sellerNet)}</span>
              </div>
              <Line label={`ค่าคอมบริษัท (${feeRateLabel}) · หักจากเครดิต`} value={`−฿${formatBaht(st.fee)}`} tone="amber" />
              <p className="text-xs text-gold-dark">🎟️ ผู้ขายได้ {st.tickets} สิทธิ์ลุ้นรางวัล {source === "walk_in" && "(เฉพาะลูกค้าในแอป)"}</p>
              {method === "promptpay" && sellerPhone.replace(/\D/g, "").length >= 9 && st.sellerNet > 0 && (
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  <PromptPayQR target={sellerPhone} amount={st.sellerNet} size={150} />
                  <p className="mt-1.5 text-center text-xs text-neutral-400">สแกนจ่ายผู้ขายด้วยแอปธนาคาร</p>
                </div>
              )}
            </div>
            {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
            <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4" /> บันทึกบิล & จ่ายเงิน</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "amber" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className={cn(bold ? "font-bold text-neutral-800" : "font-medium", tone === "amber" && "text-amber-600")}>{value}</span>
    </div>
  );
}
