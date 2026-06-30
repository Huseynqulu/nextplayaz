import { Gamepad2 } from "lucide-react";

/** Deterministic gradient + initials cover used when a product has no image. */
export function ProductCoverPlaceholder({ title, className = "" }: { title: string; className?: string }) {
  // Take the part before " | " as the game name, then first 1-2 letters
  const name = (title.split("|")[0] || title).trim();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Hash title -> hue for stable, varied gradient
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 55) % 360;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center text-center px-3 ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue1} 70% 22%), hsl(${hue2} 70% 14%))`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-20" style={{
        background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 50%)"
      }} />
      <Gamepad2 className="h-8 w-8 mb-2 text-white/80 drop-shadow" />
      <div className="font-display text-3xl font-black text-white/95 leading-none drop-shadow">
        {initials || "NP"}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-widest text-white/70 font-semibold line-clamp-2 max-w-full">
        {name}
      </div>
    </div>
  );
}
