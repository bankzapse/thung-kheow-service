"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import { friendlyError } from "@/lib/authError";
import { MIN_AGE } from "@/lib/consent";

/**
 * เข้าใช้ครั้งแรกด้วย LINE — ยืนยันเบอร์ + ขอความยินยอม ก่อนสร้าง/ผูกบัญชี
 *
 * ทำไมต้องมีเบอร์: ใช้โอนเงินตอนแลกคะแนน · ให้ทีมงานติดต่อ · และเป็นทางกู้บัญชี
 * ถ้าวันหนึ่งเข้า LINE ไม่ได้ · อีกอย่างคือใช้จับคู่กับบัญชีเดิมที่เคยสมัครด้วยเบอร์
 * ไม่งั้นคนเดิมจะได้บัญชีที่สองและคะแนนแตกเป็นสองก้อน
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
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [smsMode, setSmsMode] = useState(true);

  const requestOtp = async () => {
    if (busy) return;
    setErr("");
    const p = phone.trim();
    if (!/^0\d{8,9}$/.test(p.replace(/\D/g, ""))) return setErr("กรอกเบอร์โทรศัพท์ให้ถูกต้อง");
    if (!agreed) return setErr("กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว");
    setBusy(true);
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "ส่งรหัสไม่สำเร็จ"));
      setSmsMode(j.configured !== false); // ไม่ได้ตั้ง SMS OK = โหมดทดลอง กรอกเลขอะไรก็ได้
      setOtpToken(j.token ?? "");
      setStep(2);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy) return;
    setErr("");
    if (smsMode && otp.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    setBusy(true);
    try {
      const r = await fetch("/api/line/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          phone: phone.trim(),
          code: otp.trim(),
          token: otpToken,
          consent: agreed,
          name: displayName,
        }),
      });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "ยืนยันไม่สำเร็จ"));
      await onDone(); // ผูก/สร้างเสร็จ → ล็อกอินผ่าน LINE อีกครั้งเพื่อรับ session
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
          {displayName ? `สวัสดี ${displayName}` : "ยืนยันตัวตน"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {step === 1 ? "ยืนยันเบอร์โทรศัพท์เพื่อเริ่มใช้งาน" : `กรอกรหัสที่ส่งไปยัง ${phone}`}
        </p>
      </div>

      {step === 1 ? (
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
                onKeyDown={(e) => e.key === "Enter" && requestOtp()}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-400">
              ใช้สำหรับโอนเงินตอนแลกคะแนน และกู้บัญชีหากเข้า LINE ไม่ได้
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
          <button className="btn-primary w-full" onClick={requestOtp} disabled={busy || !agreed}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ขอรหัส OTP"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            className="input text-center text-lg tracking-[0.5em]"
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
          />
          {!smsMode && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ระบบยังไม่ได้ตั้งค่าการส่ง SMS — ยืนยันเบอร์ไม่ได้ กรุณาติดต่อผู้ดูแลระบบ
            </p>
          )}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button className="btn-primary w-full" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันและเริ่มใช้งาน"}
          </button>
          <button className="w-full text-xs text-neutral-400" onClick={() => { setStep(1); setOtp(""); setErr(""); }}>
            แก้เบอร์ / ขอรหัสใหม่
          </button>
        </div>
      )}

      <button className="mt-4 w-full text-xs text-neutral-400" onClick={onCancel}>
        ยกเลิก
      </button>
    </div>
  );
}
