"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { liffConfigured, isInLineClient } from "@/lib/liff";
import { safeNextPath } from "@/lib/utils";

/**
 * เปิดจากในแอป LINE ที่หน้าแรก (/) → พาเข้าแอปเลย ไม่ต้องดูหน้าการตลาด
 *
 * ทำไมต้องแก้ที่นี่ ไม่ใช่เปลี่ยน LIFF endpoint เป็น /app:
 * LIFF เอา path ต่อท้าย endpoint URL — ถ้าตั้ง endpoint เป็น /app แล้ว
 * liff.line.me/<id>/drop จะกลายเป็น /app/drop ซึ่งไม่มีอยู่จริง
 * → ปุ่มใน Rich Menu พังทั้งหมด · endpoint จึงต้องเป็น root เสมอ
 *
 * ⚠️ liff.state: เปิด liff.line.me/<id>/drop จริง ๆ แล้ว LINE โหลด "หน้าแรก"
 * พร้อม ?liff.state=%2Fdrop ก่อน แล้ว LIFF SDK ค่อยพาไป /drop เอง
 * ถ้าเราเด้งไป /app ทันทีจะไปตัดหน้า → ผู้ใช้เห็นหน้าหลักแวบหนึ่งแล้วค่อยถึงปลายทาง
 * (หรือหลงไปหน้าหลักเลย) → อ่าน liff.state เองแล้วพาไปตรงนั้นทันที
 */
export function LiffEntry() {
  const router = useRouter();

  useEffect(() => {
    if (!liffConfigured) return;
    let cancelled = false;

    // มี liff.state = เปิดจาก LIFF แน่นอน → ไปเลยไม่ต้องรอ liff.init()
    // (ถ้ารอ ผู้ใช้จะเห็นหน้าการตลาดแวบหนึ่งก่อน)
    const state = safeNextPath(new URLSearchParams(window.location.search).get("liff.state"));
    if (state) {
      router.replace(state);
      return;
    }

    // เปิด LIFF URL เปล่า ๆ (ไม่มี path) → เข้าแอปที่หน้าเลือกพอร์ทัล
    isInLineClient()
      .then((inLine) => {
        if (!cancelled && inLine) router.replace("/app");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
