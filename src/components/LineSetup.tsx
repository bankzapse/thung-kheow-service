"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { friendlyError } from "@/lib/authError";
import { MIN_AGE } from "@/lib/consent";

/**
 * เข้าใช้ครั้งแรกด้วย LINE — กรอกเบอร์ + ยอมรับเงื่อนไข แล้วเริ่มใช้งานได้เลย (ไม่ต้องใช้ OTP SMS)
 *
 * ทำไมยังขอเบอร์: ใช้โอนเงินตอนแลกคะแนน · ให้ทีมงานติดต่อ (เบอร์นี้ยังไม่ยืนยัน
 * เจ้าของแก้ไข/ยืนยันภายหลังได้) — ถ้าเบอร์ตรงกับบัญชีเดิม ระบบจะให้เข้าด้วยรหัสผ่าน
 * แล้วผูก LINE ในหน้าโปรไฟล์แทน (กันยึดบัญชีคนอื่น)
 */
export function LineSetup({
  accessToken,
  displayName,
  onDone,
  onCancel,
}: {
  accessToken: string;
  displayName?: string;
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (busy) return;
    setErr("");
    const p = phone.trim();
    if (!/^0\d{8,9}$/.test(p.replace(/\D/g, ""))) return setErr("กรอกเบอร์โทรศัพท์ให้ถูกต้อง");
    if (!agreed) return setErr("กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว");
    setBusy(true);
    try {
      const r = await fetch("/api/line/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, phone: p, consent: agreed, name: displayName }),
      });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "เริ่มใช้งานไม่สำเร็จ"));
      await onDone(); // สร้าง/ผูกเสร็จ → ล็อกอินผ่าน LINE อีกครั้งเพื่อรับ session
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06C755] text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-800">
          {displayName ? `สวัสดี ${displayName}` : "เริ่มใช้งาน"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">กรอกเบอร์โทรศัพท์เพื่อเริ่มใช้งาน</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">เบอร์โทรศัพท์</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="input pl-9"
              inputMode="numeric"
              maxLength={10}
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            ใช้สำหรับโอนเงินตอนแลกคะแนน และให้ทีมงานติดต่อ (แก้ไขภายหลังได้)
          </p>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl bg-neutral-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-xs leading-relaxed text-neutral-500">
            ฉันมีอายุ {MIN_AGE} ปีขึ้นไป และได้อ่าน · ยอมรับ{" "}
            <Link href="/terms" target="_blank" className="font-medium text-brand-600 underline">ข้อกำหนดการใช้งาน</Link> และ{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-brand-600 underline">นโยบายความเป็นส่วนตัว</Link>{" "}
            รวมถึงยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตามนโยบายดังกล่าว
          </span>
        </label>

        {err && <p className="text-sm text-red-500">{err}</p>}
        <button className="btn-primary w-full" onClick={submit} disabled={busy || !agreed}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันและเริ่มใช้งาน"}
        </button>
      </div>

      <button className="mt-4 w-full text-xs text-neutral-400" onClick={onCancel}>
        ยกเลิก
      </button>
    </div>
  );
}
