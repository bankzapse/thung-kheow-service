import { cn } from "@/lib/utils";

/**
 * โลโก้ ถุงเขียว — ถุงตาข่ายสีเขียว + ลูกศรรีไซเคิล (mesh bag + recycle)
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
      aria-label="ถุงเขียว"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gd-grad" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <clipPath id="gd-bag">
          <path d="M18 12C11 15 8 25 10 33C12 41 18 44 24 44C30 44 36 41 38 33C40 25 37 15 30 12Z" />
        </clipPath>
      </defs>
      {/* tie / คอถุงมัดปาก */}
      <path d="M17.5 7.5h13a2 2 0 0 1 2 2.4l-.5 2.6a1.6 1.6 0 0 1-1.6 1.3H17.6a1.6 1.6 0 0 1-1.6-1.3l-.5-2.6a2 2 0 0 1 2-2.4Z" fill="#15803d" />
      {/* ถุง (bag body) */}
      <path d="M18 12C11 15 8 25 10 33C12 41 18 44 24 44C30 44 36 41 38 33C40 25 37 15 30 12Z" fill="url(#gd-grad)" />
      {/* ตาข่าย (mesh hint) */}
      <g clipPath="url(#gd-bag)" stroke="#ffffff" strokeWidth="0.9" opacity="0.16">
        <path d="M6 20l36 0M6 27l36 0M6 34l36 0M6 41l36 0" />
        <path d="M14 10l0 38M21 10l0 38M28 10l0 38M35 10l0 38" />
      </g>
      {/* recycle loop (white) */}
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M18 29.5a6.5 6.5 0 0 1 10.3-4.8" />
        <path d="M30 31.7a6.5 6.5 0 0 1-10.4 4.5" />
      </g>
      <path d="M28.8 21.4l0.4 4.1-4-0.9z" fill="#ffffff" />
      <path d="M19.2 39.9l-0.4-4.1 4 0.9z" fill="#ffffff" />
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
