"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_BASE } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Navigation, LoaderCircle } from "lucide-react";

/** ปุ่มตั้ง/อัปเดตตำแหน่งปัจจุบันของผู้ขาย (ใช้ GPS เบราว์เซอร์) → ใช้หาตู้ใกล้ตัว */
export function SetLocationButton({ className }: { className?: string }) {
  const { currentUser, setBaseLocation, pushToast } = useStore();
  const u = currentUser!;
  const [loading, setLoading] = useState(false);

  const update = () => {
    if (!navigator.geolocation) {
      pushToast("อุปกรณ์ไม่รองรับระบุตำแหน่ง", "info");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBaseLocation(p.coords.latitude, p.coords.longitude);
        setLoading(false);
        pushToast("ตั้งตำแหน่งปัจจุบันแล้ว ✓", "success");
      },
      () => {
        setLoading(false);
        pushToast("ระบุตำแหน่งไม่สำเร็จ — เปิดสิทธิ์ตำแหน่งให้เบราว์เซอร์ก่อน", "info");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <button
      onClick={update}
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60",
        className,
      )}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
      {loading ? "กำลังหาตำแหน่ง…" : u.baseLat ? "อัปเดตตำแหน่งปัจจุบัน" : "ใช้ตำแหน่งปัจจุบัน"}
    </button>
  );
}
