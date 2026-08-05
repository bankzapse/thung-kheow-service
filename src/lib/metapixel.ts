/**
 * Meta (Facebook) Pixel — วัดผลโฆษณา
 * ไม่ตั้ง NEXT_PUBLIC_META_PIXEL_ID = ไม่โหลด pixel เลย (พฤติกรรมเดิมทุกอย่าง)
 */
export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
export const metaPixelEnabled = metaPixelId.length > 0;

/** event มาตรฐานที่เราใช้ track (ตั้งเป็น Conversion ในตัวจัดการโฆษณาได้) */
export type PixelEvent = "PageView" | "CompleteRegistration" | "Lead" | "ViewContent" | "Contact";

type Fbq = (action: string, event: string, params?: Record<string, unknown>) => void;

/** ยิง event ไป Meta Pixel (no-op ถ้าไม่ได้ตั้ง ID หรือ pixel ยังไม่โหลด) */
export function trackPixel(event: PixelEvent, params?: Record<string, unknown>): void {
  if (!metaPixelEnabled || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (fbq) fbq("track", event, params);
}
