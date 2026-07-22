"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, CameraOff, CheckCircle2 } from "lucide-react";

/**
 * สแกน QR ด้วยกล้องจริงบนเว็บ/มือถือ (getUserMedia + jsQR — pure JS ไม่มี native dep)
 * - เปิดกล้องหลัง (environment) เต็มจอ, ถอดรหัสจากเฟรมวิดีโอผ่าน canvas
 * - สแกน "ทีละถุง": เจอ QR แรก → ยิง onResult ครั้งเดียว แล้วหยุดกล้อง (parent ปิด modal)
 * - ไม่มีกล้อง/ไม่ได้สิทธิ์ → โชว์ข้อความให้พิมพ์รหัสเอง
 * ต้องรันบน HTTPS (หรือ localhost) — โปรดักชัน Vercel เป็น HTTPS อยู่แล้ว
 */
export function QrScanner({
  open,
  onClose,
  onResult,
  onCameraFail,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  /** เปิดกล้องไม่ได้ (เช่น เว็บวิวบล็อก getUserMedia) → ให้ผู้เรียกสลับไปใช้ทางอื่น */
  onCameraFail?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false); // สแกนได้แล้ว 1 ถุง → ไม่ยิงซ้ำ
  const lastScanRef = useRef(0); // throttle การถอดรหัส
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onCameraFailRef = useRef(onCameraFail);
  onCameraFailRef.current = onCameraFail;

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);
    setFlash(false);
    firedRef.current = false;

    const stopCamera = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    (async () => {
      try {
        const jsQR = (await import("jsqr")).default;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setStarting(false);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        const tick = () => {
          if (cancelled || firedRef.current) return;
          const now = Date.now();
          if (video.readyState >= 2 && video.videoWidth && now - lastScanRef.current >= 120) {
            lastScanRef.current = now;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) {
              // เจอถุงแล้ว → ยิงครั้งเดียว หยุดกล้อง แล้วปิด (สแกนทีละถุง)
              firedRef.current = true;
              setFlash(true);
              stopCamera();
              const text = code.data.trim();
              onResultRef.current(text);
              setTimeout(() => { if (!cancelled) onClose(); }, 400);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        const name = (e as Error)?.name;
        // ผู้ใช้กด "ไม่อนุญาต" เอง = ตั้งใจ อย่าเด้งไปสแกนเนอร์อื่นให้งง
        // แต่ถ้าเว็บวิวไม่รองรับ/ไม่มีกล้อง → ให้ผู้เรียกสลับไปทางอื่นได้ (เช่น สแกนเนอร์ของ LINE)
        const userDenied = name === "NotAllowedError";
        if (!userDenied && onCameraFailRef.current) {
          onCameraFailRef.current();
          return;
        }
        setError(
          userDenied || name === "SecurityError"
            ? "ไม่ได้รับอนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องแล้วลองใหม่ หรือพิมพ์รหัสเอง"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "ไม่พบกล้องบนอุปกรณ์นี้ — พิมพ์รหัสด้วยตนเองแทน"
              : "เปิดกล้องไม่สำเร็จ — พิมพ์รหัสด้วยตนเองแทน",
        );
      }
    })();

    return () => { cancelled = true; stopCamera(); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* กล้อง */}
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline autoPlay muted />

      {/* กรอบเล็ง — มุมล้วน + พื้นที่นอกกรอบมืดลง ให้สายตาโฟกัสในกรอบ (แบบสแกนเนอร์ของ LINE) */}
      {!error && (
        <div className="pointer-events-none absolute inset-0">
          {/* ฉากมืดเจาะรูตรงกลางด้วย box-shadow ขนาดยักษ์ */}
          <div
            className="absolute left-1/2 top-1/2 h-[74vw] max-h-[340px] w-[74vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-2xl transition-shadow"
            style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.55)" }}
          />
          <div className="absolute left-1/2 top-1/2 h-[74vw] max-h-[340px] w-[74vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2">
            {(
              [
                ["-left-px -top-px", "rounded-tl-2xl border-l-[5px] border-t-[5px]"],
                ["-right-px -top-px", "rounded-tr-2xl border-r-[5px] border-t-[5px]"],
                ["-bottom-px -left-px", "rounded-bl-2xl border-b-[5px] border-l-[5px]"],
                ["-bottom-px -right-px", "rounded-br-2xl border-b-[5px] border-r-[5px]"],
              ] as const
            ).map(([pos, shape]) => (
              <span
                key={pos}
                className={`absolute ${pos} ${shape} h-11 w-11 transition-colors ${flash ? "border-brand-400" : "border-white"}`}
              />
            ))}
            {flash && (
              <div className="absolute inset-0 grid place-items-center">
                <CheckCircle2 className="h-20 w-20 text-brand-400 drop-shadow-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ปุ่มปิด — มุมซ้ายบน ตำแหน่งเดียวกับสแกนเนอร์ของ LINE */}
      <div className="relative z-10 flex items-start justify-between p-4">
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white drop-shadow-lg"
        >
          <X className="h-7 w-7" />
        </button>
        {(starting || flash) && (
          <span className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
            {starting ? "กำลังเปิดกล้อง…" : "สแกนสำเร็จ ✓"}
          </span>
        )}
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

      {/* คำแนะนำล่างจอ — ไม่มีปุ่มใหญ่บังกล้อง (ปิดที่กากบาทมุมบน) */}
      {!error && (
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-5">
          <p className="text-center text-base text-white drop-shadow">
            {flash ? "เพิ่มถุงแล้ว" : "เล็งกล้องไปที่ QR บนถุง — ครั้งละ 1 ถุง"}
          </p>
        </div>
      )}
    </div>
  );
}
