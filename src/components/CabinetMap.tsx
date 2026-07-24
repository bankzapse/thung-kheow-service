"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Box } from "lucide-react";
import { GOOGLE_MAPS_KEY, loadGoogleMaps, directionsUrl } from "@/lib/googleMaps";

export interface CabinetPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  code?: string;
  address?: string;
  badge?: number; // ตัวเลขบนหมุด เช่น จำนวนถุงรอเก็บ
  badgeLabel?: string; // ข้อความในป๊อปอัป เช่น "3 ถุงรอเก็บ"
  distanceLabel?: string; // เช่น "1.2 กม."
}

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * แผนที่ Google แสดงหมุดตู้ + ป๊อปอัปรายละเอียด
 * ไม่มี API key → fallback เป็นรายการตู้ (ยังกดนำทางได้) เพื่อไม่ให้หน้าพัง
 */
export function CabinetMap({
  pins,
  user,
  zoom = 12,
  height = 340,
  accent = "#16a34a",
}: {
  pins: CabinetPin[];
  user?: { lat: number; lng: number } | null;
  zoom?: number;
  height?: number;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">(
    GOOGLE_MAPS_KEY ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as any).google;

        const center =
          user ??
          (pins.length
            ? { lat: avg(pins.map((p) => p.lat)), lng: avg(pins.map((p) => p.lng)) }
            : { lat: 13.7563, lng: 100.5018 });

        const map = new g.maps.Map(ref.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });

        const info = new g.maps.InfoWindow();
        const bounds = new g.maps.LatLngBounds();

        pins.forEach((p) => {
          const marker = new g.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: p.name,
            label: p.badge && p.badge > 0 ? { text: String(p.badge), color: "#fff", fontSize: "12px", fontWeight: "700" } : undefined,
            icon: pinIcon(g, p.badge && p.badge > 0 ? accent : "#94a3b8"),
          });
          marker.addListener("click", () => {
            info.setContent(popupHtml(p, accent));
            info.open(map, marker);
          });
          bounds.extend({ lat: p.lat, lng: p.lng });
        });

        if (user) {
          new g.maps.Marker({
            position: user,
            map,
            title: "ตำแหน่งของคุณ",
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            },
            zIndex: 999,
          });
          bounds.extend(user);
        }

        // ซูมให้เห็นทุกหมุดพอดี (ถ้ามีมากกว่า 1 จุด)
        if (pins.length + (user ? 1 : 0) > 1) {
          map.fitBounds(bounds, 64);
        }
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, [pins, user, zoom, accent]);

  if (state === "fallback") return <FallbackList pins={pins} />;

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-neutral-200" style={{ height }}>
      <div ref={ref} className="h-full w-full" />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 text-sm text-neutral-400">
          กำลังโหลดแผนที่…
        </div>
      )}
    </div>
  );
}

function FallbackList({ pins }: { pins: CabinetPin[] }) {
  return (
    <div className="space-y-2">
      {!GOOGLE_MAPS_KEY && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
          ยังไม่ได้ตั้ง <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> — แสดงเป็นรายการแทนแผนที่
        </p>
      )}
      {pins.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-neutral-100">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <Box className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-800">{p.name}</p>
            <p className="truncate text-xs text-neutral-400">
              {p.distanceLabel ? `${p.distanceLabel} · ` : ""}
              {p.badgeLabel ? `${p.badgeLabel} · ` : ""}
              {p.address}
            </p>
          </div>
          <a
            href={directionsUrl(p.lat, p.lng, p.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700"
          >
            <Navigation className="mr-0.5 inline h-3.5 w-3.5" /> นำทาง
          </a>
        </div>
      ))}
      {pins.length === 0 && (
        <p className="flex items-center justify-center gap-1 py-8 text-sm text-neutral-400">
          <MapPin className="h-4 w-4" /> ยังไม่มีตู้ในบริเวณนี้
        </p>
      )}
    </div>
  );
}

function popupHtml(p: CabinetPin, accent: string): string {
  const meta = [p.distanceLabel, p.badgeLabel].filter(Boolean).join(" · ");
  return `<div style="font-family:'IBM Plex Sans Thai',sans-serif;min-width:180px;max-width:240px;padding:2px 4px">
    <div style="font-weight:700;color:#153d29;font-size:15px">${esc(p.name)}</div>
    ${p.code ? `<div style="font-family:monospace;color:${accent};font-size:12px;font-weight:600">${esc(p.code)}</div>` : ""}
    ${meta ? `<div style="color:#5b6b60;font-size:12px;margin-top:2px">${esc(meta)}</div>` : ""}
    ${p.address ? `<div style="color:#8a978f;font-size:12px;margin-top:2px">${esc(p.address)}</div>` : ""}
    <a href="${directionsUrl(p.lat, p.lng, p.name)}" target="_blank" rel="noopener"
       style="display:inline-block;margin-top:8px;background:${accent};color:#fff;font-size:13px;font-weight:600;
       padding:6px 12px;border-radius:8px;text-decoration:none">นำทางไปตู้นี้</a>
  </div>`;
}

// หมุดหยดน้ำวาดเอง (SVG path) — สีตามสถานะ
function pinIcon(g: any, color: string) {
  return {
    path: "M0 0 C-7 -12 -14 -19 -14 -30 A14 14 0 1 1 14 -30 C14 -19 7 -12 0 0 Z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1,
    labelOrigin: new g.maps.Point(0, -30),
    anchor: new g.maps.Point(0, 0),
  };
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
