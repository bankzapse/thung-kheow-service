/**
 * โหลด Google Maps JavaScript API ฝั่ง client (โหลดครั้งเดียว ใช้ซ้ำทั้งแอป)
 *
 * ต้องตั้ง NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (browser key — คนละตัวกับ
 * GOOGLE_MAPS_API_KEY ที่ใช้ Distance Matrix ฝั่ง server)
 *   - เปิด "Maps JavaScript API" ใน Google Cloud project
 *   - จำกัด key ด้วย HTTP referrer = โดเมนจริง (thung-kheow.com/*) กัน key รั่ว
 * ไม่ตั้ง key → คอมโพเนนต์แผนที่ fallback เป็นรายการธรรมดา (ดู CabinetMap)
 */
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error("no-key"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const cb = "__tkInitGmaps";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[cb] = () => resolve();
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}` +
      `&language=th&region=TH&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => {
      loaderPromise = null; // ให้ลองใหม่ได้ถ้าเน็ตหลุด
      reject(new Error("script-load-failed"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/** ลิงก์นำทางไป Google Maps (เปิดแอป/เว็บแล้วกดนำทางได้เลย) */
export function directionsUrl(lat: number, lng: number, label?: string): string {
  const dest = label ? `${label} ${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
