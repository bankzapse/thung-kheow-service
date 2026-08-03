/**
 * สร้าง payload PromptPay QR ตามมาตรฐาน EMVCo (ไม่ต้องใช้ payment gateway)
 * สแกนด้วยแอปธนาคารเพื่อโอนเข้าเบอร์/เลขบัตร ปชช. ของผู้รับ พร้อมยอดเงิน
 */
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * phone 08x → 0066..., เลขบัตร ปชช. 13 หลัก → tag 02, e-Wallet 15 หลัก → tag 03
 *
 * ⚠️ ลำดับ if สำคัญ: ต้องเช็ค 15 ก่อน 13 ไม่งั้น e-Wallet จะตกไปสาขา mobile
 * (ก่อนแก้: 15 หลักตกลงมาที่ tag 01 แล้ว padStart(13) ไม่ทำงาน → ค่า 17 ตัวอักษร
 *  = QR ที่แอปธนาคารสแกนไม่ผ่าน โดยไม่มี error ให้เห็น)
 */
function formatTarget(target: string): { tag: string; value: string } {
  const digits = target.replace(/\D/g, "");
  if (digits.length === 15) return { tag: "03", value: digits }; // e-Wallet
  if (digits.length === 13) return { tag: "02", value: digits }; // national id
  return { tag: "01", value: ("66" + digits.replace(/^0/, "")).padStart(13, "0") }; // mobile
}

/** คืน string สำหรับสร้าง QR (มี CRC ท้าย) */
export function promptPayPayload(target: string, amount?: number): string {
  const t = formatTarget(target);
  const merchant = tlv("29", tlv("00", "A000000677010111") + tlv(t.tag, t.value));
  const hasAmount = amount != null && amount > 0;
  const body =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") +
    merchant +
    tlv("58", "TH") +
    tlv("53", "764") +
    (hasAmount ? tlv("54", amount.toFixed(2)) : "") +
    "6304";
  return body + crc16(body);
}
