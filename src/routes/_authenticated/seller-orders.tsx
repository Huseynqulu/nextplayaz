import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Package, CheckCircle2, Truck, Clock, ShoppingBag, AlertTriangle, MessageSquare, ArrowLeft, ChevronRight } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { SellerOrderDetailDialog } from "@/components/SellerOrderDetailDialog";

export const Route = createFileRoute("/_authenticated/seller-orders")({
  component: SellerOrdersPage,
  head: () => ({ meta: [{ title: "Gələn Sifarişlər — NextPlay.az" }] }),
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
  disputed_reason: string | null;
  created_at: string;
  product: { title: string; slug: string; image_url: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: any }> = {
  paid: { label: "Çatdırılma gözləyir", cls: "bg-warning/20 text-warning", icon: Clock },
  delivered: { label: "Çatdırıldı", cls: "bg-primary/20 text-primary", icon: Truck },
  completed: { label: "Tamamlandı", cls: "bg-success/20 text-success", icon: CheckCircle2 },
  cancelled: { label: "Ləğv edildi", cls: "bg-muted text-muted-foreground", icon: Clock },
  refunded: { label: "Qaytarıldı", cls: "bg-muted text-muted-foreground", icon: Clock },
  dispute: { label: "Mübahisəli", cls: "bg-destructive/20 text-destructive", icon: AlertTriangle },
  pending: { label: "Gözləyir", cls: "bg-muted text-muted-foreground", icon: Clock },
};

function SellerOrdersPage() {
  const { user, roles } = useAuth() as any;
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [payloadInput, setPayloadInput] = useState<Record<string, string>>({});
  const [openOrder, setOpenOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (roles && !roles.includes("seller")) {
      navigate({ to: "/seller" });
    }
  }, [roles, navigate]);

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, product:products(title, slug, image_url)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  async function deliver(o: Order) {
    const payload = payloadInput[o.id]?.trim();
    if (!payload) { toast.error("Çatdırılma məlumatı daxil edin"); return; }
    setBusy(o.id);
    const { error } = await supabase.rpc("mark_order_delivered", { p_order_id: o.id, p_payload: payload });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Çatdırıldı"); refresh(); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/seller-dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Satıcı Paneli
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-7 w-7 text-neon" /> Gələn Sifarişlər
          </h1>
          <p className="text-muted-foreground mt-2 mb-8">Müştəri sifarişlərini buradan çatdırın.</p>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Hələ satış yoxdur.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const s = STATUS_LABEL[o.status] ?? STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <div
                    key={o.id}
                    onClick={() => setOpenOrder(o)}
                    className="rounded-2xl border border-border bg-card-gradient p-4 sm:p-5 card-shadow cursor-pointer hover:border-primary/60 transition-colors"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      {o.product?.image_url ? (
                        <img src={o.product.image_url} alt="" className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-surface grid place-items-center shrink-0"><Package className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{o.product?.title ?? "Məhsul"}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {o.quantity} ədəd · {format(o.unit_price)} · {new Date(o.created_at).toLocaleString("az-AZ")}
                            </p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="font-display text-base sm:text-lg font-bold text-gradient">{format(o.total)}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.cls}`}>
                                <Icon className="h-3 w-3" /> {s.label}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                        </div>



                        <div className="mt-3 flex flex-wrap gap-2">
                          {o.conversation_id && (
                            <Link to="/messages/$conversationId" params={{ conversationId: o.conversation_id }}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-semibold hover:border-primary">
                              <MessageSquare className="h-4 w-4" /> Söhbət
                            </Link>
                          )}
                          {o.status === "dispute" && (
                            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-warning/10 border border-warning/40 text-warning text-xs font-semibold">
                              <AlertTriangle className="h-4 w-4" /> Etiraz {o.disputed_reason ? `· ${o.disputed_reason}` : ""}
                            </span>
                          )}
                        </div>

                        {o.status === "paid" && (
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
