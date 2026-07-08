#!/usr/bin/env bash
# ถุงเขียว — bootstrap แอป native (Capacitor) จากศูนย์
# รันบน Mac (มี Node ≥18, Xcode + CocoaPods สำหรับ iOS, Android Studio + JDK 17 สำหรับ Android)
#   cd native && bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "▸ ติดตั้ง dependencies…"
npm install

echo "▸ generate icon + splash จาก resources/logo.svg…"
npm run assets || echo "  (ข้าม assets — ติดตั้ง @capacitor/assets ไม่สำเร็จ ทำภายหลังด้วย npm run assets)"

if [ ! -d ios ]; then
  echo "▸ เพิ่มแพลตฟอร์ม iOS…"
  npm run add:ios
fi
if [ ! -d android ]; then
  echo "▸ เพิ่มแพลตฟอร์ม Android…"
  npm run add:android
fi

echo "▸ sync เว็บ + ปลั๊กอินเข้าโปรเจกต์ native…"
npm run sync

cat <<'EOF'

✅ เสร็จ — ขั้นต่อไป:
  1) แก้ server.url ใน capacitor.config.ts ให้เป็นโดเมน production จริง แล้ว `npm run sync`
  2) เพิ่ม permission กล้อง (ดู README หัวข้อ "กล้อง/QR"):
       iOS:     NSCameraUsageDescription ใน ios/App/App/Info.plist
       Android: <uses-permission android:name="android.permission.CAMERA"/> ใน AndroidManifest.xml
  3) เปิดโปรเจกต์:
       npm run open:ios       # Xcode → เลือกทีม signing → Run / Archive → TestFlight
       npm run open:android   # Android Studio → Run / Build > Generate Signed Bundle (.aab)
EOF
