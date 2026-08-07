"use client";

import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";
import { luckyDrawConfig, entriesForUser, roundFor, drawnRounds, totalEntries } from "@/lib/luckyDraw";
import { formatBaht, thaiMonthLabel, thaiDate, currentMonth } from "@/lib/utils";
import { Trophy, Ticket, Sparkles, Crown, Gift } from "lucide-react";

export default function RewardsPage() {
  const { db, currentUser } = useStore();
  const u = currentUser!;

  const cfg = luckyDrawConfig(db);
  const month = currentMonth();
  const current = roundFor(cfg, month);
  const past = drawnRounds(cfg);
  const latest = past[0];
  const myEntries = entriesForUser(db, u.id, cfg);
  const totalThisMonth = totalEntries(db, cfg, month);
  const drawn = current?.status === "drawn";

  return (
    <div className="pb-24">
      <AppHeader title={cfg.enabled ? cfg.title : "ชิงโชค"} subtitle="ลุ้นรางวัลจากการหย่อนถุง" />

      <div className="space-y-4 px-5 py-4">
        {!cfg.enabled ? (
          <div className="card">
            <EmptyState icon="🎁" title="ยังไม่มีกิจกรรมชิงโชคตอนนี้" hint="ติดตามกิจกรรมลุ้นโชคเร็ว ๆ นี้ · หย่อนถุงสะสมไว้ก่อนได้เลย" actionLabel="ไปหย่อนถุง" actionHref="/drop" />
          </div>
        ) : (
          <>
            {/* สิทธิ์ของคุณ (hero ทอง) */}
            {u.role === "seller" && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-light via-gold to-gold-dark p-6 text-center text-white shadow-card">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
                <div className="relative">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><Ticket className="h-6 w-6" /></div>
                  <p className="text-5xl font-extrabold tabular-nums">{formatBaht(myEntries)}</p>
                  <p className="mt-1 text-sm text-white/90">สิทธิ์ลุ้นของคุณเดือน{thaiMonthLabel(month)}</p>
                  <p className="mt-2 text-xs text-white/75">ทุกมูลค่า ฿{formatBaht(cfg.bahtPerEntry)} ที่คัดแยกแล้ว = 1 สิทธิ์</p>
                </div>
              </div>
            )}

            {/* ประกาศรายชื่อผู้โชคดี */}
            {latest && (
              <div className="card ring-1 ring-amber-100">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"><Crown className="h-5 w-5" /></span>
                  <div>
                    <p className="font-bold text-neutral-800">🏆 ประกาศรายชื่อผู้โชคดี</p>
                    <p className="text-xs text-neutral-400">ประจำเดือน{thaiMonthLabel(latest.month)}{latest.drawnAt && ` · ประกาศ ${thaiDate(latest.drawnAt)}`}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {latest.winners.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-dark text-xs font-bold text-white">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-800">{w.name}</p>
                        <p className="truncate text-xs text-neutral-500">{w.prizeName}{w.prizeValue > 0 && ` · ฿${formatBaht(w.prizeValue)}`}</p>
                      </div>
                      <Trophy className="h-4 w-4 shrink-0 text-gold-dark" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* รางวัลรอบเดือนนี้ */}
            <div className="card">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold-dark" />
                <p className="font-bold text-neutral-800">ลุ้นรางวัลเดือน{thaiMonthLabel(month)}</p>
                {drawn && <span className="chip bg-brand-100 text-brand-700">ประกาศผลแล้ว</span>}
              </div>
              {current?.prizes.length ? (
                <div className="mt-3 space-y-1.5">
                  {current.prizes.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-100">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-dark"><Trophy className="h-4 w-4" /></span>
                      <span className="flex-1 text-sm font-medium text-neutral-700">{p.name}</span>
                      {p.value > 0 && <span className="text-xs text-neutral-400">฿{formatBaht(p.value)}</span>}
                      {p.qty > 1 && <span className="chip bg-gold/15 text-gold-dark">{p.qty} รางวัล</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-neutral-400">เตรียมพบรางวัลใหญ่เร็ว ๆ นี้</p>
              )}
              <p className="mt-3 text-xs text-neutral-400">มีสิทธิ์ในระบบแล้ว {formatBaht(totalThisMonth)} สิทธิ์ · {drawn ? "ประกาศผลแล้ว" : "ประกาศผลสิ้นเดือน"}</p>
            </div>

            {/* กติกา */}
            <div className="card">
              <p className="mb-3 font-bold text-neutral-800">กติกาการลุ้นรางวัล</p>
              <ol className="space-y-2.5 text-sm text-neutral-600">
                {[
                  `หย่อนถุง & คัดแยกได้มูลค่าทุก ฿${formatBaht(cfg.bahtPerEntry)} รับ 1 สิทธิ์อัตโนมัติ`,
                  `สะสมสิทธิ์ตลอดเดือน (สูงสุด ${formatBaht(cfg.maxEntriesPerMonth)} สิทธิ์/เดือน)`,
                  "รางวัลจะโอน/มอบให้ผู้โชคดีตามเงื่อนไข (หักภาษี ณ ที่จ่าย 5%)",
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-bold text-gold-dark">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>

            {/* ผู้โชคดีย้อนหลัง */}
            {past.length > 0 && (
              <div className="card">
                <div className="mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-gold-dark" />
                  <p className="font-bold text-neutral-800">ผู้โชคดีย้อนหลัง</p>
                </div>
                <div className="space-y-4">
                  {past.map((r) => (
                    <div key={r.month}>
                      <p className="mb-1.5 text-xs font-semibold text-neutral-400">{thaiMonthLabel(r.month)}</p>
                      <div className="divide-y divide-neutral-100">
                        {r.winners.map((w, i) => (
                          <div key={i} className="flex items-center gap-3 py-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold-dark"><Trophy className="h-4 w-4" /></span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-neutral-800">{w.name}</p>
                              <p className="text-xs text-neutral-400">{w.prizeName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
