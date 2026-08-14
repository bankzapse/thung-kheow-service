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
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

/** แปลง SVG (ฝังฟอนต์ base64 ให้แล้ว) → canvas ที่ความกว้างเป้าหมาย */
async function svgToCanvas(svg: string, targetW: number, vbW: number, vbH: number): Promise<HTMLCanvasElement> {
  const targetH = Math.round((targetW * vbH) / vbW);
  const url = "data:image/svg+xml;base64," + b64utf8(svg);
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("โหลด SVG ไม่สำเร็จ"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas;
}

/** ฝังฟอนต์ + rasterize เป็น PNG blob (trim) */
export async function renderPng(built: BuiltSvg, fontFamily: string, targetW: number): Promise<Blob> {
  const fontCss = await fontFaceCssEmbedded(fontFamily);
  const svg = built.svg.replace("</defs>", `<style>${fontCss}</style></defs>`);
  const canvas = await svgToCanvas(svg, targetW, built.width, built.height);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** ห่อ canvas ด้วย bleed 3mm (ยืดขอบ) + crop marks → PNG blob สำหรับส่งโรงพิมพ์ */
export async function renderPrintBleedPng(built: BuiltSvg, fontFamily: string, targetW: number, physWidthMm: number): Promise<Blob> {
  const fontCss = await fontFaceCssEmbedded(fontFamily);
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

/** ปริ้น: เปิดหน้าต่างใหม่ด้วยรูป PNG ขนาด A4 แล้วสั่งพิมพ์ */
export function printPng(blob: Blob, landscape = true) {
  const url = URL.createObjectURL(blob);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>พิมพ์โปสเตอร์</title><style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:0}html,body{margin:0;padding:0}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src="${url}" onload="setTimeout(()=>{window.focus();window.print();},150)"></body></html>`,
  );
  w.document.close();
}
