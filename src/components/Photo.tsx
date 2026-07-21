"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * รูปประกอบ — ใช้ next/image (แปลง webp/avif + ส่งขนาดตามจอ + จองพื้นที่กัน layout shift)
 * เดิมเป็น <img> ดิบไม่ระบุขนาด → รูปกระโดดตอนโหลด (CLS) และส่งไฟล์เต็มขนาดเสมอ
 *
 * className ใส่ที่กล่องครอบ (กำหนด aspect ratio / ความสูง / มุมโค้ง)
 * ตัวรูปใช้ fill + object-cover เสมอ · โหลดไม่ได้ → fallback เป็น gradient เขียว ไม่มีรูปแตก
 */
export function Photo({
  src,
  alt,
  className,
  grad = "from-brand-400 to-emerald-600",
  priority,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src: string;
  alt: string;
  className?: string;
  grad?: string;
  /** true สำหรับรูป hero (องค์ประกอบ LCP) — โหลดก่อน ไม่ lazy */
  priority?: boolean;
  sizes?: string;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className={`bg-gradient-to-br ${grad} ${className ?? ""}`} aria-label={alt} />;
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setOk(false)}
        className="object-cover"
      />
    </div>
  );
}
