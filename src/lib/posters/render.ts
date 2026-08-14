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
  // Blob URL แทน base64 data URL — ไม่ต้อง encode SVG ทั้งก้อน (เร็วกว่ามากเมื่อมีรูป data URI)
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("โหลด SVG ไม่สำเร็จ"));
      img.src = url;
    });
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext("2d")!.drawImage(img, 0, 0, targetW, targetH);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** rasterize โปสเตอร์ → canvas
 *  พื้นหลัง/ไล่สี/รูป/ไอคอน เรนเดอร์จาก SVG (img) · ตัวอักษรวาดด้วย canvas fillText โดยตรง
 *  (ใช้ฟอนต์จาก document.fonts ที่ preload แล้ว — ชัวร์ทุกเบราว์เซอร์ ไม่พึ่ง webfont ใน SVG-img) */
async function rasterizePoster(built: BuiltSvg, targetW: number): Promise<HTMLCanvasElement> {
  const scale = targetW / built.width;
  // 1) เอา <text> ออก แล้ว rasterize ส่วนที่เหลือ (ไม่พึ่งฟอนต์)
  const noText = built.svg.replace(/<text\b[\s\S]*?<\/text>/g, "");
  const canvas = await svgToCanvas(noText, targetW, built.width, built.height);
  const ctx = canvas.getContext("2d")!;
  // 2) วาดตัวอักษรเองด้วย fillText — parse เฉพาะ <text> (ตัด data URI ของรูปออกก่อน ให้ parse เร็ว)
  const lite = built.svg.replace(/\shref="data:[^"]*"/g, ' href=""');
  const doc = new DOMParser().parseFromString(lite, "image/svg+xml");
  ctx.textBaseline = "alphabetic";
  doc.querySelectorAll("text").forEach((t) => {
    const text = t.textContent ?? "";
    if (!text) return;
    const x = parseFloat(t.getAttribute("x") || "0") * scale;
    const y = parseFloat(t.getAttribute("y") || "0") * scale;
    const size = parseFloat(t.getAttribute("font-size") || "16") * scale;
    const weight = t.getAttribute("font-weight") || "400";
    const family = t.getAttribute("font-family") || "sans-serif";
    const anchor = t.getAttribute("text-anchor") || "start";
    const op = t.getAttribute("opacity");
    ctx.font = `${weight} ${size}px "${family}"`;
    ctx.fillStyle = t.getAttribute("fill") || "#000";
    ctx.textAlign = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
    ctx.globalAlpha = op ? parseFloat(op) : 1;
    ctx.fillText(text, x, y);
  });
  ctx.globalAlpha = 1;
  return canvas;
}

/** rasterize เป็น PNG blob (trim) */
export async function renderPng(built: BuiltSvg, fontFamilies: string[], targetW: number): Promise<Blob> {
  await awaitFonts(fontFamilies);
  const canvas = await rasterizePoster(built, targetW);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** ห่อ canvas ด้วย bleed 3mm (ยืดขอบ) + crop marks → PNG blob สำหรับส่งโรงพิมพ์ */
export async function renderPrintBleedPng(built: BuiltSvg, fontFamilies: string[], targetW: number, physWidthMm: number): Promise<Blob> {
  await awaitFonts(fontFamilies);
  const trim = await rasterizePoster(built, targetW);
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

/** ปริ้น: วางรูป PNG (ฟอนต์อบเป็นพิกเซลแล้ว) ใน hidden iframe แล้วสั่งพิมพ์เฉพาะ iframe
 *  ใช้ PNG เพราะ print pipeline ของเบราว์เซอร์บางตัวไม่ใช้ webfont (base64) กับ SVG ตอนพิมพ์
 *  → พิกเซลไม่มีทางตกฟอนต์ · ไม่ง้อ popup (กันโดนบล็อก) · marginMm 0 = ชิดขอบ */
export async function printImage(blob: Blob, landscape = true, marginMm = 0) {
  const url = URL.createObjectURL(blob);
  const m = Math.max(0, marginMm);
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><title>พิมพ์โปสเตอร์</title>` +
    `<style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:${m}mm}html,body{margin:0;padding:0}body{width:100%;height:100vh;display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100vh}</style>` +
    `</head><body><img src="${url}"></body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  const img = win.document.querySelector("img");
  await new Promise<void>((resolve) => {
    if (img && img.complete) return resolve();
    if (img) {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }
    setTimeout(resolve, 2000);
  });
  await new Promise((r) => setTimeout(r, 150));
  win.focus();
  win.print();
  setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 2500);
}
