import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { NativeBootstrap } from "@/components/NativeBootstrap";

const fontSans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ถุงเขียว — หย่อนขยะรีไซเคิล สะสมแต้ม แลกเงิน",
  description: "ถุงเขียว (Thung Khiao) — คัดแยกขยะรีไซเคิลใส่ถุง หย่อนที่ตู้ Drop & Go สแกน QR สะสมแต้ม แลกเป็นเงิน",
  applicationName: "ถุงเขียว",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontSans.variable}>
      <body>
        <StoreProvider>
          <NativeBootstrap />
          <Shell>{children}</Shell>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
