"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { luckyDrawConfig, entriesForUser, roundFor, drawnRounds, totalEntries } from "@/lib/luckyDraw";
import { formatBaht, thaiMonthLabel, thaiDate, currentMonth } from "@/lib/utils";
import { ArrowLeft, Trophy, Ticket, Sparkles, Crown, Gift } from "lucide-react";

export default function RewardsPage() {
  const router = useRouter();
  const { db, currentUser } = useStore();
  const u = currentUser!;

  const cfg = luckyDrawConfig(db);
  const month = currentMonth();
  const current = roundFor(cfg, month);
  const past = drawnRounds(cfg);
  const latest = past[0];
  const myEntries = entriesForUser(db, u.id, cfg);
  const totalThisMonth = totalEntries(db, cfg, month);

  // ระบบปิดอยู่ → ไม่มีกิจกรรม
  if (!cfg.enabled) {
    return (
      <div className="min-h-dvh bg-ink text-white">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/10 bg-ink/90 px-4 backdrop-blur">
          <button onClick={() => router.back()} className="-ml-2 rounded-full p-2 text-white/70 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-bold text-gold-light">ชิงโชค</h1>
        </header>
        <div className="grid min-h-[60vh] place-items-center px-6 text-center">
          <div className="space-y-2 text-white/50">
            <Gift className="mx-auto h-10 w-10 text-white/30" />
            <p className="font-medium text-white/70">ยังไม่มีกิจกรรมชิงโชคตอนนี้</p>
            <p className="text-sm">ติดตามกิจกรรมลุ้นโชคเร็ว ๆ นี้ · หย่อนถุงสะสมไว้ก่อนได้เลย</p>
          </div>
        </div>
      </div>
    );
  }

  const drawn = current?.status === "drawn";

  return (
    <div className="min-h-dvh bg-ink text-white">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-white/10 bg-ink/90 px-4 backdrop-blur">
        <button onClick={() => router.back()} className="-ml-2 rounded-full p-2 text-white/70 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-bold text-gold-light">{cfg.title}</h1>
      </header>

      <div className="space-y-5 px-5 py-5">
        {/* ผลรางวัลล่าสุด */}
        {latest && (
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-ink-soft to-ink p-6 text-center shadow-gold">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
            <div className="relative">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-ink shadow-lg"><Trophy className="h-9 w-9" /></div>
              <p className="text-sm font-medium text-gold-light">ผู้โชคดีประจำเดือน{thaiMonthLabel(latest.month)}</p>
              <div className="mt-3 space-y-1.5">
                {latest.winners.map((w, i) => (
                  <div key={i} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold/10 px-4 py-2 ring-1 ring-gold/30">
                    <Crown className="h-4 w-4 shrink-0 text-gold-light" />
                    <span className="text-sm font-semibold text-gold-light">{w.name}</span>
                    <span className="text-xs text-white/50">· {w.prizeName}</span>
                  </div>
                ))}
              </div>
              {latest.drawnAt && <p className="mt-3 text-xs text-white/30">ประกาศเมื่อ {thaiDate(latest.drawnAt)}</p>}
            </div>
          </div>
        )}

        {/* รอบเดือนนี้ */}
        <div className="rounded-2xl border border-white/10 bg-ink-card p-5">
          <div className="flex items-center gap-2 text-gold-light">
            <Sparkles className="h-5 w-5" />
            <p className="font-bold">ลุ้นรางวัลเดือน{thaiMonthLabel(month)}</p>
          </div>

          {/* รางวัลของรอบ */}
          {current?.prizes.length ? (
            <div className="mt-3 space-y-1.5">
              {current.prizes.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                  <Trophy className="h-4 w-4 shrink-0 text-gold-light" />
                  <span className="flex-1 text-sm text-white/80">{p.name}</span>
                  {p.value > 0 && <span className="text-xs text-white/40">฿{formatBaht(p.value)}</span>}
                  {p.qty > 1 && <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-gold-light">{p.qty} รางวัล</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/50">เตรียมพบรางวัลใหญ่เร็ว ๆ นี้</p>
          )}
          <p className="mt-3 text-xs text-white/40">มีสิทธิ์ในระบบแล้ว {formatBaht(totalThisMonth)} สิทธิ์ · {drawn ? "ประกาศผลแล้ว" : "ประกาศผลสิ้นเดือน"}</p>

          {u.role === "seller" && (
            <div className="mt-4 rounded-xl bg-gradient-to-br from-gold/20 to-transparent p-4 ring-1 ring-gold/20">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-gold-light"><Ticket className="h-4 w-4" /> สิทธิ์ของคุณเดือนนี้</span>
                <span className="text-3xl font-extrabold text-gold-light">{formatBaht(myEntries)}</span>
              </div>
              {myEntries === 0 && <p className="mt-2 text-xs text-white/40">หย่อนถุง & คัดแยกให้ได้มูลค่าเพื่อรับสิทธิ์ (ทุก ฿{formatBaht(cfg.bahtPerEntry)} = 1 สิทธิ์)</p>}
            </div>
          )}
        </div>

        {/* กติกา */}
        <div className="rounded-2xl border border-white/10 bg-ink-card p-5">
          <p className="mb-3 font-bold text-white">กติกาการลุ้นรางวัล</p>
          <ol className="space-y-2.5 text-sm text-white/60">
            {[
              `หย่อนถุง & คัดแยกได้มูลค่าทุก ฿${formatBaht(cfg.bahtPerEntry)} รับ 1 สิทธิ์อัตโนมัติ`,
              `สะสมสิทธิ์ตลอดเดือน (สูงสุด ${formatBaht(cfg.maxEntriesPerMonth)} สิทธิ์/เดือน)`,
              "สิ้นเดือนระบบสุ่มผู้โชคดีแบบถ่วงน้ำหนักตามสิทธิ์",
              "รางวัลจะโอน/มอบให้ผู้โชคดีตามเงื่อนไข (หักภาษี ณ ที่จ่าย 5%)",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[11px] font-bold text-gold-light">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>

        {/* ผู้โชคดีย้อนหลัง */}
        {past.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-ink-card p-5">
            <p className="mb-3 font-bold text-white">ผู้โชคดีย้อนหลัง</p>
            <div className="space-y-3">
              {past.map((r) => (
                <div key={r.month}>
                  <p className="mb-1 text-xs font-semibold text-white/40">{thaiMonthLabel(r.month)}</p>
                  <div className="divide-y divide-white/5">
                    {r.winners.map((w, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold-light"><Trophy className="h-4 w-4" /></span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{w.name}</p>
                          <p className="text-xs text-white/40">{w.prizeName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
