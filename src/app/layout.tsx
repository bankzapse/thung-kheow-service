import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toaster, GlobalLoadingBar } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { NativeBootstrap } from "@/components/NativeBootstrap";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESC } from "@/lib/site";

const fontSans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // ทำให้ OG/canonical แบบ relative แปลงเป็น URL เต็มได้ทุกหน้า
  title: {
    default: "ถุงเขียว — หย่อนขยะรีไซเคิล สะสมแต้ม แลกเงิน",
    template: "%s | ถุงเขียว",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESC },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon-48.png", sizes: "48x48" }],
    apple: "/icon-180.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE_NAME },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  // ไม่ล็อก maximumScale — การบล็อกซูมเป็นปัญหาการเข้าถึง (WCAG 1.4.4)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontSans.variable}>
      <body>
        <StoreProvider>
          <NativeBootstrap />
          <GlobalLoadingBar />
          <Shell>{children}</Shell>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
