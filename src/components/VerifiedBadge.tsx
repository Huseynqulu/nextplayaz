import { BadgeCheck } from "lucide-react";

type Props = { verified?: boolean | string | null; size?: number; className?: string; showLabel?: boolean };

export function VerifiedBadge({ verified, size = 16, className = "", showLabel = false }: Props) {
  if (!verified) return null;
  return (
    <span
      title="Doğrulanmış satıcı (KYC tamamlanıb)"
      className={`inline-flex items-center gap-1 text-sky-400 align-middle ${className}`}
    >
      <BadgeCheck size={size} className="fill-sky-500/20" />
      {showLabel && <span className="text-xs font-medium">Doğrulanmış</span>}
    </span>
  );
}
