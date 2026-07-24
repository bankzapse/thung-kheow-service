/** รัศมีค้นหางานของคนขับ (กม.) */
export const RADIUS_KM = 30;

/** รัศมีแสดง "ตู้หย่อนถุงใกล้คุณ" ในหน้าแรกผู้ขาย (กม.) */
export const NEARBY_CABINET_RADIUS_KM = 10;

/** ตำแหน่งฐานเริ่มต้น (กลางกรุงเทพฯ) เมื่อคนขับยังไม่ตั้งตำแหน่ง */
export const DEFAULT_BASE = { lat: 13.7563, lng: 100.5018 };

/** ระยะทางแบบ haversine (กม.) */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

/**
 * ตู้มีพิกัดจริงหรือยัง — ตู้ที่ยังไม่ได้ปักหมุดจะเป็น (0,0) (กลางทะเล)
 * ไทยอยู่ราว lat 6–20, lng 97–106 → พิกัดจริงห่างจาก 0,0 มาก
 */
export function hasGeo(lat?: number | null, lng?: number | null): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat as number) > 1 || Math.abs(lng as number) > 1);
}

/**
 * ลิงก์นำทาง Google Maps — แผนที่ในแอปเป็น OSM ก็จริง แต่ปุ่ม "นำทาง"
 * เปิดแอป Google Maps ให้ผู้ใช้กดนำทางจริง (แค่เปิดลิงก์ ไม่ใช้ API/ไม่ต้อง key)
 */
export function directionsUrl(lat: number, lng: number, label?: string): string {
  const dest = label ? `${label} ${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
