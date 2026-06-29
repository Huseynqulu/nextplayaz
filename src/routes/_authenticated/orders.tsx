import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Package, CheckCircle2, Truck, Clock, ShoppingBag, AlertTriangle, MessageSquare, Upload, Video, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { uploadChatAttachment } from "@/lib/chat-attachments";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [tab, setTab] = useState<"buying" | "selling">("buying");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [payloadInput, setPayloadInput] = useState<Record<string, string>>({});
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeVideoUrl, setDisputeVideoUrl] = useState("");
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const col = tab === "buying" ? "buyer_id" : "seller_id";
    const { data, error } = await supabase
      .from("orders")
      .select("*, product:products(title, slug, image_url)")
      .eq(col, user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user, tab]);

  async function deliver(o: Order) {
    const payload = payloadInput[o.id]?.trim();
    if (!payload) { toast.error("Çatdırılma məlumatı daxil edin"); return; }
    setBusy(o.id);
    const { error } = await supabase.rpc("mark_order_delivered", { p_order_id: o.id, p_payload: payload });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Çatdırıldı"); refresh(); }
  }

  async function confirm(o: Order) {
    setBusy(o.id);
    const { error } = await supabase.rpc("confirm_order", { p_order_id: o.id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Təsdiq edildi, satıcıya ödəniş köçürüldü"); refresh(); }
  }

  async function dispute(o: Order) {
    const reason = prompt("Etirazınızın səbəbi (minimum 5 simvol):");
    if (!reason || reason.trim().length < 5) { if (reason !== null) toast.error("Səbəb çox qısadır"); return; }
    setBusy(o.id);
    const { error } = await supabase.rpc("dispute_order" as any, { p_order_id: o.id, p_reason: reason.trim() });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Etiraz göndərildi, admin baxacaq"); refresh(); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-7 w-7 text-neon" /> Sifarişlər
          </h1>
          <p className="text-muted-foreground mt-2 mb-8">Escrow ilə qorunan sifarişləriniz.</p>

          <div className="flex gap-1 mb-6 border-b border-border">
            {([["buying", "Aldıqlarım"], ["selling", "Satdıqlarım"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === key ? "border-neon text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{tab === "buying" ? "Hələ sifariş yoxdur." : "Hələ satış yoxdur."}</p>
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
                              {o.quantity} ədəd · {Number(o.unit_price).toFixed(2)} ₼ · {new Date(o.created_at).toLocaleString("az-AZ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-lg font-bold text-gradient">{Number(o.total).toFixed(2)} ₼</div>
                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.cls}`}>
                              <Icon className="h-3 w-3" /> {s.label}
                            </span>
                          </div>
                        </div>

                        {/* Buyer actions */}
                        {tab === "buying" && o.delivery_payload && (
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

                          {tab === "buying" && (o.status === "delivered" || o.status === "paid") && (
                            <button disabled={busy === o.id} onClick={() => confirm(o)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                              <CheckCircle2 className="h-4 w-4" /> Çatdırılmanı təsdiq et
                            </button>
                          )}
                          {tab === "buying" && (o.status === "paid" || o.status === "delivered") && (
                            <button disabled={busy === o.id} onClick={() => dispute(o)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:opacity-50">
                              <AlertTriangle className="h-4 w-4" /> Etiraz et
                            </button>
                          )}
                          {o.status === "dispute" && (
                            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-warning/10 border border-warning/40 text-warning text-xs font-semibold">
                              <AlertTriangle className="h-4 w-4" /> Etiraz açıqdır {o.disputed_reason ? `· ${o.disputed_reason}` : ""}
                            </span>
                          )}
                          {tab === "buying" && o.auto_confirm_at && o.status === "delivered" && (
                            <span className="text-[11px] text-muted-foreground self-center">
                              Avtomatik təsdiq: {new Date(o.auto_confirm_at).toLocaleString("az-AZ")}
                            </span>
                          )}
                        </div>

                        {/* Seller actions */}
                        {tab === "selling" && o.status === "paid" && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <input
                              value={payloadInput[o.id] ?? ""}
                              onChange={e => setPayloadInput(p => ({ ...p, [o.id]: e.target.value }))}
                              placeholder="Açar / hesab məlumatı..."
                              className="flex-1 min-w-[200px] h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button
                              disabled={busy === o.id}
                              onClick={() => deliver(o)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-neon text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                              <Truck className="h-4 w-4" /> Çatdır
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
