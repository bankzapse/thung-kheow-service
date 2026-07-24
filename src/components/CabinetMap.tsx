"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { directionsUrl } from "@/lib/geo";

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

const BKK = { lat: 13.7563, lng: 100.5018 };

/**
 * แผนที่ตู้ด้วย OpenStreetMap + Leaflet — ฟรี ไม่ต้อง API key/บัตร
 * หมุดโชว์ตัวเลข (จำนวนถุง) + ป๊อปอัปรายละเอียด + ปุ่มนำทาง (เปิด Google Maps)
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
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // ลายเซ็นข้อมูล — ให้ effect รันใหม่เฉพาะตอนข้อมูลจริงเปลี่ยน (ไม่ใช่ทุก render)
  const sig = useMemo(
    () =>
      JSON.stringify(pins.map((p) => [p.id, p.lat, p.lng, p.badge ?? 0])) +
      "|" +
      (user ? `${user.lat},${user.lng}` : ""),
    [pins, user],
  );

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = L.map(boxRef.current, { attributionControl: true, zoomControl: true }).setView(
      [user?.lat ?? BKK.lat, user?.lng ?? BKK.lng],
      zoom,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // สร้างครั้งเดียว — ตำแหน่ง/หมุดอัปเดตใน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // วางหมุดใหม่เมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    pins.forEach((p) => {
      L.marker([p.lat, p.lng], { icon: pinIcon(pinColor(p.badge), p.badge) })
        .bindPopup(popupHtml(p, accent))
        .addTo(layer);
      bounds.extend([p.lat, p.lng]);
    });

    if (user) {
      L.marker([user.lat, user.lng], { icon: userIcon(), zIndexOffset: 1000 })
        .bindPopup("ตำแหน่งของคุณ")
        .addTo(layer);
      bounds.extend([user.lat, user.lng]);
    }

    // จัด view หลังวัดขนาด container ใหม่ — ถ้า fitBounds ตอน container ยังไม่มี
    // ขนาดจริง (เพิ่ง mount) หมุดจะไปโผล่นอกจอ → invalidateSize ก่อนแล้วค่อย fit
    const applyView = () => {
      map.invalidateSize();
      if (pins.length + (user ? 1 : 0) > 1) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      } else if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], zoom);
      }
    };
    setTimeout(applyView, 0);
  }, [sig, accent, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={boxRef} className="overflow-hidden rounded-2xl ring-1 ring-neutral-200" style={{ height }} />;
}

/**
 * สีหมุดตามจำนวนถุงรอเก็บ (badge)
 *   ว่าง 0 ถุง → แดง · มีถุงรอเก็บ → ส้ม · ไม่มีตัวเลข (แผนที่ผู้ขาย) → เขียว
 */
function pinColor(badge?: number): string {
  if (badge == null) return "#16a34a"; // เขียว — แผนที่ตู้ใกล้ฉัน (ไม่นับถุง)
  return badge > 0 ? "#f59e0b" : "#dc2626"; // ส้ม = มีถุง · แดง = ว่าง
}

/** หมุดหยดน้ำ SVG + ตัวเลขตรงกลาง (divIcon = ไม่ต้องพึ่งไฟล์รูปของ Leaflet) */
function pinIcon(color: string, badge?: number) {
  // โชว์ตัวเลขเมื่อมี badge (รวม 0 ด้วย) · แผนที่ผู้ขาย (badge undefined) ไม่โชว์เลข
  const label = badge != null ? `<text x="15" y="15" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="sans-serif">${badge}</text>` : "";
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 39 C6 26 1 21 1 14 A14 14 0 1 1 29 14 C29 21 24 26 15 39 Z" fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="15" cy="14" r="9" fill="rgba(255,255,255,0.18)"/>${label}</svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

function userIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="#2563eb" stroke="#fff" stroke-width="3"/></svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function popupHtml(p: CabinetPin, accent: string): string {
  const meta = [p.distanceLabel, p.badgeLabel].filter(Boolean).join(" · ");
  return `<div style="font-family:'IBM Plex Sans Thai',sans-serif;min-width:170px;max-width:230px">
    <div style="font-weight:700;color:#153d29;font-size:15px">${esc(p.name)}</div>
    ${p.code ? `<div style="font-family:monospace;color:${accent};font-size:12px;font-weight:600">${esc(p.code)}</div>` : ""}
    ${meta ? `<div style="color:#5b6b60;font-size:12px;margin-top:2px">${esc(meta)}</div>` : ""}
    ${p.address ? `<div style="color:#8a978f;font-size:12px;margin-top:2px">${esc(p.address)}</div>` : ""}
    <a href="${directionsUrl(p.lat, p.lng, p.name)}" target="_blank" rel="noopener"
       style="display:inline-block;margin-top:8px;background:${accent};color:#fff;font-size:13px;font-weight:600;
       padding:6px 12px;border-radius:8px;text-decoration:none">นำทางไปตู้นี้</a>
  </div>`;
}
