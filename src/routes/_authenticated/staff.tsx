import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, LifeBuoy, MessageSquare, Package, Send, ArrowLeft, Ban, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Dəstək Paneli — NextPlay.az" }] }),
});

type Ticket = { id: string; user_id: string; order_id: string | null; subject: string; message: string; category: string; status: string; priority: string; created_at: string; updated_at: string };
type Msg = { id: string; sender_id: string; is_admin: boolean; body: string; created_at: string };
type OrderRow = { id: string; buyer_id: string; seller_id: string; product_id: string; quantity: number; total: number; status: string; created_at: string };
type Conv = { id: string; user_a: string; user_b: string; product_id: string | null; last_message_at: string | null; last_message_preview: string | null };
type DMsg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Profile = { id: string; display_name: string | null; username: string | null };

type Tab = "tickets" | "conversations" | "orders";

function StaffPage() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("tickets");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tFilter, setTFilter] = useState<"all" | "open" | "pending" | "answered" | "closed">("open");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [tMsgs, setTMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [oFilter, setOFilter] = useState<"all" | "paid" | "delivered" | "completed" | "cancelled">("paid");

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [dms, setDms] = useState<DMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: a } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      const { data: s } = await supabase.rpc("has_role", { _user_id: user.id, _role: "support" as any });
      const ok = !!a || !!s;
      setAllowed(ok);
      if (!ok) { toast.error("İcazəniz yoxdur"); navigate({ to: "/profile" }); }
    })();
  }, [user, navigate]);

  async function refresh() {
    setLoading(true);
    const [{ data: tk }, { data: od }, { data: cv }, { data: pr }] = await Promise.all([
      supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(200),
      supabase.from("profiles").select("id, display_name, username"),
    ]);
    setTickets((tk as any) ?? []);
    setOrders((od as any) ?? []);
    setConvs((cv as any) ?? []);
    const map: Record<string, Profile> = {};
    ((pr as any) ?? []).forEach((p: Profile) => { map[p.id] = p; });
    setProfiles(map);
    setLoading(false);
  }
  useEffect(() => { if (allowed) refresh(); }, [allowed]);

  async function openTicket(t: Ticket) {
    setActiveTicket(t);
    setTMsgs([]);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setTMsgs((data as any) ?? []);
  }
  async function sendReply() {
    if (!reply.trim() || !activeTicket || !user) return;
    setBusy("reply");
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: activeTicket.id, sender_id: user.id, is_admin: true, body: reply.trim(),
    });
    if (error) toast.error(error.message);
    else { setReply(""); await openTicket(activeTicket); }
    setBusy(null);
  }
  async function closeTicket(t: Ticket) {
    if (!confirm("Müraciəti bağlayasınız?")) return;
    setBusy(t.id);
    const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("Bağlandı"); await refresh(); if (activeTicket?.id === t.id) setActiveTicket({ ...t, status: "closed" }); }
    setBusy(null);
  }

  async function cancelOrder(o: OrderRow) {
    const reason = prompt("Ləğv səbəbi (ixtiyari):", "") ?? "";
    if (!confirm(`Sifariş ləğv edilsin? Alıcıya ${o.total} ₼ qaytarılacaq.`)) return;
    setBusy(o.id);
    const { error } = await supabase.rpc("staff_cancel_order", { p_order_id: o.id, p_reason: reason || undefined });
    if (error) toast.error(error.message);
    else { toast.success("Sifariş ləğv edildi və alıcıya qaytarıldı"); await refresh(); }
    setBusy(null);
  }

  async function openConv(c: Conv) {
    setActiveConv(c);
    setDms([]);
    const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", c.id).order("created_at");
    setDms((data as any) ?? []);
  }

  const nameOf = (id: string) => profiles[id]?.display_name || profiles[id]?.username || id.slice(0, 8);

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;
  if (!allowed) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon/10 border border-neon/40">
            <ShieldCheck className="h-6 w-6 text-neon" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dəstək Paneli</h1>
            <p className="text-sm text-muted-foreground">Müraciətlər, mesajlaşmalar və sifariş ləğvi</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
          {([
            ["tickets", `Müraciətlər (${tickets.filter(t => t.status !== "closed").length})`, LifeBuoy],
            ["conversations", "Mesajlaşmalar", MessageSquare],
            ["orders", "Sifarişlər", Package],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k as Tab)}
              className={`h-11 px-4 inline-flex items-center gap-2 text-sm font-semibold border-b-2 transition ${tab === k ? "border-neon text-neon" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
        ) : tab === "tickets" ? (
          activeTicket ? (
            <div className="rounded-xl border border-border bg-card-gradient card-shadow">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <button onClick={() => setActiveTicket(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" /> Geri
                </button>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface">{activeTicket.status}</span>
              </div>
              <div className="p-4 border-b border-border">
                <div className="text-xs text-muted-foreground mb-1">{nameOf(activeTicket.user_id)} • {new Date(activeTicket.created_at).toLocaleString("az-AZ")}</div>
                <h2 className="font-bold mb-1">{activeTicket.subject}</h2>
                <p className="text-sm whitespace-pre-wrap">{activeTicket.message}</p>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {tMsgs.map(m => (
                  <div key={m.id} className={`max-w-[80%] rounded-lg p-3 text-sm ${m.is_admin ? "ml-auto bg-neon/10 border border-neon/30" : "bg-surface border border-border"}`}>
                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70">{m.is_admin ? "Dəstək" : "İstifadəçi"} • {new Date(m.created_at).toLocaleString("az-AZ")}</div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Cavab yazın..."
                  className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-sm resize-none" />
                <button disabled={busy === "reply" || !reply.trim()} onClick={sendReply}
                  className="px-4 rounded-md bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
                  {busy === "reply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                </button>
                {activeTicket.status !== "closed" && (
                  <button disabled={busy === activeTicket.id} onClick={() => closeTicket(activeTicket)}
                    className="px-3 rounded-md border border-border text-xs hover:border-destructive hover:text-destructive">Bağla</button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(["all","open","pending","answered","closed"] as const).map(s => (
                  <button key={s} onClick={() => setTFilter(s)} className={`h-8 px-3 rounded-md text-xs font-semibold ${tFilter === s ? "bg-neon text-background" : "bg-surface border border-border"}`}>{s}</button>
                ))}
              </div>
              {tickets.filter(t => tFilter === "all" || t.status === tFilter).map(t => (
                <button key={t.id} onClick={() => openTicket(t)} className="w-full text-left rounded-xl border border-border bg-card-gradient p-4 card-shadow hover:border-primary transition">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="font-semibold">{t.subject}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface">{t.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{nameOf(t.user_id)} • {t.category} • {new Date(t.updated_at).toLocaleString("az-AZ")}</p>
                </button>
              ))}
              {tickets.filter(t => tFilter === "all" || t.status === tFilter).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Müraciət yoxdur</p>
              )}
            </div>
          )
        ) : tab === "conversations" ? (
          <div className="grid md:grid-cols-[320px_1fr] gap-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {convs.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Mesajlaşma yoxdur</p>}
              {convs.map(c => (
                <button key={c.id} onClick={() => openConv(c)}
                  className={`w-full text-left rounded-lg border p-3 transition ${activeConv?.id === c.id ? "border-neon bg-neon/5" : "border-border bg-card-gradient hover:border-primary"}`}>
                  <div className="text-sm font-semibold truncate">{nameOf(c.user_a)} ↔ {nameOf(c.user_b)}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("az-AZ") : ""}</div>
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card-gradient card-shadow min-h-[400px]">
              {!activeConv ? (
                <div className="grid place-items-center h-full text-sm text-muted-foreground p-8">Söhbət seçin</div>
              ) : (
                <>
                  <div className="p-3 border-b border-border text-sm font-semibold">{nameOf(activeConv.user_a)} ↔ {nameOf(activeConv.user_b)}</div>
                  <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto">
                    {dms.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Mesaj yoxdur</p>}
                    {dms.map(m => (
                      <div key={m.id} className={`max-w-[75%] rounded-lg p-2.5 text-sm ${m.sender_id === activeConv.user_a ? "bg-surface border border-border" : "ml-auto bg-primary/10 border border-primary/30"}`}>
                        <div className="text-[10px] uppercase font-bold mb-1 opacity-70">{nameOf(m.sender_id)} • {new Date(m.created_at).toLocaleString("az-AZ")}</div>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border text-[11px] text-muted-foreground italic">Yalnız oxuma rejimi — dəstək komandası bu mesajlaşmaya cavab verə bilməz.</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(["all","paid","delivered","completed","cancelled"] as const).map(s => (
                <button key={s} onClick={() => setOFilter(s)} className={`h-8 px-3 rounded-md text-xs font-semibold ${oFilter === s ? "bg-neon text-background" : "bg-surface border border-border"}`}>{s}</button>
              ))}
            </div>
            {orders.filter(o => oFilter === "all" || o.status === oFilter).map(o => {
              const canCancel = !["completed","cancelled","refunded"].includes(o.status);
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface">{o.status}</span>
                      <span className="font-semibold">{o.total.toFixed(2)} ₼</span>
                      <span className="text-xs text-muted-foreground">x{o.quantity}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Alıcı: <Link to="/messages" className="text-foreground">{nameOf(o.buyer_id)}</Link> →
                      Satıcı: <span className="text-foreground">{nameOf(o.seller_id)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("az-AZ")} • ID: {o.id.slice(0, 8)}</div>
                  </div>
                  <button disabled={!canCancel || busy === o.id} onClick={() => cancelOrder(o)}
                    className="h-9 px-3 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                    {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Ləğv et
                  </button>
                </div>
              );
            })}
            {orders.filter(o => oFilter === "all" || o.status === oFilter).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Sifariş yoxdur</p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
