import { cn } from "@/lib/utils";

/**
 * โลโก้ ถุงเขียว — อักษรย่อ "TK" (Thung Khiao) สีขาวบนสี่เหลี่ยมมนสีเขียว
 * ใช้เรขาคณิต (ไม่พึ่งฟอนต์) เพื่อให้ render ได้ทั้งเว็บและ native (icon/splash)
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      role="img"
      aria-label="ถุงเขียว (TK)"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tk-bg" x1="256" y1="16" x2="256" y2="504" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3fd97f" />
          <stop offset="0.5" stopColor="#1c9a4e" />
          <stop offset="1" stopColor="#0f5f30" />
        </linearGradient>
        <radialGradient id="tk-gloss" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.72" stopColor="#ffffff" stopOpacity="0.24" />
          <stop offset="0.93" stopColor="#ffffff" stopOpacity="0.13" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="tk-clip">
          <rect x="8" y="8" width="496" height="496" rx="108" />
        </clipPath>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="108" fill="url(#tk-bg)" />
      <g clipPath="url(#tk-clip)">
        <circle cx="118" cy="94" r="342" fill="url(#tk-gloss)" />
        <circle cx="118" cy="94" r="342" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="4" />
      </g>
      <rect x="9" y="9" width="494" height="494" rx="107" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" />
      {/* TK monogram */}
      <g fill="#ffffff">
        <rect x="132" y="168" width="120" height="36" rx="9" />
        <rect x="174" y="168" width="36" height="180" rx="9" />
        <rect x="272" y="168" width="36" height="180" rx="9" />
      </g>
      <g stroke="#ffffff" strokeWidth="36" strokeLinecap="round" fill="none">
        <path d="M308 258 L392 168" />
        <path d="M308 258 L392 348" />
      </g>
    </svg>
  );
}

/** โลโก้ + ชื่อแบรนด์ ถุงเขียว */
export function LogoWordmark({
  size = 32,
  className,
  subtitle,
}: {
  size?: number;
  className?: string;
  subtitle?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight text-neutral-900">
          ถุง<span className="text-brand-600">เขียว</span>
        </span>
        {subtitle && <span className="block text-[11px] font-medium text-neutral-400">{subtitle}</span>}
      </span>
    </span>
  );
}
