"use client";

import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import PosterEditor from "./PosterEditor";

export default function PostersPage() {
  const { currentUser } = useStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Printer className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-800">โปสเตอร์ / ป้ายพิมพ์</h1>
          <p className="text-sm text-neutral-500">แก้ข้อความ ฟอนต์ ขนาด รูป ไอคอน แล้วพิมพ์หรือดาวน์โหลด</p>
        </div>
      </div>
      <PosterEditor userName={currentUser?.name || "ผู้ดูแล"} />
    </div>
  );
}
