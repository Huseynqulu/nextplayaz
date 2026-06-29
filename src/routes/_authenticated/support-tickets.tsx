import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, LifeBuoy, Plus, ArrowLeft, Send, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support-tickets")({
  component: SupportTicketsPage,
  head: () => ({ meta: [{ title: "Dəstək müraciətlərim — NextPlay.az" }] }),
});

type Ticket = {
  id: string; subject: string; message: string; category: string; status: string;
  priority: string; order_id: string | null; created_at: string; updated_at: string;
};
type Msg = { id: string; sender_id: string; is_admin: boolean; body: string; created_at: string };
type OrderOpt = { id: string; product_title: string; created_at: string };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "order", label: "Sifariş haqqında" },
  { value: "payment", label: "Ödəniş / Balans" },
  { value: "account", label: "Hesab" },
  { value: "seller", label: "Satıcı ilə problem" },
  { value: "general", label: "Ümumi sual" },
  { value: "other", label: "Digər" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Açıq", pending: "Gözləyir", answered: "Cavablandı", closed: "Bağlı",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-warning/20 text-warning",
  pending: "bg-warning/20 text-warning",
  answered: "bg-success/20 text-success",
  closed: "bg-muted text-muted-foreground",
};

function SupportTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: "general", subject: "", message: "", order_id: "" });

  async function refresh() {
    if (!user) return;
    setLoading(true);
    const [{ data: t }, { data: o }] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("orders").select("id, created_at, products(title)").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setTickets((t as any) ?? []);
    setOrders(((o as any) ?? []).map((r: any) => ({ id: r.id, product_title: r.products?.title ?? "Sifariş", created_at: r.created_at })));
    setLoading(false);
  }
  useEffect(() => { refresh(); }, [user]);

  async function openTicket(t: Ticket) {
    setActive(t);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMessages((data as any) ?? []);
  }

  async function send() {
    if (!active || !reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: active.id, sender_id: user!.id, is_admin: false, body: reply.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setReply("");
      const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", active.id).order("created_at");
      setMessages((data as any) ?? []);
      await refresh();
    }
    setBusy(false);
  }

  async function create() {
    if (!form.subject.trim() || !form.message.trim()) { toast.error("Mövzu və mesaj tələb olunur"); return; }
    setBusy(true);
    const payload: any = {
      user_id: user!.id, category: form.category, subject: form.subject.trim(),
      message: form.message.trim(), order_id: form.order_id || null,
    };
    const { error } = await supabase.from("support_tickets").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Müraciət göndərildi");
      setForm({ category: "general", subject: "", message: "", order_id: "" });
      setCreating(false);
      await refresh();
    }
    setBusy(false);
  }

  async function closeTicket() {
    if (!active) return;
    if (!confirm("Müraciət bağlansın?")) return;
    setBusy(true);
    const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", active.id);
    if (error) toast.error(error.message);
    else { toast.success("Bağlandı"); setActive(null); await refresh(); }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <LifeBuoy className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Dəstək müraciətlərim</h1>
          </div>
          <p className="text-muted-foreground mb-8">Sifarişlər və ya digər mövzularda dəstək ilə əlaqə saxla.</p>

          {active ? (
            <div className="rounded-2xl border border-border bg-card-gradient card-shadow overflow-hidden">
              <div className="p-5 border-b border-border flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button onClick={() => setActive(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft className="h-3 w-3" /> Geri
                  </button>
                  <h2 className="font-semibold text-lg">{active.subject}</h2>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLOR[active.status]}`}>{STATUS_LABEL[active.status]}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-surface">{CATEGORIES.find(c => c.value === active.category)?.label}</span>
                    {active.order_id && <span className="px-2 py-0.5 rounded text-[10px] bg-surface inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Sifariş #{active.order_id.slice(0,8)}</span>}
                  </div>
                </div>
                {active.status !== "closed" && (
                  <button onClick={closeTicket} disabled={busy} className="h-8 px-3 rounded-md text-xs font-semibold bg-surface border border-border hover:border-destructive hover:text-destructive disabled:opacity-50">Bağla</button>
                )}
              </div>

              <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
                <div className="rounded-lg bg-surface/40 border border-border p-3">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">Sən · {new Date(active.created_at).toLocaleString("az-AZ")}</div>
                  <p className="text-sm whitespace-pre-wrap">{active.message}</p>
                </div>
                {messages.map(m => (
                  <div key={m.id} className={`rounded-lg p-3 border ${m.is_admin ? "bg-neon/10 border-neon/30" : "bg-surface/40 border-border"}`}>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">
                      {m.is_admin ? "Dəstək komandası" : "Sən"} · {new Date(m.created_at).toLocaleString("az-AZ")}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              {active.status !== "closed" && (
                <div className="p-4 border-t border-border flex gap-2">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Cavab yaz..." className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none" />
                  <button onClick={send} disabled={busy || !reply.trim()} className="h-10 self-end px-4 rounded-lg bg-neon text-background font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                  </button>
                </div>
              )}
            </div>
          ) : creating ? (
            <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow space-y-4">
              <button onClick={() => setCreating(false)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Geri
              </button>
              <h2 className="font-display text-xl font-bold">Yeni müraciət</h2>

              <div>
                <label className="text-xs text-muted-foreground">Kateqoriya</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value, order_id: e.target.value === "order" ? form.order_id : ""})} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm mt-1">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {form.category === "order" && (
                <div>
                  <label className="text-xs text-muted-foreground">Sifariş</label>
                  <select value={form.order_id} onChange={e => setForm({...form, order_id: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm mt-1">
                    <option value="">— sifariş seç —</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>#{o.id.slice(0,8)} · {o.product_title} · {new Date(o.created_at).toLocaleDateString("az-AZ")}</option>
                    ))}
                  </select>
                  {orders.length === 0 && <p className="text-xs text-muted-foreground mt-1">Sifarişin yoxdur.</p>}
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Mövzu</label>
                <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} maxLength={120} placeholder="Qısa mövzu" className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm mt-1" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Mesaj</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} maxLength={2000} rows={6} placeholder="Probleminizi ətraflı təsvir edin..." className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm mt-1 resize-none" />
              </div>

              <button onClick={create} disabled={busy} className="w-full h-11 rounded-lg bg-neon text-background font-semibold disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Müraciəti göndər"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neon text-background font-semibold">
                  <Plus className="h-4 w-4" /> Yeni müraciət
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
              ) : tickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  Hələ müraciətin yoxdur.
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map(t => (
                    <button key={t.id} onClick={() => openTicket(t)} className="w-full text-left rounded-xl border border-border bg-card-gradient p-4 hover:border-primary/50 transition">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{t.subject}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {CATEGORIES.find(c => c.value === t.category)?.label} · {new Date(t.updated_at).toLocaleString("az-AZ")}
                            {t.order_id && ` · Sifariş #${t.order_id.slice(0,8)}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
