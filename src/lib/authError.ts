/**
 * แปลงข้อความ error (Supabase Auth / network / อื่น ๆ) เป็นภาษาไทยที่ผู้ใช้เข้าใจ
 * ใช้ร่วมกันทุก flow เพื่อไม่ให้โชว์ error ภาษาอังกฤษดิบ ๆ กับผู้ใช้
 */
export function friendlyError(e: unknown, fallback = "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง"): string {
  const raw =
    typeof e === "string"
      ? e
      : e instanceof Error
        ? e.message
        : e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message ?? "")
          : "";
  const m = raw.toLowerCase();

  // เครือข่าย / เชื่อมต่อไม่ได้
  if (!raw || m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed") || m.includes("load failed") || m.includes("fetch"))
    return "เชื่อมต่อไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";

  // เข้าสู่ระบบ
  // ใช้ทั้ง login ผู้ขาย (เบอร์) และพอร์ทัลหลังบ้าน (ชื่อผู้ใช้) → ครอบคลุมทั้งคู่
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "ชื่อผู้ใช้/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("phone not confirmed") || m.includes("not confirmed") || m.includes("email not confirmed"))
    return "ยังไม่ได้ยืนยันเบอร์โทร — กรุณาสมัครและยืนยัน OTP ให้เสร็จก่อน";
  if (m.includes("user already registered") || m.includes("already been registered") || m.includes("already exists") || m.includes("duplicate"))
    return "เบอร์นี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบได้เลย";

  // OTP
  if (m.includes("otp") && (m.includes("expired") || m.includes("invalid")))
    return "รหัส OTP ไม่ถูกต้องหรือหมดอายุ — กดขอรหัสใหม่อีกครั้ง";
  if (m.includes("token has expired") || m.includes("expired"))
    return "รหัสหมดอายุแล้ว — กรุณาขอรหัสใหม่";
  if (m.includes("invalid otp") || m.includes("token") && m.includes("invalid"))
    return "รหัส OTP ไม่ถูกต้อง";

  // rate limit
  if (m.includes("rate limit") || m.includes("too many") || m.includes("429"))
    return "ทำรายการถี่เกินไป — รอสักครู่แล้วลองใหม่";

  // รหัสผ่าน
  if (m.includes("password should be") || m.includes("weak password") || m.includes("password"))
    return "รหัสผ่านไม่ปลอดภัยพอ — ใช้อย่างน้อย 6 ตัวอักษร";

  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "ระบบปิดรับสมัครชั่วคราว — กรุณาติดต่อผู้ดูแล";

  // ไม่รู้จัก → คืนข้อความเดิมถ้าเป็นไทยอยู่แล้ว ไม่งั้น fallback
  if (/[ก-๙]/.test(raw)) return raw;
  return fallback;
}
