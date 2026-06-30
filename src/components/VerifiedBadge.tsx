import { BadgeCheck } from "lucide-react";

type Variant = "icon" | "pill" | "floating";
type Props = {
  verified?: boolean | string | null;
  size?: number;
  className?: string;
  variant?: Variant;
  label?: string;
};

/**
 * Doğrulanmış satıcı rozeti.
 * - `icon`: kompakt ikon + label (default).
 * - `pill`: göy gradient pill, kart/header üçün görünən.
 * - `floating`: kart şəklinin üstündə yerləşən parlaq rozet.
 */
export function VerifiedBadge({
  verified,
  size = 14,
  className = "",
  variant = "icon",
  label = "Doğrulanmış",
}: Props) {
  if (!verified) return null;

  if (variant === "floating") {
    return (
      <span
        title="Doğrulanmış satıcı (KYC tamamlanıb)"
        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_12px_rgba(56,189,248,0.55)] ring-1 ring-white/30 ${className}`}
      >
        <BadgeCheck size={size} strokeWidth={2.5} />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <span
        title="Doğrulanmış satıcı (KYC tamamlanıb)"
        className={`inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-400/40 ${className}`}
      >
        <BadgeCheck size={size} strokeWidth={2.5} className="text-sky-300" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      title="Doğrulanmış satıcı (KYC tamamlanıb)"
      className={`inline-flex items-center gap-1 align-middle text-sky-400 ${className}`}
    >
      <BadgeCheck size={size} strokeWidth={2.5} className="fill-sky-500/25" />
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
}
