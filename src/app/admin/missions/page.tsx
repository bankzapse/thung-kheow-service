"use client";

import { MissionsEditor } from "@/components/MissionsEditor";
import { MonthlyBonusClose } from "@/components/MonthlyBonusClose";

export default function AdminMissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">ภารกิจ & โบนัส</h1>
        <p className="text-sm text-neutral-500">บริษัทกำหนดกิจกรรม (ภารกิจ) + แต้ม · ปิดยอดจ่ายโบนัสประจำเดือน · รางวัลแบบได้แน่นอน (ไม่เสี่ยงโชค)</p>
      </div>
      <div className="max-w-2xl space-y-6">
        <MissionsEditor />
        <MonthlyBonusClose />
      </div>
    </div>
  );
}
