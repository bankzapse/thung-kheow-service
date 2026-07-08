"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { CabinetQrPrint } from "@/components/CabinetQrPrint";
import { cabinetFullCode } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export default function CabinetQrPage() {
  const { id } = useParams<{ id: string }>();
  const { db } = useStore();
  const cab = db.cabinets.find((c) => c.id === id);

  if (!cab) {
    return (
      <div className="space-y-4">
        <Link href="/shop/cabinets" className="inline-flex items-center gap-1 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        <p className="py-16 text-center text-neutral-400">ไม่พบตู้นี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/shop/cabinets/${cab.id}`} className="no-print inline-flex items-center gap-1 text-sm font-medium text-neutral-500">
        <ArrowLeft className="h-4 w-4" /> กลับตู้ {cabinetFullCode(cab.franchiseCode, cab.code)}
      </Link>
      <CabinetQrPrint cab={cab} />
    </div>
  );
}
