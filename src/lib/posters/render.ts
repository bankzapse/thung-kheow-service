import { fontFaceCssEmbedded } from "./fonts";
import type { BuiltSvg } from "./types";

/** สร้าง QR เป็น data URI (ใช้ในเบราว์เซอร์) */
export async function qrDataUri(text: string, dark = "#0f3d24"): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, { margin: 0, width: 700, errorCorrectionLevel: "M", color: { dark, light: "#ffffff" } });
}

/** โหลดรูป (URL หรือ blob) → data URI สำหรับฝังใน SVG ตอน export */
export async function toDataUri(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

const b64utf8 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

/** โหลดฟอนต์ที่ใช้เข้า document.fonts ให้ decode พร้อมก่อน rasterize (กันตกเป็น serif) */
async function awaitFonts(families: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const weights = ["400", "600", "700"];
  await Promise.all(families.flatMap((f) => weights.map((w) => document.fonts.load(`${w} 64px "${f}"`).catch(() => []))));
  await document.fonts.ready;
}

/** แปลง SVG (ฝังฟอนต์ base64 ให้แล้ว) → canvas ที่ความกว้างเป้าหมาย */
async function svgToCanvas(svg: string, targetW: number, vbW: number, vbH: number): Promise<HTMLCanvasElement> {
  const targetH = Math.round((targetW * vbH) / vbW);
  const url = "data:image/svg+xml;base64," + b64utf8(svg);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("โหลด SVG ไม่สำเร็จ"));
    img.src = url;
  });
  // เว้น 1 เฟรม ให้เบราว์เซอร์เตรียมฟอนต์ที่ฝังก่อนวาด (คู่กับ awaitFonts ที่ preload ไว้แล้ว)
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas;
}

/** ฝังฟอนต์ + rasterize เป็น PNG blob (trim) */
export async function renderPng(built: BuiltSvg, fontFamilies: string[], targetW: number): Promise<Blob> {
  await awaitFonts(fontFamilies);
  const fontCss = await fontFaceCssEmbedded(fontFamilies);
  const svg = built.svg.replace("</defs>", `<style>${fontCss}</style></defs>`);
  const canvas = await svgToCanvas(svg, targetW, built.width, built.height);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** ห่อ canvas ด้วย bleed 3mm (ยืดขอบ) + crop marks → PNG blob สำหรับส่งโรงพิมพ์ */
export async function renderPrintBleedPng(built: BuiltSvg, fontFamilies: string[], targetW: number, physWidthMm: number): Promise<Blob> {
  await awaitFonts(fontFamilies);
  const fontCss = await fontFaceCssEmbedded(fontFamilies);
  const svg = built.svg.replace("</defs>", `<style>${fontCss}</style></defs>`);
  const trim = await svgToCanvas(svg, targetW, built.width, built.height);
  const TW = trim.width;
  const TH = trim.height;

  const pxPerMm = targetW / physWidthMm;
  const mm = (v: number) => Math.round(v * pxPerMm);
  const BLEED = mm(3);
  const MARK = mm(3);
  const PAD = mm(1.5);
  const EXTRA = BLEED + MARK + PAD;
  const CW = TW + 2 * EXTRA;
  const CH = TH + 2 * EXTRA;

  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);
  // bleed: ยืดขอบด้วยการวาดภาพขยายจากแถบขอบ 1px รอบด้าน
  const dx = EXTRA - BLEED;
  const dy = EXTRA - BLEED;
  // กลาง
  ctx.drawImage(trim, EXTRA, EXTRA);
  // ขอบซ้าย/ขวา
  ctx.drawImage(trim, 0, 0, 1, TH, dx, EXTRA, BLEED, TH);
  ctx.drawImage(trim, TW - 1, 0, 1, TH, EXTRA + TW, EXTRA, BLEED, TH);
  // ขอบบน/ล่าง
  ctx.drawImage(trim, 0, 0, TW, 1, EXTRA, dy, TW, BLEED);
  ctx.drawImage(trim, 0, TH - 1, TW, 1, EXTRA, EXTRA + TH, TW, BLEED);
  // มุมทั้ง 4
  ctx.drawImage(trim, 0, 0, 1, 1, dx, dy, BLEED, BLEED);
  ctx.drawImage(trim, TW - 1, 0, 1, 1, EXTRA + TW, dy, BLEED, BLEED);
  ctx.drawImage(trim, 0, TH - 1, 1, 1, dx, EXTRA + TH, BLEED, BLEED);
  ctx.drawImage(trim, TW - 1, TH - 1, 1, 1, EXTRA + TW, EXTRA + TH, BLEED, BLEED);

  // crop marks
  const L = EXTRA, T = EXTRA, Rr = EXTRA + TW, B = EXTRA + TH;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  line(L, PAD, L, T - BLEED);
  line(PAD, T, L - BLEED, T);
  line(Rr, PAD, Rr, T - BLEED);
  line(CW - PAD, T, Rr + BLEED, T);
  line(L, B + BLEED, L, CH - PAD);
  line(PAD, B, L - BLEED, B);
  line(Rr, B + BLEED, Rr, CH - PAD);
  line(CW - PAD, B, Rr + BLEED, B);

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** ปริ้น: เปิดหน้าต่างใหม่แล้ววาง SVG ตรง ๆ (เวกเตอร์ + ฝังฟอนต์ base64 ในหัวหน้า)
 *  เบราว์เซอร์เรนเดอร์ฟอนต์จริงตอนพิมพ์ ไม่ผ่าน canvas จึงไม่ตกฟอนต์
 *  built.svg ควรฝังรูปเป็น data URI มาแล้ว (resolveExport) · marginMm 0 = ชิดขอบ */
export async function printSvg(built: BuiltSvg, fontFamilies: string[], landscape = true, marginMm = 0) {
  const fontCss = await fontFaceCssEmbedded(fontFamilies);
  // เอา width/height ออก เหลือ viewBox ให้ CSS คุมขนาดพอดีหน้า
  const svg = built.svg.replace(/(<svg\b[^>]*?)\s+width="\d+"\s+height="\d+"/, "$1");
  const m = Math.max(0, marginMm);
  const primary = fontFamilies[0] ?? "IBM Plex Sans Thai";
  const w = window.open("", "_blank");
  if (!w) {
    alert("เปิดหน้าต่างพิมพ์ไม่ได้ — โปรดอนุญาตป็อปอัป (popup) ของเว็บนี้แล้วลองใหม่");
    return;
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>พิมพ์โปสเตอร์</title>` +
      `<style>${fontCss}</style>` +
      `<style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:${m}mm}html,body{margin:0;padding:0}body{width:100%;height:100vh;display:flex;align-items:center;justify-content:center}svg{max-width:100%;max-height:100vh}</style>` +
      `</head><body>${svg}` +
      `<script>function go(){window.focus();window.print();}if(document.fonts){document.fonts.load('700 64px "${primary}"').catch(function(){}).then(function(){return document.fonts.ready;}).then(function(){setTimeout(go,300);});}else{setTimeout(go,600);}<\/script>` +
      `</body></html>`,
  );
  w.document.close();
}
