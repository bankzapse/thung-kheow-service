"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";
import { bagsForUser } from "@/lib/selectors";
import { BAG_STATUS_META, MIN_ITEMS_PER_BAG, MAX_BAGS_PER_DROP, parseBagQr, bagQr, cabinetFullCode } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { liffConfigured, scanQr } from "@/lib/liff";
import { QrCode, Plus, Trash2, PackagePlus, Box, Coins, ChevronRight, Info, ScanLine } from "lucide-react";

export default function DropPage() {
  const { db, currentUser, dropBags } = useStore();
  const u = currentUser!;
  const myBags = bagsForUser(db, u.id);

  const [franchise, setFranchise] = useState(""); // อักษรย่อแฟรนไชส์ (auto จาก QR)
  const [cabinet, setCabinet] = useState("");     // รหัสตู้ (auto จาก QR)
  const [bags, setBags] = useState<string[]>([]); // รหัสถุง
  const [manual, setManual] = useState("");

  const genBag = () => String(Math.floor(Math.random() * 9_000_000) + 1_000_000);

  const addBagCode = (bag: string) =>
    setBags((b) => (!bag || b.includes(bag) || b.length >= MAX_BAGS_PER_DROP ? b : [...b, bag]));

  // รับสตริงจาก QR/พิมพ์เอง → แยกแฟรนไชส์+ตู้+ถุง (GLN-AA-0000001)
  const handleCode = (raw: string) => {
    const { franchise: f, cabinet: c, bag } = parseBagQr(raw);
    if (f) setFranchise(f);
    if (c) setCabinet(c);
    if (bag) addBagCode(bag);
    setManual("");
  };

  const scan = async () => {
    if (liffConfigured) {
      const v = await scanQr();
      if (v) { handleCode(v); return; }
    }
    // เดโม/เว็บ: เติมตัวอย่าง (ตู้แรก + เลขสุ่ม)
    const first = db.cabinets[0];
    setFranchise(franchise || first?.franchiseCode || "");
    setCabinet(cabinet || first?.code || "AA");
    addBagCode(genBag());
  };

  const addManual = () => {
    if (!manual.trim()) return;
    handleCode(manual.trim());
  };
  const removeBag = (c: string) => setBags((b) => b.filter((x) => x !== c));

  const confirm = () => {
    dropBags(franchise, cabinet, bags);
    setFranchise("");
    setCabinet("");
    setBags([]);
  };

  const cab = db.cabinets.find((c) => c.code === cabinet.toUpperCase() && (!franchise || c.franchiseCode === franchise.toUpperCase()));
  const canConfirm = !!cab && bags.length > 0;

  return (
    <div className="pb-28">
      <AppHeader title="Drop & Go" subtitle="สแกน QR บนถุง รับคะแนน" back />

      <div className="space-y-4 px-5 py-4">
        {/* scan */}
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              <ScanLine className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-bold text-neutral-800">สแกน QR บนถุง</h2>
            <span className="ml-auto text-xs font-medium text-brand-700">{bags.length} / {MAX_BAGS_PER_DROP}</span>
          </div>
          <p className="mb-3 text-xs text-neutral-400">รหัสเดียวมีทั้งแฟรนไชส์ ตู้ และถุง (เช่น <span className="font-mono">GLN-AA-0000001</span>) — สแกนครั้งเดียวจบ</p>

          {/* detected cabinet */}
          {cab ? (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm ring-1 ring-brand-100">
              <Box className="h-4 w-4 text-brand-600" />
              <span className="font-mono font-semibold text-brand-800">{cabinetFullCode(cab.franchiseCode, cab.code)}</span>
              <span className="truncate text-brand-700/70">· {cab.name}</span>
            </div>
          ) : cabinet ? (
            <p className="mb-3 text-xs text-red-500">ไม่พบตู้ {cabinetFullCode(franchise, cabinet)}</p>
          ) : null}

          {/* bag chips */}
          {bags.length > 0 && (
            <div className="mb-3 space-y-2">
              {bags.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-100">
                  <PackagePlus className="h-4 w-4 text-brand-600" />
                  <span className="flex-1 font-mono text-sm text-neutral-700">{bagQr(franchise || cab?.franchiseCode || "", cabinet || "??", c)}</span>
                  <button onClick={() => removeBag(c)} className="text-neutral-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* big scan button */}
          <button onClick={scan} disabled={bags.length >= MAX_BAGS_PER_DROP} className="btn-primary w-full !py-3.5 text-base">
            <QrCode className="h-5 w-5" /> สแกน QR ถุง
          </button>

          {/* manual fallback */}
          <div className="relative mt-2">
            <input
              className="input pr-20 text-sm"
              placeholder="หรือพิมพ์รหัส เช่น GLN-AA-0000001"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManual()}
            />
            <button onClick={addManual} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
              <Plus className="inline h-3.5 w-3.5" /> เพิ่ม
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>รับขั้นต่ำ {MIN_ITEMS_PER_BAG} ชิ้น/ถุง · คะแนนจะเข้าหลังทีมงานคัดแยกที่โรงงานเสร็จ · ติดตามสถานะได้ด้านล่าง</p>
          </div>
        </div>

        {/* my bags */}
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="section-title">ถุงของฉัน</p>
            <Link href="/points" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
              <Coins className="h-4 w-4" /> คะแนนของฉัน
            </Link>
          </div>
          {myBags.length === 0 ? (
            <div className="card">
              <EmptyState icon="🧺" title="ยังไม่มีถุงที่หย่อน" hint="สแกน QR บนถุง แล้วกดยืนยัน" />
            </div>
          ) : (
            <div className="space-y-2">
              {myBags.map((b) => {
                const m = BAG_STATUS_META[b.status];
                return (
                  <div key={b.id} className="card flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Box className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-neutral-800">{b.qr}</p>
                      <p className="text-xs text-neutral-400">{thaiDateTime(b.droppedAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`chip ${m.color}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}</span>
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
