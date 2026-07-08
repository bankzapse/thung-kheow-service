"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { bagsForCabinet } from "@/lib/selectors";
import { MATERIALS, MATERIAL_MAP } from "@/lib/materials";
import { BAG_STATUS_META, POINTS_PER_BAHT } from "@/lib/types";
import type { MeshBag, BagItem } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { ArrowLeft, Box, Coins, Scale, PackageOpen, CheckCircle2, Trophy } from "lucide-react";

export default function CabinetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { db, valueBag, startSorting } = useStore();
  const cab = db.cabinets.find((c) => c.id === id);
  const bags = cab ? bagsForCabinet(db, cab.id) : [];

  const [valuing, setValuing] = useState<MeshBag | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  if (!cab) {
    return (
      <div className="space-y-4">
        <Link href="/shop/cabinets" className="inline-flex items-center gap-1 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        <p className="py-16 text-center text-neutral-400">ไม่พบตู้นี้</p>
      </div>
    );
  }

  const openValue = (b: MeshBag) => {
    setValuing(b);
    setQty({});
    if (b.status === "dropped") startSorting(b.id);
  };

  const items: BagItem[] = MATERIALS.filter((m) => (qty[m.id] || 0) > 0).map((m) => ({
    materialId: m.id, name: m.name, qty: qty[m.id], pricePerUnit: m.pricePerUnit, subtotal: Math.round(m.pricePerUnit * qty[m.id]),
  }));
  const value = items.reduce((s, i) => s + i.subtotal, 0);
  const points = value * POINTS_PER_BAHT;

  const confirm = () => {
    if (!valuing || items.length === 0) return;
    valueBag(valuing.id, items);
    setValuing(null);
  };

  const pending = bags.filter((b) => b.status !== "credited");
  const credited = bags.filter((b) => b.status === "credited");

  return (
    <div className="space-y-5">
      <Link href="/shop/cabinets" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500"><ArrowLeft className="h-4 w-4" /> ตู้ทั้งหมด</Link>

      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700"><Box className="h-7 w-7" /></span>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">{cab.name}</h1>
          <p className="text-sm text-neutral-500">รหัส {cab.code} · {cab.location.address}</p>
        </div>
      </div>

      {/* pending queue */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-800"><PackageOpen className="h-4 w-4 text-amber-500" /> ถุงรอคัดแยก ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="card text-center text-sm text-neutral-400">ไม่มีถุงค้าง 🎉</div>
        ) : (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                  <th className="px-4 py-3 font-medium">รหัสถุง</th>
                  <th className="px-4 py-3 font-medium">คนทิ้ง</th>
                  <th className="px-4 py-3 font-medium">หย่อนเมื่อ</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((b) => {
                  const m = BAG_STATUS_META[b.status];
                  return (
                    <tr key={b.id} className="border-b border-neutral-50">
                      <td className="px-4 py-3 font-mono text-neutral-700">{b.qr}</td>
                      <td className="px-4 py-3 text-neutral-600">{b.userName}</td>
                      <td className="px-4 py-3 text-neutral-500">{thaiDateTime(b.droppedAt)}</td>
                      <td className="px-4 py-3"><span className={`chip ${m.color}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openValue(b)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <Scale className="h-3.5 w-3.5" /> ตีราคา
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* credited history */}
      {credited.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-800"><CheckCircle2 className="h-4 w-4 text-brand-600" /> ให้คะแนนแล้ว ({credited.length})</h2>
          <div className="card divide-y divide-neutral-100 !py-1">
            {credited.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"><Box className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-neutral-700">{b.qr}</p>
                  <p className="text-xs text-neutral-400">{b.userName} · {b.creditedAt ? thaiDateTime(b.creditedAt) : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-800">฿{formatBaht(b.valueBaht ?? 0)}</p>
                  <p className="flex items-center justify-end gap-1 text-xs font-medium text-brand-600"><Trophy className="h-3 w-3" /> {formatBaht(b.points ?? 0)} คะแนน</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* valuation modal */}
      <Modal
        open={!!valuing}
        onClose={() => setValuing(null)}
        title={`ตีราคาถุง ${valuing?.qr ?? ""}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setValuing(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={items.length === 0} onClick={confirm}>ยืนยัน + ให้คะแนน</button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">กรอกน้ำหนัก (กก.) ของแต่ละวัสดุที่คัดแยกได้จากถุงนี้</p>
          {MATERIALS.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-base">{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-700">{m.name}</p>
                <p className="text-[11px] text-neutral-400">฿{formatBaht(m.pricePerUnit)}/กก.</p>
              </div>
              <div className="relative w-24">
                <input
                  className="input !py-1.5 pr-8 text-right text-sm font-bold"
                  inputMode="decimal"
                  value={qty[m.id] ? String(qty[m.id]) : ""}
                  onChange={(e) => setQty((q) => ({ ...q, [m.id]: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">กก.</span>
              </div>
            </div>
          ))}
          <div className="mt-2 space-y-1.5 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">มูลค่ารวม</span>
              <span className="font-bold text-neutral-800">฿{formatBaht(value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-semibold text-brand-700"><Coins className="h-4 w-4" /> คะแนนที่ให้คนทิ้ง</span>
              <span className="text-xl font-extrabold text-brand-700">{formatBaht(points)}</span>
            </div>
            <p className="text-[11px] text-neutral-400">อัตรา {POINTS_PER_BAHT} คะแนน = ฿1</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
