"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { QRImage } from "@/components/QRImage";
import { bagQr } from "@/lib/types";
import { ArrowLeft, Printer, Box } from "lucide-react";

export default function CabinetQrPage() {
  const { id } = useParams<{ id: string }>();
  const { db } = useStore();
  const cab = db.cabinets.find((c) => c.code === id || c.id === id);

  const [start, setStart] = useState(1);
  const [count, setCount] = useState(20);

  const codes = useMemo(() => {
    const n = Math.min(200, Math.max(1, count));
    return Array.from({ length: n }, (_, i) => String(start + i).padStart(7, "0"));
  }, [start, count]);

  if (!cab) {
    return (
      <div className="space-y-4">
        <Link href="/shop/cabinets" className="inline-flex items-center gap-1 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        <p className="py-16 text-center text-neutral-400">ไม่พบตู้นี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* controls */}
      <div className="no-print space-y-4">
        <Link href={`/shop/cabinets/${cab.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับตู้ {cab.code}</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">พิมพ์ QR — ตู้ {cab.code}</h1>
            <p className="text-sm text-neutral-500">{cab.name} · QR ถุงมีรหัสตู้ในตัว (สแกนครั้งเดียว)</p>
          </div>
          <button onClick={() => window.print()} className="btn-primary !px-4 !py-2.5 text-sm">
            <Printer className="h-4 w-4" /> พิมพ์
          </button>
        </div>
        <div className="card flex flex-wrap items-end gap-4">
          <div>
            <label className="label">เลขถุงเริ่มต้น</label>
            <input className="input w-32" inputMode="numeric" value={start} onChange={(e) => setStart(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} />
          </div>
          <div>
            <label className="label">จำนวนถุง (สูงสุด 200)</label>
            <input className="input w-32" inputMode="numeric" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} />
          </div>
          <p className="text-sm text-neutral-500">ตัวอย่าง: <span className="font-mono font-semibold text-neutral-700">{bagQr(cab.code, codes[0])}</span> … {bagQr(cab.code, codes[codes.length - 1])}</p>
        </div>
      </div>

      {/* printable area */}
      <div className="print-area space-y-4">
        {/* cabinet signboard QR */}
        <div className="card flex items-center gap-5 break-inside-avoid">
          <QRImage value={cab.code} size={130} className="rounded-lg" />
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600"><Box className="h-4 w-4" /> ป้ายตู้ Drop &amp; Go</p>
            <p className="mt-1 text-3xl font-extrabold text-neutral-800">ตู้ {cab.code}</p>
            <p className="text-sm text-neutral-500">{cab.name}</p>
            <p className="text-xs text-neutral-400">{cab.location.address}</p>
          </div>
        </div>

        {/* bag labels grid */}
        <div>
          <p className="section-title no-print mb-2 px-1">ป้ายถุงตาข่าย ({codes.length} ใบ)</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {codes.map((c) => (
              <div key={c} className="flex break-inside-avoid flex-col items-center rounded-xl border border-neutral-200 bg-white p-2">
                <QRImage value={bagQr(cab.code, c)} size={110} />
                <span className="mt-1 font-mono text-[11px] font-semibold text-neutral-700">{bagQr(cab.code, c)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
