/** ฟอนต์ไทยสำหรับเอดิเตอร์โปสเตอร์ — เก็บใน public/fonts (same-origin เพื่อฝัง base64 ตอน export) */
export interface FontDef {
  label: string;
  family: string;
  files: { weight: number; url: string }[];
}

export const FONTS: FontDef[] = [
  {
    label: "IBM Plex Sans Thai (ค่าเริ่มต้น)",
    family: "IBM Plex Sans Thai",
    files: [
      { weight: 400, url: "/fonts/IBMPlexSansThai-Regular.ttf" },
      { weight: 600, url: "/fonts/IBMPlexSansThai-SemiBold.ttf" },
      { weight: 700, url: "/fonts/IBMPlexSansThai-Bold.ttf" },
    ],
  },
  {
    label: "Sarabun",
    family: "Sarabun",
    files: [
      { weight: 400, url: "/fonts/Sarabun-400.woff2" },
      { weight: 700, url: "/fonts/Sarabun-700.woff2" },
    ],
  },
  {
    label: "Prompt",
    family: "Prompt",
    files: [
      { weight: 400, url: "/fonts/Prompt-400.woff2" },
      { weight: 600, url: "/fonts/Prompt-600.woff2" },
      { weight: 700, url: "/fonts/Prompt-700.woff2" },
    ],
  },
  {
    label: "Kanit",
    family: "Kanit",
    files: [
      { weight: 400, url: "/fonts/Kanit-400.woff2" },
      { weight: 600, url: "/fonts/Kanit-600.woff2" },
      { weight: 700, url: "/fonts/Kanit-700.woff2" },
    ],
  },
];

export const findFont = (family: string): FontDef => FONTS.find((f) => f.family === family) ?? FONTS[0];

/** @font-face ที่อ้าง url ปกติ (ใช้ตอน preview ในหน้า) */
export function fontFaceCssLinked(): string {
  return FONTS.flatMap((f) =>
    f.files.map(
      (w) =>
        `@font-face{font-family:"${f.family}";font-weight:${w.weight};font-style:normal;font-display:swap;src:url("${w.url}")}`,
    ),
  ).join("\n");
}

const fmt = (url: string) => (url.endsWith(".woff2") ? "woff2" : url.endsWith(".woff") ? "woff" : "truetype");

/** โหลดไฟล์ฟอนต์ 1 ตระกูล → @font-face แบบ base64 (ใช้ฝังใน SVG ตอน export PNG ให้ตัวอักษรไม่เพี้ยน) */
export async function fontFaceCssEmbedded(family: string): Promise<string> {
  const font = findFont(family);
  const faces = await Promise.all(
    font.files.map(async (w) => {
      const res = await fetch(w.url);
      const buf = await res.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      return `@font-face{font-family:"${family}";font-weight:${w.weight};font-style:normal;src:url("data:font/${fmt(w.url)};base64,${b64}") format("${fmt(w.url)}")}`;
    }),
  );
  return faces.join("\n");
}
