import { cn } from "@/lib/utils";

/**
 * โลโก้ GreenDrop — หยดน้ำสีเขียว + ลูกศรรีไซเคิลหมุน (drop + recycle)
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="GreenDrop"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gd-grad" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      {/* droplet */}
      <path
        d="M24 3.5c0 0 15.5 15.6 15.5 26.2A15.5 15.5 0 1 1 8.5 29.7C8.5 19.1 24 3.5 24 3.5Z"
        fill="url(#gd-grad)"
      />
      {/* recycle loop (white): circular arrow */}
      <g stroke="#fff" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M17.6 27.4a7 7 0 0 1 11.1-5.2" />
        <path d="M30.4 30.1a7 7 0 0 1-11.2 4.9" />
      </g>
      {/* two arrowheads */}
      <path d="M29.2 18.3l0.4 4.4-4.3-1.0z" fill="#fff" />
      <path d="M18.8 39.0l-0.4-4.4 4.3 1.0z" fill="#fff" />
    </svg>
  );
}

/** โลโก้ + ชื่อแบรนด์ */
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
          Green<span className="text-brand-600">Drop</span>
        </span>
        {subtitle && <span className="block text-[11px] font-medium text-neutral-400">{subtitle}</span>}
      </span>
    </span>
  );
}
