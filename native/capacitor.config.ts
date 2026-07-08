import type { CapacitorConfig } from "@capacitor/cli";

/**
 * GreenDrop — Native WebView wrapper (Capacitor)
 * ห่อเว็บ production เป็นแอป iOS/Android โดยโหลดจาก server.url
 * (ไม่ต้อง build เว็บซ้ำ — ใช้ตัวที่ deploy บน Vercel)
 *
 * วิธีใช้: ดู native/README.md
 */
const config: CapacitorConfig = {
  appId: "co.greendrop.app", // เปลี่ยนเป็น bundle id จริงตอนสมัคร store
  appName: "GreenDrop",
  webDir: "public", // ไม่ได้ใช้จริง (โหลดจาก server.url) แต่ Capacitor ต้องมี
  server: {
    url: "https://app.greendrop.co", // โดเมน production ของเว็บ
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: "#16a34a" },
  },
};

export default config;
