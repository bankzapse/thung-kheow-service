"use client";

import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";
import { cabinetsWithCounts } from "@/lib/selectors";
import { DEFAULT_BASE, distanceKm, formatDistance, directionsUrl, hasGeo } from "@/lib/geo";
import { displayCabinetCode } from "@/lib/types";
import { CabinetMap, type CabinetPin } from "@/components/CabinetMap";
import { MapPin, Box, Navigation } from "lucide-react";

export default function AllCabinetsPage() {
  const { db, currentUser } = useStore();
  const u = currentUser!;
  const base = { lat: u.baseLat ?? DEFAULT_BASE.lat, lng: u.baseLng ?? DEFAULT_BASE.lng };

  // ตู้ทั้งหมดที่ปักหมุดแล้ว (ตัดตู้ปิดซ่อม) เรียงตามระยะจากตำแหน่งฐาน
  const rows = cabinetsWithCounts(db)
    .filter((c) => c.status !== "maintenance" && hasGeo(c.location.lat, c.location.lng))
    .map((c) => ({ c, km: distanceKm(base.lat, base.lng, c.location.lat, c.location.lng) }))
    .sort((a, b) => a.km - b.km);

  const pins: CabinetPin[] = rows.map(({ c, km }) => ({
    id: c.id,
    lat: c.location.lat,
    lng: c.location.lng,
    name: c.name,
    code: displayCabinetCode(c.code),
    address: c.location.address,
    distanceLabel: formatDistance(km),
  }));

  return (
    <div className="pb-24">
      <AppHeader title="ตู้หย่อนถุงทั้งหมด" subtitle={`${rows.length} ตู้ · เรียงตามระยะใกล้คุณ`} back />

      <div className="space-y-4 px-5 py-4">
        {rows.length === 0 ? (
          <div className="card"><EmptyState icon="📍" title="ยังไม่มีตู้ที่ปักหมุด" hint="ตู้จะขึ้นเมื่อบริษัทตั้งพิกัดแล้ว" /></div>
        ) : (
          <>
            <div className="card !p-0 overflow-hidden">
              <CabinetMap pins={pins} user={base} height={340} />
            </div>
            <div className="space-y-2">
              {rows.map(({ c, km }) => (
                <a
                  key={c.id}
                  href={directionsUrl(c.location.lat, c.location.lng, c.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-card ring-1 ring-neutral-100 transition active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Box className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">{c.name}</p>
                    <p className="truncate text-xs text-neutral-400">{c.location.address}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {formatDistance(km)}
                  </span>
                  <Navigation className="h-4 w-4 shrink-0 text-neutral-300" />
                </a>
              ))}
            </div>
            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-neutral-400">
              <MapPin className="h-3.5 w-3.5" /> แตะที่ตู้เพื่อเปิดแผนที่นำทาง
            </p>
          </>
        )}
      </div>
    </div>
  );
}
