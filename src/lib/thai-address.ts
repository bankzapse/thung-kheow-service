/**
 * ข้อมูลที่อยู่ไทยครบทั้ง 77 จังหวัด (จังหวัด → อำเภอ/เขต → ตำบล/แขวง)
 * ที่มา: ชุดข้อมูลมาตรฐาน (thai-address-database) → 927 อำเภอ/เขต · 7,470 ตำบล/แขวง
 * ใช้สำหรับ dropdown เลือกที่อยู่แบบสเต็ป — ทุกจังหวัดเลือกต่อได้เป็น dropdown
 */
import DATA from "./thai-address-data.json";

export interface AddressDistrict {
  name: string;
  subdistricts: string[];
}
export interface AddressProvince {
  name: string;
  districts: AddressDistrict[];
}

export const THAI_ADDRESS: AddressProvince[] = DATA as AddressProvince[];

/** 77 จังหวัดทั่วไทย (เรียงตามชุดข้อมูล) — ทุกจังหวัดมีอำเภอ/ตำบลให้เลือกต่อ */
export const PROVINCES: string[] = THAI_ADDRESS.map((p) => p.name);

export function districtsOf(province: string): AddressDistrict[] {
  return THAI_ADDRESS.find((p) => p.name === province)?.districts ?? [];
}
export function subdistrictsOf(province: string, district: string): string[] {
  return districtsOf(province).find((d) => d.name === district)?.subdistricts ?? [];
}
