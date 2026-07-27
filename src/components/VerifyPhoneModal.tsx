"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { friendlyError } from "@/lib/authError";
import { ShieldCheck } from "lucide-react";

/** ยืนยันเบอร์ด้วย OTP (ด่านก่อนถอนเงินครั้งแรก) — ยืนยันเบอร์ปัจจุบันของบัญชี */
export function VerifyPhoneModal({ phone, open, onClose, onVerified }: { phone: string; open: boolean; onClose: () => void; onVerified: () => void }) {
  const { verifyMyPhone } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [smsMode, setSmsMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => { setStep(1); setCode(""); setToken(""); setErr(""); };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const sendOtp = async () => {
    if (busy) return;
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const j = await r.json().catch(() => ({ ok: false }));
      if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "ส่งรหัสไม่สำเร็จ"));
      setSmsMode(j.configured !== false);
      setToken(j.token ?? "");
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
    if (smsMode && code.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    setBusy(true);
    const ok = await verifyMyPhone(phone, code.trim(), token);
    setBusy(false);
    if (ok) { reset(); onVerified(); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="ยืนยันเบอร์โทรศัพท์"
      footer={
        step === 1 ? (
          <>
            <button className="btn-outline flex-1" disabled={busy} onClick={close}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={busy} onClick={sendOtp}>{busy ? "กำลังส่ง…" : "ส่งรหัส OTP"}</button>
          </>
        ) : (
          <>
            <button className="btn-outline flex-1" disabled={busy} onClick={() => { setStep(1); setCode(""); setErr(""); }}>ย้อนกลับ</button>
            <button className="btn-primary flex-1" disabled={busy} onClick={confirm}>{busy ? "กำลังยืนยัน…" : "ยืนยัน"}</button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-800 ring-1 ring-brand-100">
          <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />
          <span>ยืนยันเบอร์ <b>{phone || "—"}</b> ครั้งเดียว เพื่อความปลอดภัยก่อนถอนเงิน</span>
        </div>

        {step === 2 && (
          <>
            <input
              className="input text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="______"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
            />
            {!smsMode && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">ระบบยังไม่ได้ตั้งค่า SMS — ยืนยันด้วย OTP ไม่ได้ กรุณาให้แอดมินยืนยันให้</p>}
          </>
        )}

        {err && <p className="text-sm text-red-500">{err}</p>}
        <p className="text-center text-xs text-neutral-400">
          OTP ไม่เข้า? แจ้งผู้ดูแลให้ยืนยันเบอร์ให้ · เบอร์ไม่ถูก? แก้ที่หน้าโปรไฟล์
        </p>
      </div>
    </Modal>
  );
}
