"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { X, Loader2, CameraOff, CheckCircle2 } from "lucide-react";

/**
 * สแกน QR ด้วยกล้องจริงบนเว็บ/มือถือ (getUserMedia + @zxing/browser)
 * - เปิดกล้องหลัง (environment) เต็มจอ, สแกนต่อเนื่อง
 * - ยิง onResult ทุกครั้งที่เจอรหัสใหม่ (กันรหัสเดิมซ้ำภายใน 2 วินาที) → หย่อนหลายถุงรวดเดียว
 * - ไม่มีกล้อง/ไม่ได้สิทธิ์ → โชว์ข้อความให้พิมพ์รหัสเอง
 * ต้องรันบน HTTPS (หรือ localhost) — โปรดักชัน Vercel เป็น HTTPS อยู่แล้ว
 */
export function QrScanner({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ text: string; t: number }>({ text: "", t: 0 });
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [flash, setFlash] = useState(false); // เด้ง ✓ ตอนสแกนติด
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);
    setCount(0);
    lastRef.current = { text: "", t: 0 };
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const text = result.getText().trim();
            const now = Date.now();
            // กันรหัสเดิมยิงรัวๆ ระหว่างที่ QR ยังอยู่ในกล้อง
            if (text === lastRef.current.text && now - lastRef.current.t < 2000) return;
            lastRef.current = { text, t: now };
            setCount((c) => c + 1);
            setFlash(true);
            setTimeout(() => setFlash(false), 350);
            onResultRef.current(text);
          },
        );
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setStarting(false);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        const name = (e as Error)?.name;
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "ไม่ได้รับอนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องในเบราว์เซอร์แล้วลองใหม่ หรือพิมพ์รหัสเอง"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "ไม่พบกล้องบนอุปกรณ์นี้ — พิมพ์รหัสด้วยตนเองแทน"
              : "เปิดกล้องไม่สำเร็จ — พิมพ์รหัสด้วยตนเองแทน",
        );
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* กล้อง */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline autoPlay muted />

      {/* overlay กรอบเล็ง */}
      {!error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`relative h-64 w-64 rounded-3xl ring-4 transition-colors ${flash ? "ring-brand-400" : "ring-white/80"}`}>
            <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-3xl border-l-4 border-t-4 border-brand-400" />
            <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-3xl border-r-4 border-t-4 border-brand-400" />
            <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-3xl border-b-4 border-l-4 border-brand-400" />
            <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-3xl border-b-4 border-r-4 border-brand-400" />
            {flash && (
              <div className="absolute inset-0 grid place-items-center">
                <CheckCircle2 className="h-16 w-16 text-brand-400 drop-shadow-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <span className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
          {starting ? "กำลังเปิดกล้อง…" : error ? "สแกน QR" : `สแกนแล้ว ${count} ถุง`}
        </span>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* กำลังเปิดกล้อง */}
      {starting && !error && (
        <div className="absolute inset-0 grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {/* error */}
      {error && (
        <div className="absolute inset-0 grid place-items-center px-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white"><CameraOff className="h-7 w-7" /></div>
            <p className="text-sm text-white/90">{error}</p>
            <button onClick={onClose} className="mt-1 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800">พิมพ์รหัสเอง</button>
          </div>
        </div>
      )}

      {/* bottom actions */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <p className="mb-3 text-center text-sm text-white/80">เล็งกล้องไปที่ QR บนถุง — สแกนได้หลายถุงต่อเนื่อง</p>
        <button onClick={onClose} className="btn-primary w-full !py-3.5 text-base">
          {count > 0 ? `เสร็จ · เพิ่ม ${count} ถุง` : "เสร็จ / ปิดกล้อง"}
        </button>
      </div>
    </div>
  );
}
