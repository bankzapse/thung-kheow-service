"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { cabinetsWithCounts } from "@/lib/selectors";
import { cabinetFullCode } from "@/lib/types";
import { MapPin, Box, PackageOpen, Truck, User } from "lucide-react";

const NEAR_FULL = 6;

export default function AdminCollectPage() {
  const { db } = useStore();

  const ownerByFr = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of db.franchises) m.set(f.id, f.ownerName);
    return m;
  }, [db.franchises]);

  // จัดกลุ่มตามจังหวัด → เรียงตู้ตามปริมาณถุงค้าง (มากก่อน)
  const groups = useMemo(() => {
    const cabs = cabinetsWithCounts(db);
    const byProv = new Map<string, typeof cabs>();
    for (const c of cabs) {
      const prov = c.province || "ไม่ระบุจังหวัด";
      if (!byProv.has(prov)) byProv.set(prov, []);
      byProv.get(prov)!.push(c);
    }
    return [...byProv.entries()]
      .map(([province, list]) => ({
        province,
        list: [...list].sort((a, b) => b.pending - a.pending),
        pendingTotal: list.reduce((s, c) => s + c.pending, 0),
      }))
      .sort((a, b) => b.pendingTotal - a.pendingTotal);
  }, [db]);

  const grandPending = groups.reduce((s, g) => s + g.pendingTotal, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">เส้นทางเข้าเก็บของ</h1>
        <p className="text-sm text-neutral-500">ตู้เรียงตามปริมาณถุงค้าง แยกตามจังหวัด — วางแผนเข้าเก็บได้ง่าย · รวม {grandPending} ถุงค้าง</p>
      </div>

      {groups.map((g) => (
        <section key={g.province}>
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <h2 className="font-bold text-neutral-800">{g.province}</h2>
            <span className="chip bg-amber-100 text-amber-700">{g.pendingTotal} ถุงค้าง</span>
            <span className="text-xs text-neutral-400">· {g.list.length} ตู้</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-900/[0.04]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">ตู้</th>
                  <th className="px-4 py-2.5 font-medium">ที่ตั้ง</th>
                  <th className="px-4 py-2.5 font-medium">แฟรนไชส์ / เจ้าของ</th>
                  <th className="px-4 py-2.5 text-right font-medium">ถุงค้าง</th>
                </tr>
              </thead>
              <tbody>
                {g.list.map((c) => {
                  const near = c.pending >= NEAR_FULL;
                  return (
                    <tr key={c.id} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Box className="h-4 w-4" /></span>
                          <span>
                            <span className="block font-medium text-neutral-800">{c.name}</span>
                            <span className="font-mono text-xs text-brand-700">{cabinetFullCode(c.franchiseCode, c.code)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        <span className="block">{c.location.address}</span>
                        {(c.subdistrict || c.district) && <span className="text-xs text-neutral-400">{[c.subdistrict, c.district].filter(Boolean).join(" · ")}</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <span className="font-mono text-xs text-brand-700">{c.franchiseCode}</span>
                        <span className="ml-1 inline-flex items-center gap-1 text-xs text-neutral-400"><User className="h-3 w-3" /> {ownerByFr.get(c.franchiseId) ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`chip ${near ? "bg-red-100 text-red-600" : c.pending > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-400"}`}>
                          {near && <Truck className="h-3.5 w-3.5" />}
                          <PackageOpen className="h-3.5 w-3.5" /> {c.pending}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {groups.length === 0 && <div className="card py-14 text-center text-neutral-400">ยังไม่มีตู้</div>}
    </div>
  );
}
