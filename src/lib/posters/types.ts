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
  logoUri: string;
  qrUri: string;
}

export interface BuiltSvg {
  svg: string;
  width: number;
  height: number;
}
