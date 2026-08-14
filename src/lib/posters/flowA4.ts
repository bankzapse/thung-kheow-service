import type { BuiltSvg, FlowConfig } from "./types";
import { drawIcon } from "./icons";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** โปสเตอร์ขั้นตอนการใช้งาน — A4 แนวนอน (viewBox 4800×3394 ≈ 297:210) */
export function buildFlowA4(cfg: FlowConfig): BuiltSvg {
  const W = 4800;
  const H = 3394;
  const p = cfg.palette;
  const S = cfg.styles;
  const ff = (k: keyof FlowConfig["styles"]) => S[k].font || cfg.fontFamily;
  const fs = (k: keyof FlowConfig["styles"], n: number) => Math.round(n * cfg.scale * (S[k].scale ?? 1));
  const MARGIN = 130;

  const N = cfg.steps.length;
  const slot = (W - MARGIN * 2) / N;
  const cx = (i: number) => MARGIN + slot / 2 + i * slot;
  const CIRCLE_Y = 1010;
  const R = 290;
  const R1 = 290;

  const numBadge = (i: number, x: number) => {
    const bx = x + R - 28;
    const by = CIRCLE_Y - R + 28;
    return `<circle cx="${bx}" cy="${by}" r="80" fill="#fff"/><circle cx="${bx}" cy="${by}" r="80" fill="none" stroke="${p.circleTo}" stroke-width="7"/><text x="${bx}" y="${by + 30}" font-family="${ff("steps")}" font-size="${fs("steps", 86)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">${i + 1}</text>`;
  };

  const step = (i: number) => {
    const s = cfg.steps[i];
    const x = cx(i);
    const desc = s.lines
      .map(
        (l, k) =>
          `<text x="${x}" y="${CIRCLE_Y + R + 206 + k * 90}" font-family="${ff("steps")}" font-size="${fs("steps", 52)}" fill="${S.steps.body}" text-anchor="middle">${esc(l)}</text>`,
      )
      .join("");
    const title = `<text x="${x}" y="${CIRCLE_Y + R + 120}" font-family="${ff("steps")}" font-size="${fs("steps", 96)}" font-weight="700" fill="${S.steps.title}" text-anchor="middle">${esc(s.title)}</text>`;

    if (i === 0) {
      const pad = 40;
      const q = 2 * R1 - 2 * pad;
      const qx = x - q / 2;
      const qy = CIRCLE_Y - R1 + pad;
      const b1x = x + R1 + 20;
      const b1y = CIRCLE_Y - R1 - 20;
      const badge1 = `<circle cx="${b1x}" cy="${b1y}" r="76" fill="#fff"/><circle cx="${b1x}" cy="${b1y}" r="76" fill="none" stroke="${p.circleTo}" stroke-width="7"/><text x="${b1x}" y="${b1y + 28}" font-family="${ff("steps")}" font-size="${fs("steps", 82)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">1</text>`;
      return `<rect x="${x - R1}" y="${CIRCLE_Y - R1}" width="${2 * R1}" height="${2 * R1}" rx="66" fill="#ffffff" stroke="#dfeae3" stroke-width="6" filter="url(#softsh)"/><image href="${cfg.qrUri}" x="${qx}" y="${qy}" width="${q}" height="${q}"/>${badge1}${title}${desc}`;
    }
    return `<circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="url(#gcircle)" filter="url(#softsh)"/><circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="none" stroke="#ffffff" stroke-width="14" opacity="0.22"/><g transform="translate(${x} ${CIRCLE_Y}) scale(3.35)">${drawIcon(s.icon, s.iconColor)}</g>${numBadge(i, x)}${title}${desc}`;
  };

  let connectors = "";
  for (let i = 0; i < N - 1; i++) {
    const x1 = cx(i) + (i === 0 ? R1 : R) + 44;
    const x2 = cx(i + 1) - R - 44;
    const my = CIRCLE_Y;
    connectors += `<line x1="${x1}" y1="${my}" x2="${x2 - 30}" y2="${my}" stroke="#86d0a4" stroke-width="8" stroke-linecap="round" stroke-dasharray="4 30"/><path d="M${x2 - 34} ${my - 22}L${x2} ${my}L${x2 - 34} ${my + 22}" fill="none" stroke="#34a35a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // แถบล่าง
  const BOT_Y = 1856;
  const BOT_H = 1120;
  const SPLIT = 2760;

  const cols = 3;
  const innerX = MARGIN + 70;
  const usable = SPLIT - 100 - innerX;
  const mstep = usable / cols;
  const thumb = 310;
  const TY0 = BOT_Y + 250;
  const rowPitch = 450;
  const items = cfg.materials
    .map((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const mx = innerX + mstep / 2 + col * mstep;
      const ty = TY0 + row * rowPitch;
      return `<clipPath id="mclip${i}"><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="52"/></clipPath><image href="${m.img}" x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mclip${i})"/><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="52" fill="none" stroke="#e3ece6" stroke-width="5"/><text x="${mx}" y="${ty + thumb + 72}" font-family="${ff("materials")}" font-size="${fs("materials", 60)}" font-weight="600" fill="${S.materials.title}" text-anchor="middle">${esc(m.label)}</text>`;
    })
    .join("");
  const cardRight = MARGIN + (SPLIT - MARGIN - 60);
  const pillW = 960;
  const pillH = 92;
  const pillX = cardRight - 46 - pillW;
  const pillY = BOT_Y + 50;
  const icx = pillX + 62;
  const icy = pillY + pillH / 2;
  const warn = `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="#dc2626"/><circle cx="${icx}" cy="${icy}" r="31" fill="#ffffff"/><path d="M${icx - 13} ${icy - 13}L${icx + 13} ${icy + 13}M${icx + 13} ${icy - 13}L${icx - 13} ${icy + 13}" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/><text x="${icx + 54}" y="${icy + 20}" font-family="${ff("materials")}" font-size="${fs("materials", 52)}" font-weight="700" fill="#ffffff">${esc(cfg.warnPill)}</text>`;
  const materialStrip = `<rect x="${MARGIN}" y="${BOT_Y}" width="${SPLIT - MARGIN - 60}" height="${BOT_H}" rx="52" fill="#ffffff" stroke="#e3ece6" stroke-width="4"/><text x="${innerX}" y="${BOT_Y + 116}" font-family="${ff("materials")}" font-size="${fs("materials", 76)}" font-weight="700" fill="${S.materials.title}">${esc(cfg.materialsHeading)}</text><text x="${innerX}" y="${BOT_Y + 196}" font-family="${ff("materials")}" font-size="${fs("materials", 50)}" fill="${S.materials.body}">${esc(cfg.materialsSub)}</text>${warn}${items}`;

  // คอลัมน์ขวา: โปรโมท + คำเตือน
  const cardX = SPLIT;
  const cardW = W - MARGIN - cardX;
  const GAP = 28;
  const qcH = 640;
  const wcY = BOT_Y + qcH + GAP;
  const wcH = BOT_H - qcH - GAP;
  const gcy = BOT_Y + 300;
  const gcx = cardX + 196;
  const tx = cardX + 406;
  const gift = `<circle cx="${gcx}" cy="${gcy}" r="150" fill="#ffffff"/><g transform="translate(${gcx} ${gcy}) scale(0.92)" fill="none" stroke="${p.circleTo}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"><rect x="-64" y="-22" width="128" height="94" rx="12"/><rect x="-78" y="-52" width="156" height="34" rx="10"/><path d="M0-52 V72"/><ellipse cx="-24" cy="-66" rx="24" ry="17"/><ellipse cx="24" cy="-66" rx="24" ry="17"/></g>`;
  const promoCard = `<rect x="${cardX}" y="${BOT_Y}" width="${cardW}" height="${qcH}" rx="52" fill="url(#gcard)"/>${gift}<text x="${tx}" y="${BOT_Y + 224}" font-family="${ff("promo")}" font-size="${fs("promo", 88)}" font-weight="700" fill="${S.promo.title}">${esc(cfg.promo.heading)}</text><text x="${tx}" y="${BOT_Y + 314}" font-family="${ff("promo")}" font-size="${fs("promo", 52)}" fill="${S.promo.body}">${esc(cfg.promo.sub)}</text><rect x="${tx}" y="${BOT_Y + 372}" width="560" height="96" rx="48" fill="#ffffff"/><text x="${tx + 280}" y="${BOT_Y + 436}" font-family="${ff("promo")}" font-size="${fs("promo", 52)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">${esc(cfg.promo.pill)}</text>`;

  const triX = cardX + 130;
  const triCY = wcY + wcH / 2;
  const tri = `<g transform="translate(${triX} ${triCY}) scale(1.42)"><path d="M0-52 L58 50 H-58 Z" fill="none" stroke="#b91c1c" stroke-width="11" stroke-linejoin="round"/><path d="M0-24 V14" stroke="#b91c1c" stroke-width="11" stroke-linecap="round"/><circle cx="0" cy="34" r="6.5" fill="#b91c1c"/></g>`;
  const wtx = triX + 130;
  const warnCard = `<rect x="${cardX}" y="${wcY}" width="${cardW}" height="${wcH}" rx="52" fill="#fff5f5" stroke="#f2b5b5" stroke-width="4"/>${tri}<text x="${wtx}" y="${wcY + wcH / 2 - 30}" font-family="${ff("footer")}" font-size="${fs("footer", 66)}" font-weight="700" fill="${S.footer.title}">${esc(cfg.legalWarn[0] ?? "")}</text><text x="${wtx}" y="${wcY + wcH / 2 + 60}" font-family="${ff("footer")}" font-size="${fs("footer", 66)}" font-weight="700" fill="${S.footer.title}">${esc(cfg.legalWarn[1] ?? "")}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="gband" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="${p.band}"/><stop offset="1" stop-color="${p.bandTo}"/></linearGradient>
    <linearGradient id="gcircle" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.circle}"/><stop offset="1" stop-color="${p.circleTo}"/></linearGradient>
    <linearGradient id="gcard" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.band}"/><stop offset="1" stop-color="#0f6a34"/></linearGradient>
    <filter id="softsh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0c3d22" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <rect x="0" y="0" width="${W}" height="430" fill="url(#gband)"/>
  <image href="${cfg.logoUri}" x="${MARGIN}" y="92" width="248" height="248"/>
  <text x="${MARGIN + 302}" y="216" font-family="${ff("header")}" font-size="${fs("header", 140)}" font-weight="700" fill="${S.header.title}">${esc(cfg.headerTitle)}</text>
  <text x="${MARGIN + 302}" y="308" font-family="${ff("header")}" font-size="${fs("header", 60)}" fill="${S.header.body}">${esc(cfg.headerSubtitle)}</text>
  <text x="${W - MARGIN}" y="262" font-family="${ff("header")}" font-size="${fs("header", 104)}" font-weight="700" fill="${S.header.title}" text-anchor="end">${esc(cfg.headerRight)}</text>
  ${connectors}
  ${cfg.steps.map((_, i) => step(i)).join("")}
  ${materialStrip}
  ${promoCard}
  ${warnCard}
  <rect x="0" y="${H - 120}" width="${W}" height="120" fill="url(#gband)"/>
  <text x="${MARGIN}" y="${H - 44}" font-family="${ff("footer")}" font-size="${fs("footer", 52)}" fill="${S.footer.body}">${esc(cfg.footerLeft)}</text>
  <text x="${W / 2}" y="${H - 44}" font-family="${ff("footer")}" font-size="${fs("footer", 52)}" fill="${S.footer.body}" text-anchor="middle">${esc(cfg.footerCenter)}</text>
  <text x="${W - MARGIN}" y="${H - 44}" font-family="${ff("footer")}" font-size="${fs("footer", 52)}" font-weight="600" fill="${S.footer.body}" text-anchor="end">${esc(cfg.footerRight)}</text>
</svg>`;

  return { svg, width: W, height: H };
}
