"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR code รูปภาพจากสตริงใดๆ (ใช้พิมพ์ติดตู้/ถุง) */
export function QRImage({ value, size = 140, className }: { value: string; size?: number; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [value, size]);
  if (!url) return <div style={{ width: size, height: size }} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={value} width={size} height={size} className={className} />;
}
