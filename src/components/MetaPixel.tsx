"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { metaPixelId, metaPixelEnabled } from "@/lib/metapixel";

/**
 * โหลด Meta Pixel + ยิง PageView ตอนเปลี่ยนหน้า (App Router ไม่ reload หน้า)
 * ไม่ตั้ง NEXT_PUBLIC_META_PIXEL_ID = ไม่ render อะไรเลย
 */
export function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!metaPixelEnabled) return;
    // base script ยิง PageView แรกให้แล้ว → ที่นี่ยิงเฉพาะตอน "เปลี่ยนหน้า" ถัดไป
    if (first.current) { first.current = false; return; }
    (window as unknown as { fbq?: (a: string, e: string) => void }).fbq?.("track", "PageView");
  }, [pathname]);

  if (!metaPixelEnabled) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
    </Script>
  );
}
