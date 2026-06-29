import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Package, CheckCircle2, Truck, Clock, ShoppingBag, AlertTriangle, MessageSquare, Upload, Video, X, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { uploadChatAttachment } from "@/lib/chat-attachments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Sifarişlər — NextPlay.az" }] }),
});

type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  status: "pending" | "paid" | "delivered" | "completed" | "cancelled" | "refunded" | "dispute";
  delivery_payload: string | null;
  conversation_id: string | null;
  auto_confirm_at: string | null;
  disputed_reason: string | null;
  created_at: string;
  product: { title: string; slug: string; image_url: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  paid: { label: "Escrow-da", cls: "bg-warning/20 text-warning", icon: Clock },
  delivered: { label: "Çatdırıldı", cls: "bg-primary/20 text-primary", icon: Truck },
  completed: { label: "Tamamlandı", cls: "bg-success/20 text-success", icon: CheckCircle2 },
  cancelled: { label: "Ləğv edildi", cls: "bg-muted text-muted-foreground", icon: Clock },
  refunded: { label: "Qaytarıldı", cls: "bg-muted text-muted-foreground", icon: Clock },
  dispute: { label: "Mübahisəli", cls: "bg-destructive/20 text-destructive", icon: Clock },
  pending: { label: "Gözləyir", cls: "bg-muted text-muted-foreground", icon: Clock },
};

