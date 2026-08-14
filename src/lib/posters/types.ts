export type PosterKind = "flow-a4" | "flow-wide" | "cabinet";

export interface Step {
  icon: string;
  iconColor: string;
  title: string;
  lines: string[];
}

export interface Material {
  img: string; // URL หรือ data URI
  label: string;
}

export interface Palette {
  bg: string;
  band: string;
  bandTo: string;
  circle: string;
  circleTo: string;
  ink: string;
  sub: string;
}

/** ฟอนต์ + สี + ขนาด ต่อ section — font "" = ใช้ฟอนต์ตามค่ารวม, scale = ตัวคูณขนาดเฉพาะ section (1 = ปกติ) */
export interface SectionStyle {
  font: string;
  title: string; // สีหัวข้อ/ตัวเด่น
  body: string; // สีข้อความรอง
  scale: number;
}

export interface FlowStyles {
  header: SectionStyle;
  steps: SectionStyle;
  materials: SectionStyle;
  promo: SectionStyle;
  footer: SectionStyle; // ครอบ คำเตือน + ท้ายโปสเตอร์
}

export interface CabinetStyles {
  header: SectionStyle;
  steps: SectionStyle;
  footer: SectionStyle;
}

/** ค่าปรับแต่งโปสเตอร์ flow (ใช้ทั้ง flow-a4 และ flow-wide) */
export interface FlowConfig {
  fontFamily: string;
  scale: number; // ตัวคูณขนาดตัวอักษรรวม (1 = ปกติ)
  palette: Palette;
  headerTitle: string;
  headerSubtitle: string;
  headerRight: string;
  steps: Step[];
  materialsHeading: string;
  materialsSub: string;
  warnPill: string;
  materials: Material[];
  promo: { heading: string; sub: string; pill: string };
  legalWarn: string[];
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  styles: FlowStyles;
  logoUri: string;
  qrUri: string;
}

/** ค่าปรับแต่งโปสเตอร์ตู้ (portrait) */
export interface CabinetConfig {
  fontFamily: string;
  scale: number;
  palette: Palette;
  brand: string;
  headline: string;
  subheadline: string;
  qrCaption: string;
  steps: { n: string; title: string; sub: string }[];
  footer: string;
  site: string;
  lineId: string;
  styles: CabinetStyles;
  logoUri: string;
  qrUri: string;
}

export interface BuiltSvg {
  svg: string;
  width: number;
  height: number;
}
