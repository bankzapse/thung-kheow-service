"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";
import { bagsForUser } from "@/lib/selectors";
import { BAG_STATUS_META, MIN_ITEMS_PER_BAG, MAX_BAGS_PER_DROP } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { QrCode, Plus, Trash2, PackagePlus, Box, Coins, ChevronRight, Info } from "lucide-react";

export default function DropPage() {
  const { db, currentUser, dropBags } = useStore();
  const u = currentUser!;
  const myBags = bagsForUser(db, u.id);

  const [cabinet, setCabinet] = useState("");
  const [bagInput, setBagInput] = useState("");
  const [bags, setBags] = useState<string[]>([]);

  // demo: สุ่มรหัสถุง 7 หลัก (production ใช้ liff.scanCodeV2)
  const genBag = () => String(Math.floor(Math.random() * 9_000_000) + 1_000_000);

  const addBag = () => {
    const raw = (bagInput.trim() || genBag());
    const code = raw.split("-").pop()!.replace(/[^0-9]/g, "");
    if (!code) return;
    if (bags.includes(code)) return;
    if (bags.length >= MAX_BAGS_PER_DROP) return;
    setBags((b) => [...b, code]);
    setBagInput("");
  };
  const removeBag = (c: string) => setBags((b) => b.filter((x) => x !== c));

  const confirm = () => {
    dropBags(cabinet, bags);
    setCabinet("");
    setBags([]);
  };

  const cabCode = cabinet.trim().toUpperCase().replace(/^#?(TH-)?/i, "").split("-")[0];
  const cab = db.cabinets.find((c) => c.code === cabCode);
  const canConfirm = !!cab && bags.length > 0;

  return (
    <div className="pb-28">
      <AppHeader title="Drop & Go" subtitle="หย่อนถุง สแกน QR รับคะแนน" back />

      <div className="space-y-4 px-5 py-4">
        {/* step 1: cabinet */}
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
            <h2 className="font-bold text-neutral-800">สแกน QR รหัสตู้</h2>
          </div>
          <div className="relative">
            <input
              className="input pr-12"
              placeholder="รหัสตู้ เช่น AA หรือ #TH-AA-…"
              value={cabinet}
              onChange={(e) => setCabinet(e.target.value)}
            />
            <button
              onClick={() => setCabinet(db.cabinets[0]?.code ?? "AA")}
              aria-label="สแกน"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
          {cab ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <Box className="h-3.5 w-3.5" /> {cab.name} · {cab.location.address}
            </p>
          ) : cabinet.trim() ? (
            <p className="mt-2 text-xs text-red-500">ไม่พบตู้รหัสนี้ — ลองสแกนอีกครั้ง</p>
          ) : null}
        </div>

        {/* step 2: bags */}
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
            <h2 className="font-bold text-neutral-800">สแกน QR บนถุงของคุณ</h2>
          </div>
          <p className="mb-3 text-xs font-medium text-brand-700">
            จำนวนถุง {bags.length} / {MAX_BAGS_PER_DROP} ถุง
          </p>

          {bags.length > 0 && (
            <div className="mb-3 space-y-2">
              {bags.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-100">
                  <PackagePlus className="h-4 w-4 text-brand-600" />
                  <span className="flex-1 font-mono text-sm text-neutral-700">#{("TH")}-{cabCode || "??"}-{c}</span>
                  <button onClick={() => removeBag(c)} className="text-neutral-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              className="input pr-12"
              placeholder="รหัสถุง เช่น 0000001 หรือ #TH-AA-0000001"
              value={bagInput}
              inputMode="numeric"
              onChange={(e) => setBagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBag()}
            />
            <button
              onClick={addBag}
              aria-label="สแกนถุง"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
          <button onClick={addBag} disabled={bags.length >= MAX_BAGS_PER_DROP} className="btn-outline mt-2 w-full">
            <Plus className="h-4 w-4" /> เพิ่มถุง
          </button>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>รับขั้นต่ำ {MIN_ITEMS_PER_BAG} ชิ้น/ถุง · คะแนนจะเข้าหลังทีมงานคัดแยกที่โรงงานเสร็จ · ติดตามสถานะได้ด้านล่าง</p>
          </div>
        </div>

        {/* my bags / status */}
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="section-title">ถุงของฉัน</p>
            <Link href="/points" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
              <Coins className="h-4 w-4" /> คะแนนของฉัน
            </Link>
          </div>
          {myBags.length === 0 ? (
            <div className="card">
              <EmptyState icon="🧺" title="ยังไม่มีถุงที่หย่อน" hint="สแกน QR ตู้ + ถุง แล้วกดยืนยัน" />
            </div>
          ) : (
            <div className="space-y-2">
              {myBags.map((b) => {
                const m = BAG_STATUS_META[b.status];
                return (
                  <div key={b.id} className="card flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Box className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-neutral-800">{b.qr}</p>
                      <p className="text-xs text-neutral-400">{thaiDateTime(b.droppedAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`chip ${m.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
                      </span>
                      {b.status === "credited" && b.points != null && (
                        <p className="mt-1 text-sm font-bold text-brand-700">+{formatBaht(b.points)} คะแนน</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* sticky confirm */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-neutral-100 bg-white/95 px-5 py-3 backdrop-blur">
        <button className="btn-primary w-full" disabled={!canConfirm} onClick={confirm}>
          <ChevronRight className="h-4 w-4" /> ยืนยันหย่อนถุง {bags.length > 0 ? `(${bags.length})` : ""}
        </button>
      </div>
    </div>
  );
}
