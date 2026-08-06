"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { luckyDrawConfig, drawParticipants, totalEntries, roundFor, drawnRounds, withholdingTax, type DrawPrize } from "@/lib/luckyDraw";
import { currentMonth, thaiMonthLabel, formatBaht, thaiDate, uid } from "@/lib/utils";
import { Modal } from "@/components/ui";
import { Gift, Sparkles, Plus, Trash2, Trophy, Crown, Users, Ticket, AlertTriangle, Save, Dices, Coins } from "lucide-react";

type PrizeRow = DrawPrize;

export default function AdminLuckyDrawPage() {
  const { db, setLuckyDrawConfig, setDrawRoundPrizes, drawLuckyWinners } = useStore();
  const cfg = luckyDrawConfig(db);
  const month = currentMonth();
  const round = roundFor(cfg, month);
  const participants = drawParticipants(db, cfg, month);
  const total = totalEntries(db, cfg, month);
  const history = drawnRounds(cfg).filter((r) => r.month !== month || r.status === "drawn");

  // ── ตั้งค่าเงื่อนไข ── (เก็บเป็น string เพื่อให้ลบ/พิมพ์ได้อิสระ ไม่ค้างที่ 0)
  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  const [title, setTitle] = useState(cfg.title);
  const [bahtPerEntry, setBahtPerEntry] = useState(String(cfg.bahtPerEntry));
  const [maxPer, setMaxPer] = useState(String(cfg.maxEntriesPerMonth));
  const perNum = Math.max(1, Math.floor(Number(bahtPerEntry)) || 1);
  const maxNum = Math.max(1, Math.floor(Number(maxPer)) || 1);
  const saveConfig = () => setLuckyDrawConfig({ title: title.trim() || "ลุ้นโชคทุกเดือน", bahtPerEntry: perNum, maxEntriesPerMonth: maxNum });

  // ── จัดการรางวัลของรอบ ──
  const drawn = round?.status === "drawn";
  const [prizes, setPrizes] = useState<PrizeRow[]>(round?.prizes ?? []);
  const addPrize = () => setPrizes((p) => [...p, { id: uid("pz-"), name: "", value: 0, qty: 1 }]);
  const upPrize = (id: string, patch: Partial<PrizeRow>) => setPrizes((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const rmPrize = (id: string) => setPrizes((p) => p.filter((x) => x.id !== id));
  const prizesValid = prizes.length > 0 && prizes.every((p) => p.name.trim() && p.value >= 0 && p.qty >= 1);
  const savePrizes = () => { if (prizesValid) setDrawRoundPrizes(month, prizes.map((p) => ({ ...p, name: p.name.trim(), value: Math.max(0, Math.round(p.value)), qty: Math.max(1, Math.floor(p.qty)) }))); };
  const totalWinners = prizes.reduce((s, p) => s + Math.max(1, Math.floor(p.qty) || 1), 0);

  const [confirmDraw, setConfirmDraw] = useState(false);
  const doDraw = () => { drawLuckyWinners(month); setConfirmDraw(false); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><Gift className="h-6 w-6 text-brand-600" /> ชิงโชค (Lucky Draw)</h1>
        <p className="text-sm text-neutral-500">แจกทอง/บัตรกำนัลจากการสุ่ม · สิทธิ์ลุ้นได้จากมูลค่าถุงที่คัดแยกแล้ว</p>
      </div>

      {/* ⚠️ กฎหมาย */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p>เป็นการ <b>เสี่ยงโชคจริง</b> — ก่อนเปิดใช้ต้อง <b>ขออนุญาตชิงโชค</b> (พ.ร.บ.การพนัน) + <b>แจ้ง สคบ.</b> และ <b>หักภาษี ณ ที่จ่าย 5%</b> ของมูลค่ารางวัล · จับรางวัลควรมีสักขีพยาน + ประกาศผลสาธารณะ</p>
      </div>

      {/* Toggle เปิด-ปิดระบบ */}
      <div className="card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${cfg.enabled ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-400"}`}><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="font-bold text-neutral-800">สถานะระบบชิงโชค</p>
            <p className="text-xs text-neutral-500">{cfg.enabled ? "เปิดอยู่ — ผู้ใช้เห็นกิจกรรม + สะสมสิทธิ์" : "ปิดอยู่ — ซ่อนจากผู้ใช้ทั้งหมด"}</p>
          </div>
        </div>
        <button
          onClick={() => setLuckyDrawConfig({ enabled: !cfg.enabled })}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${cfg.enabled ? "bg-brand-600" : "bg-neutral-300"}`}
          aria-pressed={cfg.enabled}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${cfg.enabled ? "left-7" : "left-1"}`} />
        </button>
      </div>

      {/* เงื่อนไขการได้สิทธิ์ */}
      <div className="card space-y-3">
        <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><Ticket className="h-4 w-4 text-brand-600" /> เงื่อนไขการได้สิทธิ์</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">ชื่อแคมเปญ</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ลุ้นโชคทุกเดือน" />
          </div>
          <div>
            <label className="label">ทุกมูลค่า ฿ = 1 สิทธิ์</label>
            <input className="input" inputMode="numeric" value={bahtPerEntry} onChange={(e) => setBahtPerEntry(onlyDigits(e.target.value))} placeholder="100" />
          </div>
          <div>
            <label className="label">เพดานสิทธิ์/คน/เดือน</label>
            <input className="input" inputMode="numeric" value={maxPer} onChange={(e) => setMaxPer(onlyDigits(e.target.value))} placeholder="300" />
          </div>
        </div>
        <p className="text-xs text-neutral-400">ตัวอย่าง: คัดแยกได้มูลค่า ฿{formatBaht(perNum * 3)} ในเดือน = {3} สิทธิ์ (ทุก ฿{formatBaht(perNum)} = 1 สิทธิ์)</p>
        <button className="btn-primary w-full sm:w-auto" onClick={saveConfig}><Save className="h-4 w-4" /> บันทึกเงื่อนไข</button>
      </div>

      {/* รอบเดือนนี้ */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><Trophy className="h-4 w-4 text-gold-dark" /> รอบเดือน{thaiMonthLabel(month)} {drawn && <span className="chip bg-brand-100 text-brand-700">จับรางวัลแล้ว</span>}</h2>
          <div className="flex gap-2 text-xs">
            <span className="chip bg-neutral-100 text-neutral-600"><Users className="h-3.5 w-3.5" /> {participants.length} คนมีสิทธิ์</span>
            <span className="chip bg-brand-50 text-brand-700"><Ticket className="h-3.5 w-3.5" /> {formatBaht(total)} สิทธิ์รวม</span>
          </div>
        </div>

        {/* รางวัล */}
        {drawn ? (
          <WinnerList round={round!} />
        ) : (
          <>
            <div className="space-y-2">
              {prizes.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 p-2.5 ring-1 ring-neutral-100">
                  <input className="input min-w-[140px] flex-1 !py-2" value={p.name} onChange={(e) => upPrize(p.id, { name: e.target.value })} placeholder="ชื่อรางวัล เช่น ทองคำ 1 สลึง" />
                  <div className="flex items-center gap-1"><span className="text-xs text-neutral-400">฿</span><input className="input w-28 !py-2" inputMode="numeric" value={p.value || ""} onChange={(e) => upPrize(p.id, { value: Number(onlyDigits(e.target.value)) || 0 })} placeholder="มูลค่า" /></div>
                  <div className="flex items-center gap-1"><span className="text-xs text-neutral-400">จำนวน</span><input className="input w-20 !py-2" inputMode="numeric" value={p.qty || ""} onChange={(e) => upPrize(p.id, { qty: Number(onlyDigits(e.target.value)) || 0 })} placeholder="1" /></div>
                  {p.value > 0 && <span className="chip bg-amber-50 text-amber-700" title="ภาษีหัก ณ ที่จ่าย 5%">ภาษี ฿{formatBaht(withholdingTax(p.value))}</span>}
                  <button onClick={() => rmPrize(p.id)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {prizes.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">ยังไม่มีรางวัล — กด “เพิ่มรางวัล”</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline" onClick={addPrize}><Plus className="h-4 w-4" /> เพิ่มรางวัล</button>
              <button className="btn-primary disabled:opacity-50" disabled={!prizesValid} onClick={savePrizes}><Save className="h-4 w-4" /> บันทึกรางวัล</button>
              <button className="btn ml-auto bg-gold-dark text-white hover:opacity-90 disabled:opacity-40" disabled={!round?.prizes.length || participants.length === 0} onClick={() => setConfirmDraw(true)}><Dices className="h-4 w-4" /> จับรางวัล ({totalWinners} รางวัล)</button>
            </div>
            {(!round?.prizes.length || participants.length === 0) && (
              <p className="text-xs text-amber-600">{!round?.prizes.length ? "* กด “บันทึกรางวัล” ก่อนจับ" : "* ยังไม่มีผู้มีสิทธิ์ลุ้นในเดือนนี้"}</p>
            )}
          </>
        )}
      </div>

      {/* ผู้มีสิทธิ์ */}
      {!drawn && participants.length > 0 && (
        <div className="card">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><Users className="h-4 w-4 text-brand-600" /> ผู้มีสิทธิ์ลุ้น ({participants.length})</h2>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.userId} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <span className="text-neutral-700">{p.name}</span>
                <span className="flex items-center gap-1 font-semibold text-brand-700"><Ticket className="h-3.5 w-3.5" /> {formatBaht(p.entries)} สิทธิ์</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ประวัติ */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><Crown className="h-4 w-4 text-gold-dark" /> ประวัติผู้โชคดี</h2>
          <div className="space-y-4">
            {history.map((r) => (
              <div key={r.month}>
                <p className="mb-1.5 text-sm font-semibold text-neutral-600">{thaiMonthLabel(r.month)} {r.drawnAt && <span className="text-xs font-normal text-neutral-400">· จับเมื่อ {thaiDate(r.drawnAt)}</span>}</p>
                <WinnerList round={r} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ยืนยันจับรางวัล */}
      <Modal
        open={confirmDraw}
        onClose={() => setConfirmDraw(false)}
        title="ยืนยันจับรางวัล"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setConfirmDraw(false)}>ยกเลิก</button>
            <button className="btn flex-1 bg-gold-dark text-white hover:opacity-90" onClick={doDraw}><Dices className="h-4 w-4" /> จับรางวัลเลย</button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 text-sm text-neutral-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p>สุ่มผู้โชคดี <b>{totalWinners} รางวัล</b> จากผู้มีสิทธิ์ <b>{participants.length} คน</b> ({formatBaht(total)} สิทธิ์) แบบถ่วงน้ำหนักตามสิทธิ์ · <span className="text-red-500">จับแล้วปิดรอบ แก้ไม่ได้</span> — ควรทำต่อหน้าสักขีพยานเพื่อเป็นหลักฐาน</p>
        </div>
      </Modal>
    </div>
  );
}

function WinnerList({ round, compact }: { round: { winners: { prizeId: string; prizeName: string; prizeValue: number; name: string; entries: number }[] }; compact?: boolean }) {
  if (!round.winners.length) return <p className="py-4 text-center text-sm text-neutral-400">ไม่มีผู้โชคดี</p>;
  return (
    <div className="space-y-1.5">
      {round.winners.map((w, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-gold/10 to-transparent px-3 py-2.5 ring-1 ring-gold/20">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/20 text-gold-dark"><Trophy className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-neutral-800">{w.name}</p>
            <p className="truncate text-xs text-neutral-500">{w.prizeName} {w.prizeValue > 0 && `· ฿${formatBaht(w.prizeValue)}`}</p>
          </div>
          {!compact && <span className="flex items-center gap-1 text-xs text-neutral-400"><Coins className="h-3 w-3" /> {formatBaht(w.entries)} สิทธิ์</span>}
        </div>
      ))}
    </div>
  );
}
