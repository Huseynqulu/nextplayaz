import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { CreditCard, Copy, ExternalLink, Loader2, Upload, X, CheckCircle2, FileText } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  title: string;
  unitPrice: number;
  qty: number;
  discountCode?: string;
  onSuccess?: () => void;
};

type PaySetting = { method: string; label: string; instructions: string; is_active: boolean; link_url: string | null };

export function DirectPurchaseDialog({ open, onClose, productId, title, unitPrice, qty, discountCode, onSuccess }: Props) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [setting, setSetting] = useState<PaySetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState<{ ref: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const amount = unitPrice * qty;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFile(null); setPreview(null); setAgreed(false); setDone(null);
    supabase.from("payment_settings").select("*").eq("method", "birbank" as any).maybeSingle()
      .then(({ data }) => { setSetting(data as any); setLoading(false); });
  }, [open]);

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Yalnız şəkil"); return; }
    if (f.size > 6 * 1024 * 1024) { toast.error("Maks 6 MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user) { toast.error("Daxil olun"); return; }
    if (!file) { toast.error("Qəbz şəklini yükləyin"); return; }
    if (!agreed) { toast.error("Şərtləri qəbul edin"); return; }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/order-payments/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("topup-receipts").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("topup-receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
      const receipt_url = signed?.signedUrl ?? null;
      const { data, error } = await supabase.rpc("create_direct_purchase" as any, {
        p_product_id: productId,
        p_quantity: qty,
        p_discount_code: discountCode?.trim() || null,
        p_receipt_url: receipt_url,
        p_receipt_path: path,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? (data as any)[0] : (data as any);
      setDone({ ref: row?.reference ?? "—" });
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Xəta");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !submitting && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card card-shadow overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-lg font-bold inline-flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-neon" /> BirBank ilə ödəniş
          </h3>
          <button onClick={() => !submitting && onClose()} className="text-muted-foreground hover:text-foreground" aria-label="Bağla">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
        ) : done ? (
          <div className="p-6 space-y-4 text-center">
            <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="font-display text-lg font-bold">Qəbz göndərildi</h4>
            <p className="text-sm text-muted-foreground">Referans: <span className="font-mono text-foreground">{done.ref}</span></p>
            <p className="text-xs text-muted-foreground">Admin qəbzi yoxlayacaq və təsdiqlədikdən sonra sifariş avtomatik açılacaq. Bildiriş alacaqsınız.</p>
            <button onClick={onClose} className="mt-2 h-11 px-6 rounded-xl bg-neon text-background font-semibold neon-ring">Bağla</button>
          </div>
        ) : !setting || !setting.is_active ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            BirBank ödəniş üsulu hazırda əlçatan deyil. Zəhmət olmasa, sonra yenidən cəhd edin.
          </div>
        ) : (
          <>
            <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-xl border border-neon/30 bg-neon/5 p-4 space-y-1.5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Sifariş xülasəsi</div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Məhsul</span><span className="font-medium line-clamp-1 max-w-[60%] text-right">{title}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qiymət × Say</span><span className="font-medium">{format(unitPrice)} × {qty}</span></div>
                <div className="flex justify-between pt-2 mt-1 border-t border-border">
                  <span className="font-semibold">Ödəniləcək məbləğ</span>
                  <span className="font-display text-xl font-bold text-neon">{format(amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Ödənişi edin</div>
                {setting.link_url ? (
                  <a href={setting.link_url} target="_blank" rel="noopener noreferrer"
                    className="w-full h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90">
                    <ExternalLink className="h-4 w-4" /> BirBank ödəniş linkini aç
                  </a>
                ) : null}
                {setting.instructions ? (
                  <div className="rounded-lg border border-border bg-surface/50 p-3 text-xs whitespace-pre-wrap font-mono flex items-start justify-between gap-2">
                    <span className="flex-1">{setting.instructions}</span>
                    <button onClick={() => { navigator.clipboard.writeText(setting.instructions); toast.success("Kopyalandı"); }}
                      className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Kopyala"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground">Ödəniş açıqlamasında öz email-inizi yazın: <b className="text-foreground">{user?.email}</b></p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Qəbz şəklini yükləyin</div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onPick(e.target.files?.[0] ?? null)} />
                {preview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={preview} alt="qəbz" className="w-full max-h-64 object-contain bg-surface" />
                    <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/80 border border-border">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary text-sm text-muted-foreground inline-flex flex-col items-center justify-center gap-1">
                    <Upload className="h-5 w-5" /> Qəbz və ya ekran görüntüsü seç
                  </button>
                )}
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-border bg-surface/40 p-3 cursor-pointer select-none">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                <span className="text-xs text-muted-foreground">
                  <FileText className="inline h-3 w-3 mr-1 -mt-0.5" />
                  Ödənişi göndərdim və qəbz orijinaldır. Admin təsdiqlədikdən sonra sifariş avtomatik açılacaq və escrow qoruması ilə saxlanacaq.
                </span>
              </label>
            </div>
            <div className="flex gap-2 p-4 border-t border-border">
              <button onClick={onClose} disabled={submitting}
                className="h-11 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface disabled:opacity-50">
                Ləğv et
              </button>
              <button onClick={submit} disabled={submitting || !file || !agreed}
                className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring inline-flex items-center justify-center gap-2 disabled:opacity-40">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Qəbzi göndər
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
