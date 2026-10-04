import { cn } from "@/lib/utils";

/** Non-interactive "Satıcı ol" label with a "Tezliklə" badge (single-store mode). */
export function ComingSoonSeller({ label = "Satıcı ol", className }: { label?: string; className?: string }) {
  return (
    <span
      aria-disabled="true"
      title="Tezliklə"
      className={cn("inline-flex items-center gap-1.5 cursor-not-allowed select-none opacity-70", className)}
    >
      {label}
      <span className="px-1.5 py-0.5 rounded-md bg-neon/15 text-neon border border-neon/30 text-[9px] font-bold uppercase tracking-wider leading-none">
        Tezliklə
      </span>
    </span>
  );
}
