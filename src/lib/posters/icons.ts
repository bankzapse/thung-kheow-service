/** ชุดไอคอนโปสเตอร์ — วาดกึ่งกลาง (0,0) รับสีผ่านพารามิเตอร์ (ให้เลือกสีไอคอนได้) */
export type IconDraw = (color: string) => string;

export const ICONS: Record<string, { label: string; draw: IconDraw }> = {
  addline: {
    label: "เพิ่มเพื่อน",
    draw: (c) =>
      `<path d="M-40-30h80a10 10 0 0110 10v36a10 10 0 01-10 10H4L-16 52V36h-24a10 10 0 01-10-10v-36a10 10 0 0110-10z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M0-14v28M-14 0h28" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`,
  },
  bag: {
    label: "ถุงรีไซเคิล",
    draw: (c) =>
      `<path d="M-30-21h60v42a10 10 0 01-10 10h-40a10 10 0 01-10-10z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M-21-21v-9a8 8 0 0116 0v9" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M5-21v-9a8 8 0 0116 0v9" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M-10 7a14 14 0 0124-9M12 11a14 14 0 01-24 9" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M12-11l5 9-10 1M-12 21l-5-9 10-1" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  scan: {
    label: "สแกน QR",
    draw: (c) =>
      `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M-40-18v-16a6 6 0 016-6h16"/><path d="M18-40h16a6 6 0 016 6v16"/><path d="M40 18v16a6 6 0 01-6 6h-16"/><path d="M-18 40h-16a6 6 0 01-6-6v-16"/></g><g fill="${c}"><rect x="-18" y="-18" width="14" height="14" rx="2.5"/><rect x="4" y="-18" width="14" height="14" rx="2.5"/><rect x="-18" y="4" width="14" height="14" rx="2.5"/><rect x="6" y="6" width="6" height="6"/><rect x="15" y="6" width="3" height="6"/><rect x="6" y="15" width="6" height="3"/><rect x="15" y="14" width="3" height="4"/></g>`,
  },
  drop: {
    label: "หย่อนลงตู้",
    draw: (c) =>
      `<path d="M-34 6h68v34a4 4 0 01-4 4H-30a4 4 0 01-4-4z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M-34 6h68" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M0-44V2" stroke="${c}" stroke-width="8" stroke-linecap="round"/><path d="M-16-16L0 2l16-18" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  coin: {
    label: "เหรียญเงิน ฿",
    draw: (c) =>
      `<circle cx="-21" cy="-13" r="20" fill="none" stroke="${c}" stroke-width="5" opacity="0.45"/><circle cx="0" cy="0" r="33" fill="none" stroke="${c}" stroke-width="7"/><g fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M-6-15v30"/><path d="M-6-15H4a7.5 7.5 0 010 15H-6"/><path d="M-6 0H5a7.5 7.5 0 010 15H-6"/><path d="M0-21v6M0 15v6"/></g>`,
  },
  recycle: {
    label: "รีไซเคิล",
    draw: (c) =>
      `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M-6-34l-14 24 12 7"/><path d="M-20-10l-14 6 8 22a6 6 0 006 4h14"/><path d="M6-34l20 34a6 6 0 015 4"/><path d="M31 4l-4-14-13 5"/><path d="M-6 30h26a6 6 0 006-4l4-8"/><path d="M-6 20l-10 10 10 10"/></g>`,
  },
  bottle: {
    label: "ขวด",
    draw: (c) =>
      `<path d="M-8-38h16v10a10 10 0 004 8 16 16 0 018 13v33a6 6 0 01-6 6h-28a6 6 0 01-6-6v-33a16 16 0 018-13 10 10 0 004-8z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M-20 8h40" stroke="${c}" stroke-width="6"/>`,
  },
  truck: {
    label: "รถขนส่ง",
    draw: (c) =>
      `<path d="M-40-18h44v34h-44z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M4-6h18l14 12v10H4z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><circle cx="-22" cy="22" r="8" fill="none" stroke="${c}" stroke-width="7"/><circle cx="22" cy="22" r="8" fill="none" stroke="${c}" stroke-width="7"/>`,
  },
  cash: {
    label: "ธนบัตร",
    draw: (c) =>
      `<rect x="-40" y="-24" width="80" height="48" rx="8" fill="none" stroke="${c}" stroke-width="7"/><circle cx="0" cy="0" r="13" fill="none" stroke="${c}" stroke-width="6"/><path d="M-28-14v28M28-14v28" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  },
  gift: {
    label: "ของขวัญ",
    draw: (c) =>
      `<rect x="-32" y="-11" width="64" height="47" rx="6" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><rect x="-39" y="-26" width="78" height="17" rx="5" fill="none" stroke="${c}" stroke-width="7"/><path d="M0-26v62" stroke="${c}" stroke-width="6"/><ellipse cx="-12" cy="-33" rx="12" ry="9" fill="none" stroke="${c}" stroke-width="6"/><ellipse cx="12" cy="-33" rx="12" ry="9" fill="none" stroke="${c}" stroke-width="6"/>`,
  },
  leaf: {
    label: "ใบไม้ (สิ่งแวดล้อม)",
    draw: (c) =>
      `<path d="M31-31C-7-29-33-3-33 27c30 0 57-26 58-56z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M-22 24C-3 5 14-11 24-20" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
  },
  house: {
    label: "หน้าแรก",
    draw: (c) =>
      `<path d="M-34 2L0-34 34 2" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-26-6v40a4 4 0 004 4h44a4 4 0 004-4V-6" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><path d="M-8 38V14h16v24" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`,
  },
  star: {
    label: "ดาว (แต้ม)",
    draw: (c) =>
      `<path d="M0-36 11-11l27 2-21 17 7 26L0 36-24 34l7-26-21-17 27-2z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/>`,
  },
};

export const ICON_KEYS = Object.keys(ICONS);
export const drawIcon = (key: string, color: string) => (ICONS[key] ?? ICONS.bag).draw(color);
