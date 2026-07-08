"use client";

import { useMemo, useState } from "react";
import { QRImage } from "@/components/QRImage";
import { bagQr, cabinetFullCode, type Cabinet } from "@/lib/types";
import { Printer, Box } from "lucide-react";

/** พิมพ์ QR ป้ายตู้ + ถุงตาข่าย (ใช้ทั้งฝั่งผู้ดูแลและเจ้าของแฟรนไชส์) */
export function CabinetQrPrint({ cab }: { cab: Cabinet }) {
  const [start, setStart] = useState(1);
  const [count, setCount] = useState(20);
  const full = cabinetFullCode(cab.franchiseCode, cab.code);

  const codes = useMemo(() => {
    const n = Math.min(200, Math.max(1, count));
    return Array.from({ length: n }, (_, i) => String(start + i).padStart(7, "0"));
  }, [start, count]);

  return (
    <div className="space-y-5">
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">พิมพ์ QR — ตู้ {full}</h1>
            <p className="text-sm text-neutral-500">{cab.name} · QR ถุงมีรหัสแฟรนไชส์+ตู้ในตัว (สแกนครั้งเดียว)</p>
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
          <p className="text-sm text-neutral-500">ตัวอย่าง: <span className="font-mono font-semibold text-neutral-700">{bagQr(cab.franchiseCode, cab.code, codes[0])}</span> … {bagQr(cab.franchiseCode, cab.code, codes[codes.length - 1])}</p>
        </div>
      </div>

      <div className="print-area space-y-4">
        <div className="card flex items-center gap-5 break-inside-avoid">
          <QRImage value={full} size={130} className="rounded-lg" />
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600"><Box className="h-4 w-4" /> ป้ายตู้ Drop &amp; Go</p>
            <p className="mt-1 text-3xl font-extrabold text-neutral-800">ตู้ {full}</p>
            <p className="text-sm text-neutral-500">{cab.name}</p>
            <p className="text-xs text-neutral-400">{cab.location.address}</p>
          </div>
        </div>
        <div>
          <p className="section-title no-print mb-2 px-1">ป้ายถุงตาข่าย ({codes.length} ใบ)</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {codes.map((c) => (
              <div key={c} className="flex break-inside-avoid flex-col items-center rounded-xl border border-neutral-200 bg-white p-2">
                <QRImage value={bagQr(cab.franchiseCode, cab.code, c)} size={110} />
                <span className="mt-1 font-mono text-[11px] font-semibold text-neutral-700">{bagQr(cab.franchiseCode, cab.code, c)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
