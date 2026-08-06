import { useEffect, useState } from "react";
import { Star, Loader2, MessageSquare, Store, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  seller_reply: string | null;
  seller_replied_at: string | null;
  reviewer?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export function ReviewSection({ productId, sellerId }: { productId: string; sellerId?: string | null }) {
  const { user } = useAuth();
  const t = useT();
  const isSeller = !!user && !!sellerId && user.id === sellerId;
  const [mode, setMode] = useState<"product" | "seller">(sellerId ? "seller" : "product");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Seller reply editor state, per-review
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  async function load() {
    setLoading(true);
    let base: any[] = [];
    if (mode === "seller" && sellerId) {
      const { data: revs } = await supabase.rpc("get_seller_reviews" as any, { p_seller_id: sellerId });
      base = (revs as any[]) ?? [];
    } else {
      const { data: revs } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, seller_reply, seller_replied_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      base = (revs as any[]) ?? [];
    }

    const ids = Array.from(new Set(base.map(r => r.reviewer_id)));
    let profMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("public_profiles" as any).select("id, display_name, username, avatar_url").in("id", ids);
      (profs ?? []).forEach((p: any) => profMap.set(p.id, p));
    }
    const list: Review[] = base.map(r => ({ ...r, reviewer: profMap.get(r.reviewer_id) ?? null }));
    setReviews(list);
    if (user && mode === "product") {
      const mine = list.find(r => r.reviewer_id === user.id) ?? null;
      setMyReview(mine);
      if (mine) { setRating(mine.rating); setComment(mine.comment ?? ""); }
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .eq("product_id", productId)
        .eq("status", "completed");
      setCanReview((count ?? 0) > 0);
    } else {
      setCanReview(false);
      setMyReview(null);
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId, user?.id, mode]);


  async function submit() {
    if (rating < 1 || rating > 5) { toast.error("Reytinq 1-5 arası seçin"); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_review" as any, {
      p_product_id: productId,
      p_rating: rating,
      p_comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(myReview ? "Rəyiniz yeniləndi" : "Rəyiniz əlavə edildi");
    setShowForm(false);
    load();
  }

  async function submitReply(reviewId: string) {
    setReplyBusy(true);
    const { error } = await supabase.rpc("reply_to_review" as any, {
      p_review_id: reviewId,
      p_reply: replyText.trim(),
    });
    setReplyBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(replyText.trim() ? "Cavab göndərildi" : "Cavab silindi");
    setReplyOpen(null);
    setReplyText("");
    load();
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: reviews.filter(r => r.rating === n).length }));

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-neon" /> Rəylər ({reviews.length})
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-4 w-4 ${i <= Math.round(avg) ? "fill-warning text-warning" : "text-muted"}`} />
                ))}
              </div>
              <span className="font-semibold">{avg.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
          )}
        </div>
        {user ? (
          canReview ? (
            <button onClick={() => setShowForm(s => !s)}
              className="h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm neon-ring hover:scale-[1.02] transition">
              {myReview ? "Rəyimi redaktə et" : "Rəy yaz"}
            </button>
          ) : !isSeller ? (
            <p className="text-xs text-muted-foreground max-w-xs text-right">Yalnız bu məhsulu alıb tamamlayan istifadəçilər rəy yaza bilər.</p>
          ) : null
        ) : (
          <Link to="/login" className="text-sm text-primary hover:underline">Rəy yazmaq üçün daxil olun →</Link>
        )}
      </div>

      {sellerId && (
        <div className="mb-5 inline-flex rounded-xl border border-border bg-surface/40 p-1">
          <button
            onClick={() => setMode("product")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${mode === "product" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Bu elana aid dəyərləndirmələr
          </button>
          <button
            onClick={() => setMode("seller")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${mode === "seller" ? "bg-neon text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Satıcının bütün dəyərləndirmələri
          </button>
        </div>
      )}


      {reviews.length > 0 && (
        <div className="mb-6 grid sm:grid-cols-[auto_1fr] gap-6 p-5 rounded-2xl border border-border bg-surface/40">
          <div className="text-center sm:border-r sm:border-border sm:pr-6">
            <div className="font-display text-5xl font-bold text-gradient">{avg.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-1">{reviews.length} rəy</div>
          </div>
          <div className="space-y-1.5">
            {dist.map(({ n, c }) => {
              const pct = reviews.length ? (c / reviews.length) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3 text-xs">
                  <span className="w-6 flex items-center gap-0.5">{n}<Star className="h-3 w-3 fill-warning text-warning" /></span>
                  <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                    <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && canReview && (
        <div className="mb-6 p-5 rounded-2xl border border-primary/40 bg-card-gradient card-shadow">
          <h3 className="font-semibold mb-3">{myReview ? "Rəyini yenilə" : "Təcrübəni paylaş"}</h3>
          <div className="flex items-center gap-1 mb-4" onMouseLeave={() => setHover(0)}>
            {[1,2,3,4,5].map(i => (
              <button key={i} type="button" aria-label={`${i} ulduz`} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)}
                className="p-1 transition hover:scale-110">
                <Star className={`h-7 w-7 ${i <= (hover || rating) ? "fill-warning text-warning" : "text-muted"}`} />
              </button>
            ))}
            <span className="ml-3 text-sm text-muted-foreground">{rating}/5</span>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Məhsul və satıcı barədə təcrübənizi yazın (məcburi deyil)..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-surface">
              Ləğv et
            </button>
            <button onClick={submit} disabled={submitting}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-neon text-background text-sm font-semibold disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {myReview ? "Yenilə" : "Göndər"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center rounded-2xl border border-dashed border-border">{t("product.noReviews")}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const name = r.reviewer?.display_name || r.reviewer?.username || "İstifadəçi";
            const initials = name.slice(0, 2).toUpperCase();
            const editing = replyOpen === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-5">
                <div className="flex items-start gap-3">
                  <Link to="/u/$id" params={{ id: r.reviewer_id }} className="shrink-0">
                    {r.reviewer?.avatar_url ? (
                      <img src={r.reviewer.avatar_url} alt={name} className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-neon/15 border border-neon/30 text-neon font-bold text-sm">{initials}</div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Link to="/u/$id" params={{ id: r.reviewer_id }} className="font-semibold hover:text-primary text-sm">{name}</Link>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("az-AZ")}</span>
                      </div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}

                    {/* Seller reply (display) */}
                    {r.seller_reply && !editing && (
                      <div className="mt-3 ml-2 pl-4 border-l-2 border-neon/40 bg-neon/5 rounded-r-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-neon">
                            <Store className="h-3.5 w-3.5" /> Satıcı cavabı
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {r.seller_replied_at && new Date(r.seller_replied_at).toLocaleDateString("az-AZ")}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.seller_reply}</p>
                        {isSeller && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => { setReplyOpen(r.id); setReplyText(r.seller_reply ?? ""); }}
                              className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" /> Redaktə et
                            </button>
                            <button
                              onClick={() => { setReplyOpen(r.id); setReplyText(""); submitReply(r.id); }}
                              className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" /> Sil
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Seller reply (editor) */}
                    {isSeller && editing && (
                      <div className="mt-3 ml-2 pl-4 border-l-2 border-neon/60 p-3 rounded-r-lg bg-neon/5">
                        <div className="text-xs font-semibold text-neon mb-2 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5" /> Cavabını yaz
                        </div>
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder="Müştəriyə cavab yaz..."
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <div className="mt-2 flex gap-2 justify-end">
                          <button onClick={() => { setReplyOpen(null); setReplyText(""); }}
                            className="h-8 px-3 rounded-lg border border-border text-xs hover:bg-surface">
                            Ləğv et
                          </button>
                          <button
                            onClick={() => submitReply(r.id)}
                            disabled={replyBusy || replyText.trim().length === 0}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-neon text-background text-xs font-semibold disabled:opacity-50"
                          >
                            {replyBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                            Göndər
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show reply button when no reply yet */}
                    {isSeller && !r.seller_reply && !editing && (
                      <button
                        onClick={() => { setReplyOpen(r.id); setReplyText(""); }}
                        className="mt-3 text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neon/40 text-neon hover:bg-neon/10"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Cavab yaz
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
