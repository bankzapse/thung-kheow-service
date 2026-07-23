import type { Metadata } from "next";
import { LegalShell, Sec, UL } from "@/components/LegalShell";
import { LINE_OA_ID, LINE_OA_ADD_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "ขอลบบัญชีและข้อมูล",
  description: "วิธีขอลบบัญชีและข้อมูลส่วนบุคคลออกจาก ถุงเขียว (Thung Khiao)",
};

export default function DeleteAccountPage() {
  return (
    <LegalShell title="ขอลบบัญชีและข้อมูล" subtitle="Account & Data Deletion — ถุงเขียว (Thung Khiao)" updated="8 กรกฎาคม 2569 (2026)">
      <p>
        คุณสามารถขอลบบัญชี ถุงเขียว และข้อมูลส่วนบุคคลของคุณได้ตลอดเวลา หน้านี้อธิบายวิธีขอ ข้อมูลที่จะถูกลบ และระยะเวลาดำเนินการ
        (ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562)
      </p>

      <Sec n={1} title="วิธีขอลบบัญชี">
        <UL
          items={[
            <><b>ในแอป (แนะนำ):</b> แท็บ “โปรไฟล์” → เลื่อนลงล่างสุด → “ลบบัญชีและข้อมูล” → ยืนยัน</>,
            <><b>อีเมล:</b> ส่งคำขอมาที่ <a href="mailto:support@thung-kheow.com?subject=ขอลบบัญชี%20ถุงเขียว" className="text-brand-600">support@thung-kheow.com</a> พร้อมเบอร์โทร/อีเมลที่ใช้สมัคร</>,
            <><b>LINE:</b> ทักหาเราที่ <a href={LINE_OA_ADD_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-600">{LINE_OA_ID}</a> แจ้ง “ขอลบบัญชี”</>,
          ]}
        />
        <p className="text-sm text-neutral-500">เพื่อความปลอดภัย เราจะยืนยันตัวตนก่อนดำเนินการลบ</p>
      </Sec>

      <Sec n={2} title="ข้อมูลที่จะถูกลบ">
        <UL
          items={[
            "ข้อมูลบัญชี: เบอร์โทร, อีเมล, ชื่อ/รูปจาก LINE, LINE User ID",
            "ประวัติการหย่อนถุง, คะแนนคงเหลือ และประวัติคะแนน",
            "บัญชีรับเงิน (พร้อมเพย์/ธนาคาร) ที่บันทึกไว้",
          ]}
        />
      </Sec>

      <Sec n={3} title="ข้อมูลที่อาจเก็บต่อ (ตามกฎหมาย)">
        <p>เราอาจเก็บบางข้อมูลเท่าที่จำเป็นตามกฎหมาย เช่น หลักฐานการโอนเงิน/ธุรกรรมที่ต้องเก็บตามกฎหมายบัญชี-ภาษี หรือเพื่อป้องกันการทุจริต โดยจะเก็บเท่าระยะเวลาที่กฎหมายกำหนด แล้วลบหรือทำให้ไม่ระบุตัวตน</p>
      </Sec>

      <Sec n={4} title="คะแนนคงเหลือ">
        <p>โปรดแลกคะแนนเป็นเงินก่อนขอลบบัญชี — เมื่อลบบัญชีแล้ว คะแนนคงเหลือจะถูกยกเลิกและไม่สามารถกู้คืนได้</p>
      </Sec>

      <Sec n={5} title="ระยะเวลาดำเนินการ">
        <p>เราจะดำเนินการลบภายใน <b>30 วัน</b> นับจากยืนยันคำขอ และจะแจ้งผลกลับทางอีเมล/LINE</p>
      </Sec>

      <Sec n={6} title="ติดต่อ">
        <p>ห้างหุ้นส่วนจำกัด พุงกลม แคทเทอริ่ง · โทร: <a href="tel:0892616445" className="text-brand-600">089-261-6445</a> · อีเมล: <a href="mailto:support@thung-kheow.com" className="text-brand-600">support@thung-kheow.com</a> · LINE: <a href={LINE_OA_ADD_URL} target="_blank" rel="noopener noreferrer" className="text-brand-600">{LINE_OA_ID}</a></p>
      </Sec>
    </LegalShell>
  );
}
