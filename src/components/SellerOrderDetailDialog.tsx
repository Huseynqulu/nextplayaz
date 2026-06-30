import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { X, Loader2, Star, MessageSquare, Package, Copy, Check, User as UserIcon, Send, Trash2 } from "lucide-react";
import { useCurrency } from "@/lib/currency";

type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  status: string;
  delivery_payload: string | null;
  conversation_id: string | null;
  disputed_reason: string | null;
  created_at: string;
  product: { title: string; slug: string; image_url: string | null } | null;
};

type Buyer = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Review = { id: string; rating: number; comment: string | null; created_at: string; seller_reply: string | null; seller_replied_at: string | null };

export function SellerOrderDetailDialog({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged?: () => void }) {
  const { format } = useCurrency();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, r] = await Promise.all([
        supabase.from("public_profiles").select("id, display_name, username, avatar_url").eq("id", order.buyer_id).maybeSingle(),
        supabase.from("reviews").select("id, rating, comment, created_at, seller_reply, seller_replied_at").eq("product_id", order.product_id).eq("reviewer_id", order.buyer_id).maybeSingle(),
      ]);
      setBuyer((b.data as any) ?? null);
      const rev = (r.data as any) ?? null;
      setReview(rev);
      setReplyDraft(rev?.seller_reply ?? "");
      setLoading(false);
    })();
  }, [order.id, order.buyer_id, order.product_id]);

  async function copyPayload() {
    if (!order.delivery_payload) return;
    try {
      await navigator.clipboard.writeText(order.delivery_payload);
      setCopied(true);
      toast.success("Kopyalandı");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Kopyalamaq alınmadı"); }
  }

  async function saveReply() {
    if (!review) return;
    const txt = replyDraft.trim();
    setSavingReply(true);
    const { error } = await supabase.rpc("reply_to_review", { p_review_id: review.id, p_reply: txt || null });
    setSavingReply(false);
    if (error) { toast.error(error.message); return; }
    toast.success(txt ? "Cavab göndərildi" : "Cavab silindi");
    setReview({ ...review, seller_reply: txt || null, seller_replied_at: txt ? new Date().toISOString() : null });
    onChanged?.();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <h2 className="font-display text-lg sm:text-xl font-bold">Sifariş detalları</h2>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Product */}
          <div className="flex gap-3">
            {order.product?.image_url ? (
              <img src={order.product.image_url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-surface grid place-items-center shrink-0"><Package className="h-6 w-6 text-muted-foreground" /></div>
            )}
            <div className="min-w-0 flex-1">
              <Link to="/product/$slug" params={{ slug: order.product?.slug ?? "" }} className="font-semibold hover:text-primary block truncate">
                {order.product?.title ?? "Məhsul"}
              </Link>
              <div className="text-xs text-muted-foreground mt-1">
                Sifariş #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleString("az-AZ")}
              </div>
              <div className="mt-2 flex items-center gap-3 flex-wrap text-sm">
                <span>{order.quantity} ədəd × {format(order.unit_price)}</span>
                <span className="font-display font-bold text-gradient">{format(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Buyer */}
          <div className="rounded-xl border border-border bg-surface/40 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Alıcı</div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : buyer ? (
              <Link to="/u/$id" params={{ id: buyer.id }} className="flex items-center gap-3 group">
                {buyer.avatar_url ? (
                  <img src={buyer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted grid place-items-center"><UserIcon className="h-5 w-5 text-muted-foreground" /></div>
                )}
                <div>
                  <div className="font-semibold group-hover:text-primary">{buyer.display_name || buyer.username || "İstifadəçi"}</div>
                  {buyer.username && <div className="text-xs text-muted-foreground">@{buyer.username}</div>}
                </div>
              </Link>
            ) : (
              <div className="text-sm text-muted-foreground">Tapılmadı</div>
            )}
          </div>

          {/* Delivery payload */}
          {order.delivery_payload && (
            <div className="rounded-xl border border-neon/30 bg-neon/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-neon font-semibold">Təhvil verilən məlumat</div>
                <button onClick={copyPayload} className="inline-flex items-center gap-1 text-xs text-neon hover:opacity-80">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
              <pre className="text-sm whitespace-pre-wrap break-all font-mono text-foreground max-h-48 overflow-auto">{order.delivery_payload}</pre>
            </div>
          )}

          {/* Dispute */}
          {order.status === "dispute" && order.disputed_reason && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-warning font-semibold mb-1">Etiraz səbəbi</div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{order.disputed_reason}</p>
            </div>
          )}

          {/* Review */}
          <div className="rounded-xl border border-border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Müştəri rəyi</div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : !review ? (
              <div className="text-sm text-muted-foreground">Hələ rəy yazılmayıb.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= review.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">{new Date(review.created_at).toLocaleDateString("az-AZ")}</span>
                </div>
                {review.comment && <p className="text-sm whitespace-pre-wrap">{review.comment}</p>}

                <div className="border-t border-border pt-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                    {review.seller_reply ? "Cavabın" : "Cavab yaz"}
                  </div>
                  <textarea
                    value={replyDraft}
                    onChange={e => setReplyDraft(e.target.value)}
                    rows={3}
                    placeholder="Müştəriyə təşəkkür edin və ya cavab yazın..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={savingReply || replyDraft.trim() === (review.seller_reply ?? "")}
                      onClick={saveReply}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-neon text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> {review.seller_reply ? "Yenilə" : "Göndər"}
                    </button>
                    {review.seller_reply && (
                      <button
                        disabled={savingReply}
                        onClick={() => { setReplyDraft(""); setTimeout(saveReply, 0); }}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Sil
                      </button>
                    )}
                  </div>
                  {review.seller_replied_at && review.seller_reply && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Cavab verildi: {new Date(review.seller_replied_at).toLocaleString("az-AZ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Conversation link */}
          {order.conversation_id && (
            <Link
              to="/messages/$conversationId"
              params={{ conversationId: order.conversation_id }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-surface text-sm font-semibold hover:border-primary"
            >
              <MessageSquare className="h-4 w-4" /> Söhbəti aç
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
