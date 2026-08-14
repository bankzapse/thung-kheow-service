import type { BuiltSvg, FlowConfig } from "./types";
import { drawIcon } from "./icons";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** โปสเตอร์ขั้นตอน — ป้ายใหญ่ 80×40cm (viewBox 4800×2400 = 2:1) ดีไซน์เดียวกับ A4 */
export function buildFlowWide(cfg: FlowConfig): BuiltSvg {
  const W = 4800;
  const H = 2400;
  const p = cfg.palette;
  const S = cfg.styles;
  const ff = (k: keyof FlowConfig["styles"]) => S[k].font || cfg.fontFamily;
  const fs = (n: number) => Math.round(n * cfg.scale);
  const MARGIN = 130;

  const N = cfg.steps.length;
  const slot = (W - MARGIN * 2) / N;
  const cx = (i: number) => MARGIN + slot / 2 + i * slot;
  const CIRCLE_Y = 700;
  const R = 210;
  const R1 = 210;

  const numBadge = (i: number, x: number) => {
    const bx = x + R - 22;
    const by = CIRCLE_Y - R + 22;
    return `<circle cx="${bx}" cy="${by}" r="60" fill="#fff"/><circle cx="${bx}" cy="${by}" r="60" fill="none" stroke="${p.circleTo}" stroke-width="6"/><text x="${bx}" y="${by + 22}" font-family="${ff("steps")}" font-size="${fs(64)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">${i + 1}</text>`;
  };

  const step = (i: number) => {
    const s = cfg.steps[i];
    const x = cx(i);
    const desc = s.lines
      .map((l, k) => `<text x="${x}" y="${CIRCLE_Y + R + 160 + k * 76}" font-family="${ff("steps")}" font-size="${fs(44)}" fill="${S.steps.body}" text-anchor="middle">${esc(l)}</text>`)
      .join("");
    const title = `<text x="${x}" y="${CIRCLE_Y + R + 92}" font-family="${ff("steps")}" font-size="${fs(72)}" font-weight="700" fill="${S.steps.title}" text-anchor="middle">${esc(s.title)}</text>`;

    if (i === 0) {
      const pad = 32;
      const q = 2 * R1 - 2 * pad;
      const qx = x - q / 2;
      const qy = CIRCLE_Y - R1 + pad;
      const b1x = x + R1 + 14;
      const b1y = CIRCLE_Y - R1 - 14;
      const badge1 = `<circle cx="${b1x}" cy="${b1y}" r="58" fill="#fff"/><circle cx="${b1x}" cy="${b1y}" r="58" fill="none" stroke="${p.circleTo}" stroke-width="6"/><text x="${b1x}" y="${b1y + 22}" font-family="${ff("steps")}" font-size="${fs(62)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">1</text>`;
      return `<rect x="${x - R1}" y="${CIRCLE_Y - R1}" width="${2 * R1}" height="${2 * R1}" rx="50" fill="#ffffff" stroke="#dfeae3" stroke-width="5" filter="url(#softsh)"/><image href="${cfg.qrUri}" x="${qx}" y="${qy}" width="${q}" height="${q}"/>${badge1}${title}${desc}`;
    }
    return `<circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="url(#gcircle)" filter="url(#softsh)"/><circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="none" stroke="#ffffff" stroke-width="12" opacity="0.22"/><g transform="translate(${x} ${CIRCLE_Y}) scale(2.42)">${drawIcon(s.icon, s.iconColor)}</g>${numBadge(i, x)}${title}${desc}`;
  };

  let connectors = "";
  for (let i = 0; i < N - 1; i++) {
    const x1 = cx(i) + (i === 0 ? R1 : R) + 40;
    const x2 = cx(i + 1) - R - 40;
    const my = CIRCLE_Y;
    connectors += `<line x1="${x1}" y1="${my}" x2="${x2 - 26}" y2="${my}" stroke="#86d0a4" stroke-width="7" stroke-linecap="round" stroke-dasharray="4 26"/><path d="M${x2 - 30} ${my - 18}L${x2} ${my}L${x2 - 30} ${my + 18}" fill="none" stroke="#34a35a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const BOT_Y = 1300;
  const BOT_H = 960;
  const SPLIT = 2760;

  const cols = 3;
  const innerX = MARGIN + 60;
  const usable = SPLIT - 100 - innerX;
  const mstep = usable / cols;
  const thumb = 250;
  const TY0 = BOT_Y + 205;
  const rowPitch = 358;
  const items = cfg.materials
    .map((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const mx = innerX + mstep / 2 + col * mstep;
      const ty = TY0 + row * rowPitch;
      return `<clipPath id="wclip${i}"><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="44"/></clipPath><image href="${m.img}" x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" preserveAspectRatio="xMidYMid slice" clip-path="url(#wclip${i})"/><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="44" fill="none" stroke="#e3ece6" stroke-width="4"/><text x="${mx}" y="${ty + thumb + 58}" font-family="${ff("materials")}" font-size="${fs(48)}" font-weight="600" fill="${S.materials.title}" text-anchor="middle">${esc(m.label)}</text>`;
    })
    .join("");
  const cardRight = MARGIN + (SPLIT - MARGIN - 60);
  const pillW = 780;
  const pillH = 78;
  const pillX = cardRight - 40 - pillW;
  const pillY = BOT_Y + 40;
  const icx = pillX + 54;
  const icy = pillY + pillH / 2;
  const warn = `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="#dc2626"/><circle cx="${icx}" cy="${icy}" r="26" fill="#ffffff"/><path d="M${icx - 11} ${icy - 11}L${icx + 11} ${icy + 11}M${icx + 11} ${icy - 11}L${icx - 11} ${icy + 11}" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/><text x="${icx + 46}" y="${icy + 16}" font-family="${ff("materials")}" font-size="${fs(44)}" font-weight="700" fill="#ffffff">${esc(cfg.warnPill)}</text>`;
  const materialStrip = `<rect x="${MARGIN}" y="${BOT_Y}" width="${SPLIT - MARGIN - 60}" height="${BOT_H}" rx="44" fill="#ffffff" stroke="#e3ece6" stroke-width="3"/><text x="${innerX}" y="${BOT_Y + 96}" font-family="${ff("materials")}" font-size="${fs(62)}" font-weight="700" fill="${S.materials.title}">${esc(cfg.materialsHeading)}</text><text x="${innerX}" y="${BOT_Y + 158}" font-family="${ff("materials")}" font-size="${fs(42)}" fill="${S.materials.body}">${esc(cfg.materialsSub)}</text>${warn}${items}`;

  const cardX = SPLIT;
  const cardW = W - MARGIN - cardX;
  const GAP = 24;
  const qcH = 560;
  const wcY = BOT_Y + qcH + GAP;
  const wcH = BOT_H - qcH - GAP;
  const gcy = BOT_Y + 280;
  const gcx = cardX + 170;
  const tx = cardX + 350;
  const gift = `<circle cx="${gcx}" cy="${gcy}" r="128" fill="#ffffff"/><g transform="translate(${gcx} ${gcy}) scale(0.8)" fill="none" stroke="${p.circleTo}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"><rect x="-64" y="-22" width="128" height="94" rx="12"/><rect x="-78" y="-52" width="156" height="34" rx="10"/><path d="M0-52 V72"/><ellipse cx="-24" cy="-66" rx="24" ry="17"/><ellipse cx="24" cy="-66" rx="24" ry="17"/></g>`;
  const promoCard = `<rect x="${cardX}" y="${BOT_Y}" width="${cardW}" height="${qcH}" rx="44" fill="url(#gcard)"/>${gift}<text x="${tx}" y="${BOT_Y + 196}" font-family="${ff("promo")}" font-size="${fs(76)}" font-weight="700" fill="${S.promo.title}">${esc(cfg.promo.heading)}</text><text x="${tx}" y="${BOT_Y + 272}" font-family="${ff("promo")}" font-size="${fs(46)}" fill="${S.promo.body}">${esc(cfg.promo.sub)}</text><rect x="${tx}" y="${BOT_Y + 322}" width="500" height="84" rx="42" fill="#ffffff"/><text x="${tx + 250}" y="${BOT_Y + 378}" font-family="${ff("promo")}" font-size="${fs(46)}" font-weight="700" fill="${p.circleTo}" text-anchor="middle">${esc(cfg.promo.pill)}</text>`;

  const triX = cardX + 110;
  const triCY = wcY + wcH / 2;
  const tri = `<g transform="translate(${triX} ${triCY}) scale(1.2)"><path d="M0-52 L58 50 H-58 Z" fill="none" stroke="#b91c1c" stroke-width="11" stroke-linejoin="round"/><path d="M0-24 V14" stroke="#b91c1c" stroke-width="11" stroke-linecap="round"/><circle cx="0" cy="34" r="6.5" fill="#b91c1c"/></g>`;
  const wtx = triX + 110;
  const warnCard = `<rect x="${cardX}" y="${wcY}" width="${cardW}" height="${wcH}" rx="44" fill="#fff5f5" stroke="#f2b5b5" stroke-width="3"/>${tri}<text x="${wtx}" y="${wcY + wcH / 2 - 22}" font-family="${ff("footer")}" font-size="${fs(54)}" font-weight="700" fill="${S.footer.title}">${esc(cfg.legalWarn[0] ?? "")}</text><text x="${wtx}" y="${wcY + wcH / 2 + 52}" font-family="${ff("footer")}" font-size="${fs(54)}" font-weight="700" fill="${S.footer.title}">${esc(cfg.legalWarn[1] ?? "")}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="gband" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="${p.band}"/><stop offset="1" stop-color="${p.bandTo}"/></linearGradient>
    <linearGradient id="gcircle" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.circle}"/><stop offset="1" stop-color="${p.circleTo}"/></linearGradient>
    <linearGradient id="gcard" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.band}"/><stop offset="1" stop-color="#0f6a34"/></linearGradient>
    <filter id="softsh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0c3d22" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <rect x="0" y="0" width="${W}" height="300" fill="url(#gband)"/>
  <image href="${cfg.logoUri}" x="${MARGIN}" y="58" width="184" height="184"/>
  <text x="${MARGIN + 224}" y="152" font-family="${ff("header")}" font-size="${fs(108)}" font-weight="700" fill="${S.header.title}">${esc(cfg.headerTitle)}</text>
  <text x="${MARGIN + 224}" y="226" font-family="${ff("header")}" font-size="${fs(46)}" fill="${S.header.body}">${esc(cfg.headerSubtitle)}</text>
  <text x="${W - MARGIN}" y="192" font-family="${ff("header")}" font-size="${fs(84)}" font-weight="700" fill="${S.header.title}" text-anchor="end">${esc(cfg.headerRight)}</text>
  ${connectors}
  ${cfg.steps.map((_, i) => step(i)).join("")}
  ${materialStrip}
  ${promoCard}
  ${warnCard}
  <rect x="0" y="${H - 92}" width="${W}" height="92" fill="url(#gband)"/>
  <text x="${MARGIN}" y="${H - 32}" font-family="${ff("footer")}" font-size="${fs(44)}" fill="${S.footer.body}">${esc(cfg.footerLeft)}</text>
  <text x="${W / 2}" y="${H - 32}" font-family="${ff("footer")}" font-size="${fs(44)}" fill="${S.footer.body}" text-anchor="middle">${esc(cfg.footerCenter)}</text>
  <text x="${W - MARGIN}" y="${H - 32}" font-family="${ff("footer")}" font-size="${fs(44)}" font-weight="600" fill="${S.footer.body}" text-anchor="end">${esc(cfg.footerRight)}</text>
</svg>`;

  return { svg, width: W, height: H };
}
