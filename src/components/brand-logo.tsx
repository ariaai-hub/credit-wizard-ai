import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  dark?: boolean;
  compact?: boolean;
};

export function BrandLogo({ href = "/", dark = false, compact = false }: BrandLogoProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-700 shadow-[0_16px_36px_rgba(37,99,235,0.24)]">
        <div className="absolute inset-[1px] rounded-[1rem] bg-[#081120]" />
        <svg viewBox="0 0 44 44" className="relative h-8 w-8" aria-hidden="true">
          <defs>
            <linearGradient id="creditwizard-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <circle cx="22" cy="22" r="12.5" fill="none" stroke="url(#creditwizard-mark)" strokeWidth="3" strokeLinecap="round" strokeDasharray="61 20" transform="rotate(-28 22 22)" />
          <circle cx="22" cy="22" r="5.5" fill="#ffffff" fillOpacity="0.96" />
          <path d="M29.4 11.6L30.5 14.3L33.2 15.4L30.5 16.5L29.4 19.2L28.3 16.5L25.6 15.4L28.3 14.3L29.4 11.6Z" fill="#ffffff" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold tracking-[0.08em] ${dark ? "text-white" : "text-slate-950"}`}>
          Credit Wizard AI
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
