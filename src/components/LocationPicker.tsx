"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapPin, Search, Loader2 } from "lucide-react";

const BKK = { lat: 13.7563, lng: 100.5018 };

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 39 C6 26 1 21 1 14 A14 14 0 1 1 29 14 C29 21 24 26 15 39 Z" fill="#16a34a" stroke="#fff" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="#fff"/></svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
}

/**
 * ปักหมุดตำแหน่งตู้บนแผนที่ (OSM/Leaflet) — แตะแผนที่หรือลากหมุดเพื่อตั้งพิกัด
 * มีปุ่มค้นหาจากที่อยู่ (Nominatim ฟรี) ช่วยวางหมุดคร่าว ๆ ก่อนลากปรับ
 */
export function LocationPicker({
  value,
  onChange,
  query,
  height = 260,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  query?: string; // ที่อยู่สำหรับปุ่ม "ค้นหาจากที่อยู่"
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [note, setNote] = useState("");

  const place = (lat: number, lng: number, pan = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else {
      const m = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
      m.on("dragend", () => { const p = m.getLatLng(); onChange(p.lat, p.lng); });
      markerRef.current = m;
    }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15));
    onChange(lat, lng);
  };

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const start = value ?? BKK;
    const map = L.map(boxRef.current, { center: [start.lat, start.lng], zoom: value ? 16 : 11 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    if (value) place(value.lat, value.lng);
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // สร้างครั้งเดียว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geocode = async () => {
    const q = (query ?? "").trim();
    if (!q) { setNote("กรอกที่อยู่ก่อน แล้วกดค้นหา"); return; }
    setGeocoding(true); setNote("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "th" } });
      const j = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (j.length) place(parseFloat(j[0].lat), parseFloat(j[0].lon), true);
      else setNote("ไม่พบที่อยู่นี้ — ลากหมุดปักเองได้เลย");
    } catch {
      setNote("ค้นหาไม่สำเร็จ — ลากหมุดปักเองได้เลย");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">ตำแหน่งตู้บนแผนที่ *</label>
        <button type="button" onClick={geocode} disabled={geocoding} className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 disabled:opacity-50">
          {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} ค้นหาจากที่อยู่
        </button>
      </div>
      <div ref={boxRef} className="isolate overflow-hidden rounded-xl ring-1 ring-neutral-200" style={{ height }} />
      <p className="flex items-center gap-1 text-xs text-neutral-400">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {value ? <span className="font-mono">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span> : "แตะแผนที่เพื่อปักหมุดตำแหน่งตู้ (หรือกดค้นหาจากที่อยู่)"}
        {note && <span className="text-amber-600"> · {note}</span>}
      </p>
    </div>
  );
}
