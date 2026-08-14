import type { BuiltSvg, CabinetConfig } from "./types";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** โปสเตอร์ QR ติดหน้าตู้ — A4 แนวตั้ง (viewBox 2480×3508) */
export function buildCabinet(cfg: CabinetConfig): BuiltSvg {
  const W = 2480;
  const H = 3508;
  const p = cfg.palette;
  const S = cfg.styles;
  const ff = (k: keyof CabinetConfig["styles"]) => S[k].font || cfg.fontFamily;
  const fs = (k: keyof CabinetConfig["styles"], n: number) => Math.round(n * cfg.scale * (S[k].scale ?? 1));

  const QR_SIZE = 1000;
  const CARD = QR_SIZE + 190;
  const CARD_X = (W - CARD) / 2;
  const CARD_Y = 1200;

  const stepY = (i: number) => 2660 + i * 178;
  const steps = cfg.steps
    .map(
      (s, i) => `
    <circle cx="330" cy="${stepY(i) - 22}" r="48" fill="#ffffff" opacity="0.22"/>
    <text x="330" y="${stepY(i) - 2}" font-family="${ff("steps")}" font-size="${fs("steps", 52)}" font-weight="700" fill="${S.steps.title}" text-anchor="middle">${esc(s.n)}</text>
    <text x="424" y="${stepY(i)}" font-family="${ff("steps")}" font-size="${fs("steps", 64)}" font-weight="700" fill="${S.steps.title}">${esc(s.title)}</text>
    <text x="424" y="${stepY(i) + 68}" font-family="${ff("steps")}" font-size="${fs("steps", 46)}" fill="${S.steps.body}" opacity="0.9">${esc(s.sub)}</text>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop stop-color="${p.circle}"/><stop offset="0.5" stop-color="${p.band}"/><stop offset="1" stop-color="#14532d"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 120}" cy="220" r="420" fill="#ffffff" opacity="0.06"/>
  <circle cx="90" cy="${H - 260}" r="360" fill="#ffffff" opacity="0.05"/>
  <rect x="${W / 2 - 168}" y="150" width="336" height="336" rx="84" fill="#ffffff" opacity="0.14"/>
  <image href="${cfg.logoUri}" x="${W / 2 - 148}" y="170" width="296" height="296"/>
  <text x="${W / 2}" y="610" font-family="${ff("header")}" font-size="${fs("header", 150)}" font-weight="700" fill="${S.header.title}" text-anchor="middle">${esc(cfg.brand)}</text>
  <text x="${W / 2}" y="770" font-family="${ff("header")}" font-size="${fs("header", 112)}" font-weight="700" fill="${S.header.title}" text-anchor="middle">${esc(cfg.headline)}</text>
  <text x="${W / 2}" y="888" font-family="${ff("header")}" font-size="${fs("header", 66)}" fill="${S.header.body}" opacity="0.95" text-anchor="middle">${esc(cfg.subheadline)}</text>
  <rect x="${W / 2 - 580}" y="980" width="1160" height="124" rx="62" fill="#ffffff" opacity="0.18"/>
  <text x="${W / 2}" y="1064" font-family="${ff("header")}" font-size="${fs("header", 64)}" font-weight="700" fill="${S.header.title}" text-anchor="middle">${esc(cfg.qrCaption)}</text>
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD}" height="${CARD + 130}" rx="70" fill="#ffffff"/>
  <image href="${cfg.qrUri}" x="${CARD_X + 95}" y="${CARD_Y + 95}" width="${QR_SIZE}" height="${QR_SIZE}"/>
  <text x="${W / 2}" y="${CARD_Y + CARD + 66}" font-family="${ff("header")}" font-size="${fs("header", 60)}" font-weight="700" fill="${p.band}" text-anchor="middle">LINE: ${esc(cfg.lineId)}</text>
  ${steps}
  <text x="${W / 2}" y="${H - 170}" font-family="${ff("footer")}" font-size="${fs("footer", 46)}" fill="${S.footer.body}" opacity="0.85" text-anchor="middle">${esc(cfg.footer)}</text>
  <text x="${W / 2}" y="${H - 88}" font-family="${ff("footer")}" font-size="${fs("footer", 44)}" font-weight="600" fill="${S.footer.body}" opacity="0.95" text-anchor="middle">${esc(cfg.site)}</text>
</svg>`;

  return { svg, width: W, height: H };
}
