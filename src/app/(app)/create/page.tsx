"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { openSlots } from "@/lib/selectors";
import { thaiDateShort, thaiWeekday } from "@/lib/utils";
import { MapPin, Navigation, CalendarClock, Check, Store, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreateJobPage() {
  const router = useRouter();
  const { db, currentUser, createJob } = useStore();
  const u = currentUser!;

  const [address, setAddress] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [contactName, setContactName] = useState(u.name);
  const [contactPhone, setContactPhone] = useState(u.phone);
  const [note, setNote] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<"book" | "open">("book");
  const [slotId, setSlotId] = useState<string>("");
  const [manualDate, setManualDate] = useState("");
  const [err, setErr] = useState("");

  const slots = useMemo(() => openSlots(db), [db]);
  const slotsByDate = useMemo(() => {
    const map = new Map<string, typeof slots>();
    slots.forEach((s) => map.set(s.date, [...(map.get(s.date) || []), s]));
    return [...map.entries()];
  }, [slots]);

  const useCurrentLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      setGeo({ lat: 13.7563, lng: 100.5018 });
      setAddress((a) => a || "ตำแหน่งปัจจุบัน (โดยประมาณ)");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress((a) => a || `พิกัด ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => {
        setGeo({ lat: 13.7563, lng: 100.5018 });
        setAddress((a) => a || "ตำแหน่งปัจจุบัน (โดยประมาณ)");
        setLocating(false);
      },
    );
  };

  const submit = async () => {
    setErr("");
    if (!address.trim()) return setErr("กรุณาระบุที่อยู่/สถานที่รับของ");
    if (!contactName.trim() || !contactPhone.trim()) return setErr("กรุณากรอกผู้ติดต่อและเบอร์โทร");

    let scheduledDate = manualDate;
    let chosenSlotId: string | undefined;

    if (mode === "book") {
      if (!slotId) return setErr("กรุณาเลือกวันเข้ารับจากผู้ซื้อ");
      const s = slots.find((x) => x.id === slotId)!;
      scheduledDate = s.date;
      chosenSlotId = s.id;
    } else {
      if (!scheduledDate) return setErr("กรุณาเลือกวันที่ต้องการให้มารับ");
    }

    const job = await createJob({
      items: [], // ตกลงราคาหน้างานตอนเข้ารับ (ไม่ต้องเลือกของล่วงหน้า)
      location: { lat: geo?.lat ?? 13.7563, lng: geo?.lng ?? 100.5018, address: address.trim() },
      houseNo: houseNo.trim(),
      landmark: landmark.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      scheduledDate,
      note: note.trim() || undefined,
      slotId: chosenSlotId,
    });
    router.replace(`/job/${job.id}`);
  };

  return (
    <div>
      <AppHeader title="สร้างรายการขายของเก่า" back />

      <div className="space-y-4 px-5 py-4">
        {/* 1. location */}
        <Section step={1} title="สถานที่รับของ">
          <button
            onClick={useCurrentLocation}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-300 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700"
          >
            <Navigation className={cn("h-4 w-4", locating && "animate-spin")} />
            {geo ? "อัปเดตตำแหน่งปัจจุบันแล้ว ✓" : "ใช้ตำแหน่งปัจจุบัน"}
          </button>
          {/* map placeholder */}
          <div className="relative mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-neutral-100">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, #16a34a22 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <div className="relative flex flex-col items-center text-brand-700">
              <MapPin className="h-7 w-7" />
              <span className="text-xs">{geo ? `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : "แผนที่ (Google Maps — Phase 2)"}</span>
            </div>
          </div>
          <div className="space-y-2.5">
            <input className="input" placeholder="ที่อยู่ / ถนน / ซอย / แขวง เขต" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input" placeholder="บ้านเลขที่" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
              <input className="input" placeholder="จุดสังเกต" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
          </div>
        </Section>

        {/* 2. contact + schedule */}
        <Section step={2} title="ผู้ติดต่อ & วันเข้ารับ">
          <div className="mb-3 grid grid-cols-2 gap-2.5">
            <input className="input" placeholder="ชื่อผู้ติดต่อ" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <input className="input" inputMode="numeric" placeholder="เบอร์โทร" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>

          <div className="mb-3 flex gap-1 rounded-xl bg-neutral-100 p-1">
            <button
              onClick={() => setMode("book")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium", mode === "book" ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500")}
            >
              <CalendarClock className="h-4 w-4" /> จองวันกับผู้ซื้อ
            </button>
            <button
              onClick={() => setMode("open")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium", mode === "open" ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500")}
            >
              <Radio className="h-4 w-4" /> โพสต์งานเปิด
            </button>
          </div>

          {mode === "book" ? (
            <div className="space-y-3">
              {slotsByDate.length === 0 && <p className="text-sm text-neutral-400">ยังไม่มีรอบว่าง ลองโพสต์เป็นงานเปิดแทน</p>}
              {slotsByDate.map(([date, daySlots]) => (
                <div key={date}>
                  <p className="mb-1.5 text-xs font-semibold text-neutral-500">
                    {thaiWeekday(date)} · {thaiDateShort(date)}
                  </p>
                  <div className="grid gap-2">
                    {daySlots.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSlotId(s.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                          slotId === s.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-neutral-200",
                        )}
                      >
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", slotId === s.id ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-500")}>
                          {slotId === s.id ? <Check className="h-5 w-5" /> : <Store className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-neutral-800">{s.buyerName}</p>
                          <p className="text-xs text-neutral-400">{s.area}</p>
                        </div>
                        <span className="text-xs text-neutral-400">เหลือ {s.capacity - s.booked} คิว</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="label">เลือกวันที่ต้องการให้มารับ</label>
              <input type="date" className="input" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
          )}

          <textarea className="input mt-3 min-h-[64px]" placeholder="หมายเหตุถึงผู้ซื้อ (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
        </Section>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      </div>

      {/* sticky submit */}
      <div className="sticky bottom-0 border-t border-neutral-100 bg-white/95 px-5 py-3 backdrop-blur">
        <p className="mb-2 text-center text-xs text-neutral-400">ไม่ต้องเลือกของล่วงหน้า — ตกลงราคากันหน้างานตอนเข้ารับ</p>
        <button className="btn-primary w-full" onClick={submit}>
          ส่งรายการรับของ
        </button>
      </div>
    </div>
  );
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{step}</span>
        <h2 className="font-bold text-neutral-800">{title}</h2>
        {hint && <span className="text-xs text-neutral-400">· {hint}</span>}
      </div>
      {children}
    </div>
  );
}
