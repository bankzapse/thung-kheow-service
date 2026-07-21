import { ImageResponse } from "next/og";

/**
 * การ์ดตอนแชร์ลิงก์ (LINE / Facebook / X) — สำคัญมากเพราะแอปกระจายผ่าน LINE เป็นหลัก
 * ไม่มีไฟล์นี้ = การ์ดขึ้นเป็นช่องว่างเปล่า
 *
 * วาดด้วย next/og (Satori) ไม่พึ่งรูปภายนอก — ใช้ฟอนต์ระบบ ไม่ต้องโหลดฟอนต์ไทย
 * (Satori ไม่มีฟอนต์ไทยในตัว จึงใช้ตัวอักษรไทยผ่าน system font ของ runtime ไม่ได้เสมอไป
 *  → ใช้เลย์เอาต์ที่อ่านได้ทั้งไทย/อังกฤษ โดยให้ข้อความหลักเป็นอังกฤษ + โลโก้ TK)
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ถุงเขียว — Thung Khiao";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 168,
            height: 168,
            borderRadius: 40,
            background: "#fff",
            color: "#16a34a",
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -4,
          }}
        >
          TK
        </div>
        <div style={{ marginTop: 40, fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>Thung Khiao</div>
        <div style={{ marginTop: 12, fontSize: 34, opacity: 0.92 }}>Recycle · Earn Points · Get Paid</div>
        <div
          style={{
            marginTop: 34,
            fontSize: 26,
            padding: "12px 30px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
          }}
        >
          Drop Bag · Scan QR · PromptPay
        </div>
      </div>
    ),
    size,
  );
}
