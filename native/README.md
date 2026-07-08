# GreenDrop — Native App (WebView wrapper)

แอป iOS/Android แบบ **WebView** ที่โหลดเว็บ production (บน Vercel) มาแสดง — ใช้โค้ดเว็บชุดเดียว ไม่ต้องเขียนแอปแยก 2 แพลตฟอร์ม เหมาะกับ MVP

## ทำไมใช้ WebView
- โค้ดเดียว (เว็บ) → iOS + Android + เว็บ ใช้ร่วมกัน
- อัปเดตฟีเจอร์ = deploy เว็บ ไม่ต้องส่ง store ใหม่ทุกครั้ง
- ผ่านรีวิว store ได้ ถ้าเป็นแอปที่ให้คุณค่าจริง (มี native features เช่น กล้องสแกน, push)

## Stack: Capacitor
1) สร้าง native shell:
```bash
mkdir greendrop-native && cd greendrop-native
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init GreenDrop co.greendrop.app --web-dir public
mkdir -p public && echo "GreenDrop" > public/index.html   # placeholder
cp ../recycle-fund/native/capacitor.config.ts .           # ใช้ config ที่เตรียมไว้
```

2) แก้ `server.url` ใน `capacitor.config.ts` เป็นโดเมน production จริง (เช่น `https://app.greendrop.co`)

3) เพิ่มแพลตฟอร์ม + เปิด:
```bash
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios       # เปิด Xcode → run
npx cap open android   # เปิด Android Studio → run
```

## QR scanner ในแอป native
- ในเว็บ/LINE ใช้ `liff.scanCodeV2()` (โค้ดเว็บทำไว้แล้ว, fallback กรอกเอง)
- ในแอป native (ไม่ใช่ LINE) LIFF scan ใช้ไม่ได้ → เพิ่มปลั๊กอินกล้อง:
  ```bash
  npm i @capacitor-mlkit/barcode-scanning
  npx cap sync
  ```
  แล้ว bridge ผลลัพธ์เข้าเว็บผ่าน `window.postMessage`/custom scheme (แก้ `scanQr()` ใน `src/lib/liff.ts` ให้เรียก native เมื่ออยู่ในแอป — ตรวจ `Capacitor.isNativePlatform()`)

## Push notification (ทีหลัง)
- `@capacitor/push-notifications` + FCM (Android) / APNs (iOS) — แจ้งเตือนเมื่อคะแนนเข้า/แลกเงินอนุมัติ
- หรือใช้ LINE Messaging API (ฟรี, คนไทยเปิดอ่านสูง) สำหรับผู้ใช้ที่เชื่อม LINE

## สิ่งที่ต้องมีตอนส่ง store
- **Apple**: Apple Developer Program ($99/ปี), App Store Connect, ไอคอน 1024px, คำอธิบาย, Privacy Policy URL, TestFlight
- **Google**: Google Play Console ($25 ครั้งเดียว), ไอคอน 512px, feature graphic, Data safety form, Privacy Policy URL
- Bundle id / package: `co.greendrop.app` (จองให้ตรงกันทั้ง 2 store)
