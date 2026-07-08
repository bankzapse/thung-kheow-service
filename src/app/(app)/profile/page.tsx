"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Modal } from "@/components/ui";
import { PayoutCard } from "@/components/PayoutCard";
import { pointsOf } from "@/lib/selectors";
import { REDEEM_TIERS } from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { Coins, Phone, Mail, LogOut, Trash2, ShieldAlert, ChevronRight, FileText, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { db, currentUser, logout, deleteAccount } = useStore();
  const u = currentUser!;
  const points = pointsOf(db, u.id);

  const [delOpen, setDelOpen] = useState(false);
  const [delAck, setDelAck] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    await deleteAccount();
    setDeleting(false);
    setDelOpen(false);
  };

  return (
    <div className="pb-24">
      <AppHeader title="โปรไฟล์" subtitle="บัญชี & การตั้งค่า" />

      <div className="space-y-4 px-5 py-4">
        {/* identity */}
        <div className="card flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">{u.name.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-neutral-800">{u.name}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">ผู้ขาย</span>
          </div>
        </div>

        {/* info */}
        <div className="card divide-y divide-neutral-100 !py-1">
          <InfoRow icon={<Phone className="h-4 w-4" />} label="เบอร์โทรศัพท์" value={u.phone || "—"} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="อีเมล" value={u.email || "—"} />
          <InfoRow icon={<Coins className="h-4 w-4" />} label="คะแนนสะสม" value={`${formatBaht(points)} คะแนน`} />
        </div>

        {/* บัญชีรับเงินโอน */}
        <PayoutCard />

        {/* points shortcut */}
        <Link href="/points" className="card flex items-center gap-3 hover:shadow-float">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Coins className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="font-semibold text-neutral-800">คะแนน & แลกเงิน</p>
            <p className="text-xs text-neutral-400">{formatBaht(points)} คะแนน ≈ ฿{formatBaht(points)}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-300" />
        </Link>

        {/* legal links */}
        <div className="card divide-y divide-neutral-100 !py-1">
          <LinkRow href="/terms" icon={<FileText className="h-4 w-4" />} label="ข้อกำหนดการใช้งาน" />
          <LinkRow href="/privacy" icon={<ShieldCheck className="h-4 w-4" />} label="นโยบายความเป็นส่วนตัว" />
          <LinkRow href="/delete-account" icon={<Trash2 className="h-4 w-4" />} label="ขอลบบัญชีและข้อมูล" />
        </div>

        {/* actions */}
        <div className="space-y-2">
          <button onClick={logout} className="btn-outline w-full"><LogOut className="h-4 w-4" /> ออกจากระบบ</button>
          <button onClick={() => { setDelAck(false); setDelOpen(true); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> ลบบัญชีและข้อมูล
          </button>
        </div>
      </div>

      <Modal
        open={delOpen}
        onClose={() => !deleting && setDelOpen(false)}
        title="ลบบัญชีและข้อมูล"
        footer={
          <>
            <button className="btn-outline flex-1" disabled={deleting} onClick={() => setDelOpen(false)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white disabled:opacity-50" disabled={!delAck || deleting} onClick={doDelete}>
              {deleting ? "กำลังลบ…" : "ลบถาวร"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>การลบบัญชีเป็นการถาวร — ข้อมูลบัญชี, ประวัติถุง, <b>คะแนนคงเหลือ ({formatBaht(points)})</b> และประวัติทั้งหมดจะถูกลบและกู้คืนไม่ได้</p>
          </div>
          {points >= REDEEM_TIERS[0].points && (
            <p className="text-xs text-amber-600">คุณมีคะแนนพอแลกเงินได้ — แนะนำแลกเป็นเงินก่อนลบบัญชี</p>
          )}
          <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={delAck} onChange={(e) => setDelAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500" />
            ฉันเข้าใจว่าคะแนนและข้อมูลจะถูกลบถาวร
          </label>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">{icon}</span>
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="ml-auto text-sm font-semibold text-neutral-800">{value}</span>
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">{icon}</span>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-neutral-300" />
    </Link>
  );
}
