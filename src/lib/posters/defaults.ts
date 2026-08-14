import type { FlowConfig, Palette } from "./types";

export const GREEN_PALETTE: Palette = {
  bg: "#f6fbf8",
  band: "#16a34a",
  bandTo: "#15803d",
  circle: "#22c55e",
  circleTo: "#15803d",
  ink: "#153d29",
  sub: "#5b6b60",
};

export const LINE_OA_ID = "@200iyzrg";
export const LINE_ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;

export const DEFAULT_MATERIALS = [
  { img: "/img/materials/aluminum-can.jpg", label: "กระป๋อง" },
  { img: "/img/materials/pet.jpg", label: "ขวด PET" },
  { img: "/img/materials/hdpe.jpg", label: "ขวดขุ่น HDPE" },
  { img: "/img/materials/pp5.jpg", label: "พลาสติก PP5" },
  { img: "/img/materials/glass-bottle.jpg", label: "ขวดแก้ว" },
  { img: "/img/materials/cardboard.jpg", label: "กระดาษลัง" },
];

export function defaultFlowConfig(): FlowConfig {
  return {
    fontFamily: "IBM Plex Sans Thai",
    scale: 1,
    palette: { ...GREEN_PALETTE },
    headerTitle: "ถุงเขียว",
    headerSubtitle: "เปลี่ยนขยะรีไซเคิลเป็นเงิน · หย่อนถุงที่ตู้ สะสมแต้ม แลกเงิน",
    headerRight: "ขั้นตอนการใช้งาน",
    steps: [
      { icon: "addline", iconColor: "#ffffff", title: "เพิ่มเพื่อนใน LINE", lines: ["สแกน QR นี้เพื่อเพิ่มเพื่อน", "แล้วเปิดเมนูใช้งานในแชท"] },
      { icon: "bag", iconColor: "#ffffff", title: "คัดแยกขยะใส่ถุง", lines: ["ขวด · กระป๋อง · กระดาษ · พลาสติก", "ล้างให้สะอาด · 20 ชิ้นขึ้นไป/ถุง"] },
      { icon: "scan", iconColor: "#ffffff", title: "สแกน QR บนถุง", lines: ["กดเมนู “หย่อนถุง” ในไลน์", "สแกนรหัสบนถุง เช่น TK01-0000001"] },
      { icon: "drop", iconColor: "#ffffff", title: "หย่อนถุงลงตู้", lines: ["หย่อนที่ช่องรับหน้าตู้", "ทีมงานคัดแยกที่โรงงาน"] },
      { icon: "coin", iconColor: "#ffffff", title: "รับคะแนน แลกเงิน", lines: ["คะแนนเข้าบัญชีอัตโนมัติ", "แลกเป็นเงินเข้าพร้อมเพย์ 1 คะแนน = 1 บาท"] },
    ],
    materialsHeading: "รับเฉพาะวัสดุเหล่านี้",
    materialsSub: "ล้างสะอาด · แห้ง · แยกชิ้น · ไม่ปนขยะเปียก",
    warnPill: "ห้ามทิ้งขยะทั่วไป · ขยะเปียก",
    materials: DEFAULT_MATERIALS.map((m) => ({ ...m })),
    promo: { heading: "ลุ้นโชคทุกเดือน", sub: "หย่อนถุงสะสมสิทธิ์ ยิ่งหย่อนยิ่งมีลุ้น", pill: "จับรางวัลทุกสิ้นเดือน" },
    legalWarn: ["คำเตือน! การขโมยถุง", "มีโทษตามกฎหมาย"],
    footerLeft: "thung-kheow.com",
    footerCenter: "1 คะแนน = 1 บาท · โอนเข้าพร้อมเพย์",
    footerRight: "Powered by ถุงเขียว",
    logoUri: "/poster-logo.svg",
    qrUri: "",
  };
}
