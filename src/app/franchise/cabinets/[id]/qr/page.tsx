"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { CabinetQrPrint } from "@/components/CabinetQrPrint";
import { ArrowLeft } from "lucide-react";

export default function FranchiseCabinetQrPage() {
  const { id } = useParams<{ id: string }>();
  const { db, currentUser } = useStore();
  const cab = db.cabinets.find((c) => c.id === id && c.franchiseId === currentUser?.franchiseId);

  if (!cab) {
    return (
      <div className="space-y-4">
        <Link href="/franchise" className="inline-flex items-center gap-1 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        <p className="py-16 text-center text-neutral-400">ไม่พบตู้นี้ในแฟรนไชส์ของคุณ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/franchise" className="no-print inline-flex items-center gap-1 text-sm font-medium text-neutral-500">
        <ArrowLeft className="h-4 w-4" /> กลับแดชบอร์ด
      </Link>
      <CabinetQrPrint cab={cab} />
    </div>
  );
}
