import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ถุงเขียว — Native WebView wrapper (Capacitor)
 * ห่อเว็บ production เป็นแอป iOS/Android โดยโหลดจาก server.url
 * (ไม่ต้อง build เว็บซ้ำ — ใช้ตัวที่ deploy บน Vercel)
 *
 * วิธีใช้: ดู native/README.md
 */
const config: CapacitorConfig = {
  appId: "co.thungkhiao.app", // bundle id / package — จองให้ตรงกันทั้ง 2 store
  appName: "ถุงเขียว",
  webDir: "public", // placeholder (โหลดจริงจาก server.url) แต่ Capacitor ต้องมี
  server: {
    url: "https://app.thungkhiao.co", // โดเมน production ของเว็บ
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#16a34a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#16a34a",
    },
    // @capacitor-mlkit/barcode-scanning ทำงานผ่านกล้อง ไม่ต้อง config เพิ่ม
    // (iOS ต้องมี NSCameraUsageDescription, Android ต้องมี permission กล้อง — ดู README)
  },
};

export default config;
