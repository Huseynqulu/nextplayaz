import { useState } from "react";
import { Zap, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Parses a "Anında çatdırılma" system message and renders each delivered
 * stock item as its own copy-friendly card. Falls back to null if the body
 * does not look like an instant-delivery payload.
 */
export function DeliveryCard({ body }: { body: string }) {
  const marker = "🔑 Məhsul məlumatı:";
  const idx = body.indexOf(marker);
  if (idx === -1) return null;

  const before = body.slice(0, idx).trim();
  const after = body.slice(idx + marker.length);
  const tailIdx = after.search(/\n\s*\n/);
  const itemsBlock = tailIdx === -1 ? after : after.slice(0, tailIdx);
  const footer = tailIdx === -1 ? "" : after.slice(tailIdx).trim();

  const items = itemsBlock
    .split("\n")
    .map(l => l.replace(/^\s*•\s*/, "").trim())
    .filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-[480px] mx-auto rounded-2xl border border-neon/40 bg-gradient-to-br from-neon/10 via-background to-background p-4 shadow-[0_0_30px_-12px_hsl(var(--neon)/0.5)] my-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-neon/20 text-neon">
          <Zap className="h-4 w-4" />
        </span>
        <div className="text-sm font-bold text-foreground">Sürətli çatdırılma</div>
      </div>
      {before && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-3">
          {before.replace(/^✅\s*Sürətli çatdırılma\s*—\s*/, "")}
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <DeliveryItemRow key={i} index={i + 1} value={item} total={items.length} />
        ))}
      </div>

      {footer && (
        <p className="text-[11px] text-muted-foreground mt-3 whitespace-pre-wrap">{footer}</p>
      )}
    </div>
  );
}

function DeliveryItemRow({ index, value, total }: { index: number; value: string; total: number }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Kopyalandı");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopyalamaq alınmadı");
    }
  };

  const masked = "•".repeat(Math.min(value.length, 24));

  return (
    <div className="rounded-xl border border-border bg-background/60 backdrop-blur p-2.5 flex items-center gap-2">
      {total > 1 && (
        <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
          {index}
        </span>
      )}
      <code className="flex-1 font-mono text-sm break-all select-all text-foreground">
        {shown ? value : masked}
      </code>
      <button
        type="button"
        onClick={() => setShown(s => !s)}
        className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground transition"
        aria-label={shown ? "Gizlət" : "Göstər"}
        title={shown ? "Gizlət" : "Göstər"}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-neon/15 hover:bg-neon/25 text-neon text-xs font-semibold transition"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}