function OrdersPage() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeVideoUrl, setDisputeVideoUrl] = useState("");
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [myReviews, setMyReviews] = useState<Record<string, { rating: number; comment: string | null }>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  function openReview(o: Order) {
    setReviewOrder(o);
    const existing = myReviews[o.product_id];
    setReviewRating(existing?.rating ?? 5);
    setReviewHover(0);
    setReviewComment(existing?.comment ?? "");
  }
  async function submitReview() {
    if (!reviewOrder) return;
    setReviewSubmitting(true);
    const { error } = await supabase.rpc("submit_review" as any, {
      p_product_id: reviewOrder.product_id,
      p_rating: reviewRating,
      p_comment: reviewComment.trim() || null,
    });
    setReviewSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rəyiniz əlavə edildi");
    setReviewedIds(s => new Set(s).add(reviewOrder.product_id));
    setReviewOrder(null);
  }

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, product:products(title, slug, image_url)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as any) ?? []);
    const { data: revs } = await supabase
      .from("reviews").select("product_id").eq("reviewer_id", user.id);
    setReviewedIds(new Set(((revs as any[]) ?? []).map(r => r.product_id)));
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);



  async function confirm(o: Order) {
    setBusy(o.id);
    const { error } = await supabase.rpc("confirm_order", { p_order_id: o.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Təsdiq edildi, satıcıya ödəniş köçürüldü"); refresh(); }
  }

  function openDispute(o: Order) {
    setDisputeOrder(o);
    setDisputeReason("");
    setDisputeVideoUrl("");
    setDisputeFile(null);
  }

  async function submitDispute() {
    if (!disputeOrder || !user) return;
    const reason = disputeReason.trim();
    const url = disputeVideoUrl.trim();
    if (reason.length < 5) { toast.error("Səbəb minimum 5 simvol olmalıdır"); return; }
    if (!url && !disputeFile) {
      toast.error("Video linki (Streamable və s.) və ya ekran görüntüsü mütləq əlavə edilməlidir");
      return;
    }
    if (url && !/^https?:\/\/.{8,}/i.test(url)) {
      toast.error("Video linki düzgün deyil (https://... formatında olmalıdır)");
      return;
    }
    setDisputeSubmitting(true);
    try {
      let path: string | null = null;
      if (disputeFile) path = await uploadChatAttachment(disputeFile, user.id);
      const { error } = await supabase.rpc("dispute_order" as any, {
        p_order_id: disputeOrder.id,
        p_reason: reason,
        p_evidence_url: url || null,
        p_evidence_path: path,
      });
      if (error) throw error;
      toast.success("Etiraz göndərildi, dəstək baxacaq");
      setDisputeOrder(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Xəta baş verdi");
    } finally {
      setDisputeSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-7 w-7 text-neon" /> Sifarişlər
          </h1>
          <p className="text-muted-foreground mt-2 mb-8">Aldığınız məhsulların escrow ilə qorunan sifarişləri.</p>


          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Hələ sifariş yoxdur.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <div key={o.id} className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                    <div className="flex gap-4">
                      {o.product?.image_url ? (
                        <img src={o.product.image_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-surface grid place-items-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{o.product?.title ?? "Məhsul"}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {o.quantity} ədəd · {format(o.unit_price)} · {new Date(o.created_at).toLocaleString("az-AZ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-lg font-bold text-gradient">{format(o.total)}</div>
                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.cls}`}>
                              <Icon className="h-3 w-3" /> {s.label}
                            </span>
                          </div>
                        </div>

                        {/* Buyer actions */}
                        {o.delivery_payload && (
                          <div className="mt-3 p-3 rounded-lg bg-background border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Çatdırılma məlumatı:</p>
                            <code className="text-sm break-all">{o.delivery_payload}</code>
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {o.conversation_id && (
                            <Link to="/messages/$conversationId" params={{ conversationId: o.conversation_id }}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-semibold hover:border-primary">
                              <MessageSquare className="h-4 w-4" /> Söhbət
                            </Link>
                          )}

                          {(o.status === "delivered" || o.status === "paid") && (
                            <button disabled={busy === o.id} onClick={() => confirm(o)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                              <CheckCircle2 className="h-4 w-4" /> Çatdırılmanı təsdiq et
                            </button>
                          )}
                          {(o.status === "paid" || o.status === "delivered") && (
                            <button disabled={busy === o.id} onClick={() => openDispute(o)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:opacity-50">
                              <AlertTriangle className="h-4 w-4" /> Etiraz et
                            </button>
                          )}
                          {o.status === "dispute" && (
                            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-warning/10 border border-warning/40 text-warning text-xs font-semibold">
                              <AlertTriangle className="h-4 w-4" /> Etiraz açıqdır {o.disputed_reason ? `· ${o.disputed_reason}` : ""}
                            </span>
                          )}
                          {o.auto_confirm_at && o.status === "delivered" && (
                            <span className="text-[11px] text-muted-foreground self-center">
                              Avtomatik təsdiq: {new Date(o.auto_confirm_at).toLocaleString("az-AZ")}
                            </span>
                          )}
                          {o.status === "completed" && (
                            reviewedIds.has(o.product_id) ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-success self-center">
                                <Star className="h-3 w-3 fill-success" /> Rəy verilib
                              </span>
                            ) : (
                              <button
                                onClick={() => openReview(o)}
                                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-warning/40 text-warning text-xs font-medium hover:bg-warning/10"
                              >
                                <Star className="h-3 w-3" /> Dəyərləndir
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!disputeOrder} onOpenChange={(o) => !o && setDisputeOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Sifarişə etiraz et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs text-warning-foreground">
              <strong>Diqqət:</strong> Etiraz baxılması üçün <u>video qeyd</u> (Streamable, Google Drive, YouTube unlisted və s.) və ya <u>ekran görüntüsü</u> mütləq əlavə edilməlidir. Sübut olmadan etiraz nəzərə alınmayacaq.
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Səbəb (min. 5 simvol)</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                placeholder="Problemi qısa izah edin..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5">
                <Video className="h-4 w-4" /> Video linki (Streamable, Drive, YouTube...)
              </label>
              <Input
                type="url"
                placeholder="https://streamable.com/..."
                value={disputeVideoUrl}
                onChange={(e) => setDisputeVideoUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Streamable üçün: streamable.com saytına daxil olub videonu yükləyin, linki buraya yapışdırın.
              </p>
            </div>
            <div className="text-center text-xs text-muted-foreground">— və ya —</div>
            <div>
              <label className="text-sm font-medium block mb-1.5 flex items-center gap-1.5">
                <Upload className="h-4 w-4" /> Ekran görüntüsü (şəkil, max 8MB)
              </label>
              {disputeFile ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface">
                  <img src={URL.createObjectURL(disputeFile)} alt="" className="h-12 w-12 rounded object-cover" />
                  <span className="text-sm flex-1 truncate">{disputeFile.name}</span>
                  <button onClick={() => setDisputeFile(null)} className="p-1 hover:bg-background rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDisputeFile(e.target.files?.[0] ?? null)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOrder(null)} disabled={disputeSubmitting}>
              Ləğv et
            </Button>
            <Button onClick={submitDispute} disabled={disputeSubmitting} className="bg-destructive hover:bg-destructive/90">
              {disputeSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Etirazı göndər
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !reviewSubmitting && setReviewOrder(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card card-shadow overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold inline-flex items-center gap-2">
                <Star className="h-5 w-5 text-warning fill-warning" /> Məhsulu dəyərləndir
              </h3>
              <button onClick={() => !reviewSubmitting && setReviewOrder(null)} className="text-muted-foreground hover:text-foreground" aria-label="Bağla">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{reviewOrder.product?.title}</p>
              <div className="flex items-center justify-center gap-1 py-2" onMouseLeave={() => setReviewHover(0)}>
                {[1,2,3,4,5].map(n => {
                  const filled = (reviewHover || reviewRating) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setReviewHover(n)}
                      onClick={() => setReviewRating(n)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`${n} ulduz`}
                    >
                      <Star className={`h-9 w-9 ${filled ? "text-warning fill-warning" : "text-muted-foreground/40"}`} />
                    </button>
                  );
                })}
              </div>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Təcrübənizi paylaşın (istəyə bağlı)…"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border focus:border-primary outline-none text-sm resize-none"
              />
              <div className="text-[11px] text-muted-foreground text-right">{reviewComment.length}/500</div>
            </div>
            <div className="flex gap-2 p-4 border-t border-border">
              <button onClick={() => setReviewOrder(null)} disabled={reviewSubmitting} className="h-11 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface disabled:opacity-50">Ləğv et</button>
              <button onClick={submitReview} disabled={reviewSubmitting} className="flex-1 h-11 rounded-xl bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {reviewSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Rəyi göndər
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
