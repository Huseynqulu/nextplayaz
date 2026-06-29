import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, LifeBuoy, MessageSquare, Package, Send, ArrowLeft, Ban, ShieldCheck, AlertTriangle, Paperclip, X } from "lucide-react";
import { uploadChatAttachment } from "@/lib/chat-attachments";
import { ChatImage } from "@/components/ChatImage";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Dəstək Paneli — NextPlay.az" }] }),
});

type Ticket = { id: string; user_id: string; order_id: string | null; subject: string; message: string; category: string; status: string; priority: string; created_at: string; updated_at: string };
type Msg = { id: string; sender_id: string; is_admin: boolean; body: string; created_at: string; attachment_url?: string | null };
type OrderRow = { id: string; buyer_id: string; seller_id: string; product_id: string; quantity: number; total: number; status: string; created_at: string; conversation_id?: string | null; disputed_at?: string | null; disputed_reason?: string | null };
type Conv = { id: string; user_a: string; user_b: string; product_id: string | null; last_message_at: string | null; last_message_preview: string | null };
type DMsg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; kind?: string | null; attachment_url?: string | null };
type Profile = { id: string; display_name: string | null; username: string | null };

type Tab = "tickets" | "conversations" | "orders" | "disputes";

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
  const [tReplyFile, setTReplyFile] = useState<File | null>(null);
  const [tReplyPreview, setTReplyPreview] = useState<string | null>(null);
  const tFileRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [oFilter, setOFilter] = useState<"all" | "paid" | "delivered" | "completed" | "cancelled" | "disputed">("paid");

  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [activeConvOrder, setActiveConvOrder] = useState<OrderRow | null>(null);
  const [dms, setDms] = useState<DMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [dmReply, setDmReply] = useState("");
  const [dmFile, setDmFile] = useState<File | null>(null);
  const [dmPreview, setDmPreview] = useState<string | null>(null);
  const dmFileRef = useRef<HTMLInputElement>(null);

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

  function pickImg(f: File | null, setF: (f: File | null) => void, setP: (s: string | null) => void) {
    if (!f) { setF(null); setP(null); return; }
    if (!f.type.startsWith("image/")) { toast.error("Yalnız şəkil"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Maks 8MB"); return; }
    setF(f);
    const r = new FileReader();
    r.onload = () => setP(r.result as string);
    r.readAsDataURL(f);
  }

  async function openTicket(t: Ticket) {
    setActiveTicket(t);
    setTMsgs([]);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setTMsgs((data as any) ?? []);
  }
  async function sendReply() {
    if ((!reply.trim() && !tReplyFile) || !activeTicket || !user) return;
    setBusy("reply");
    try {
      let attachment_url: string | null = null;
      if (tReplyFile) attachment_url = await uploadChatAttachment(tReplyFile, user.id);
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: activeTicket.id, sender_id: user.id, is_admin: true, body: reply.trim(), attachment_url,
      } as any);
      if (error) throw error;
      setReply(""); setTReplyFile(null); setTReplyPreview(null);
      await openTicket(activeTicket);
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
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

  async function partialRefund(o: OrderRow) {
    const raw = prompt(`Alıcıya qaytarılacaq məbləğ (maks ${Number(o.total).toFixed(2)} ₼):`, (Number(o.total) / 2).toFixed(2));
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(o.total)) { toast.error("Yanlış məbləğ"); return; }
    const notes = prompt("Qeyd (ixtiyari):", "") ?? "";
    setBusy(o.id);
    const { error } = await supabase.rpc("admin_partial_refund" as any, { p_order_id: o.id, p_refund_amount: amount, p_notes: notes || null });
    if (error) toast.error(error.message);
    else { toast.success(`${amount.toFixed(2)} ₼ alıcıya qaytarıldı`); await refresh(); }
    setBusy(null);
  }

  async function reopenOrder(o: OrderRow) {
    const reason = prompt("Yenidən açma səbəbi (məcburi):", "Müştəri dəstək vasitəsilə müraciət etdi");
    if (!reason || reason.trim().length < 3) return;
    if (!confirm(`Sifariş yenidən mübahisəyə alınsın? Satıcının balansından ${Number((o as any).seller_net ?? 0).toFixed(2)} ₼ tutulacaq (əgər artıq köçürülübsə).`)) return;
    setBusy(o.id);
    const { error } = await supabase.rpc("staff_reopen_order" as any, { p_order_id: o.id, p_reason: reason });
    if (error) toast.error(error.message);
    else { toast.success("Sifariş yenidən açıldı və mübahisəyə alındı"); await refresh(); }
    setBusy(null);
  }

  async function openConv(c: Conv) {
    setActiveConv(c);
    setDms([]);
    const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", c.id).order("created_at");
    setDms((data as any) ?? []);
    const linked = orders.find(o => o.conversation_id === c.id) ?? null;
    setActiveConvOrder(linked);
  }

  async function sendStaffDM() {
    if (!activeConv || !user || (!dmReply.trim() && !dmFile)) return;
    setBusy("dm");
    try {
      let attachment_url: string | null = null;
      if (dmFile) attachment_url = await uploadChatAttachment(dmFile, user.id);
      const { error } = await supabase.from("dm_messages").insert({
        conversation_id: activeConv.id, sender_id: user.id, body: dmReply.trim(),
        kind: "staff" as any, attachment_url,
      } as any);
      if (error) throw error;
      setDmReply(""); setDmFile(null); setDmPreview(null);
      await openConv(activeConv);
    } catch (e: any) { toast.error(e.message ?? "Xəta"); }
    setBusy(null);
  }

  const nameOf = (id: string) => profiles[id]?.display_name || profiles[id]?.username || id.slice(0, 8);
  const canReplyInConv = !!activeConvOrder && (activeConvOrder.status === "disputed" || (activeConvOrder.status as any) === "dispute");
  const disputes = orders.filter(o => o.status === "disputed" || (o.status as any) === "dispute");

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
            <p className="text-sm text-muted-foreground">Müraciətlər, mesajlaşmalar, etirazlar və sifariş ləğvi</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
          {([
            ["tickets", `Müraciətlər (${tickets.filter(t => t.status !== "closed").length})`, LifeBuoy],
            ["disputes", `Etirazlar (${disputes.length})`, AlertTriangle],
            ["conversations", "Mesajlaşmalar", MessageSquare],
            ["orders", "Sifarişlər", Package],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k as Tab)}
              className={`h-11 px-4 inline-flex items-center gap-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === k ? "border-neon text-neon" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
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
                    {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                    {m.attachment_url && <div className="mt-2"><ChatImage path={m.attachment_url} /></div>}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border space-y-2">
                {tReplyPreview && (
                  <div className="relative inline-block">
                    <img src={tReplyPreview} alt="" className="max-h-28 rounded-lg border border-border" />
                    <button onClick={() => pickImg(null, setTReplyFile, setTReplyPreview)} className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-destructive text-destructive-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={tFileRef} type="file" accept="image/*" hidden onChange={e => pickImg(e.target.files?.[0] ?? null, setTReplyFile, setTReplyPreview)} />
                  <button type="button" onClick={() => tFileRef.current?.click()} className="h-10 w-10 self-end grid place-items-center rounded-md bg-surface border border-border hover:border-primary"><Paperclip className="h-4 w-4" /></button>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Cavab yazın..."
                    className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-sm resize-none" />
                  <button disabled={busy === "reply" || (!reply.trim() && !tReplyFile)} onClick={sendReply}
                    className="px-4 self-end rounded-md bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
                    {busy === "reply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                  </button>
                  {activeTicket.status !== "closed" && (
                    <button disabled={busy === activeTicket.id} onClick={() => closeTicket(activeTicket)}
                      className="px-3 self-end rounded-md border border-border text-xs hover:border-destructive hover:text-destructive">Bağla</button>
                  )}
                </div>
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
        ) : tab === "disputes" ? (
          <div className="space-y-3">
            {disputes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aktiv etiraz yoxdur</p>}
            {disputes.map(o => (
              <div key={o.id} className="rounded-xl border border-warning/40 bg-card-gradient p-4 card-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-warning/20 text-warning">ETİRAZ</span>
                      <span className="font-semibold">{Number(o.total).toFixed(2)} ₼</span>
                      <span className="text-xs text-muted-foreground">{o.disputed_at ? new Date(o.disputed_at).toLocaleString("az-AZ") : ""}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Alıcı: <span className="text-foreground">{nameOf(o.buyer_id)}</span> → Satıcı: <span className="text-foreground">{nameOf(o.seller_id)}</span></div>
                    {o.disputed_reason && <div className="mt-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm"><span className="font-semibold text-warning">Səbəb: </span>{o.disputed_reason}</div>}
                    <div className="text-[10px] text-muted-foreground">ID: {o.id.slice(0, 8)}</div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {o.conversation_id && (
                      <button onClick={() => { const c = convs.find(x => x.id === o.conversation_id); if (c) { setTab("conversations"); openConv(c); } }}
                        className="h-9 px-3 rounded-md text-xs font-semibold bg-neon/10 text-neon border border-neon/30 inline-flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> Söhbətə bax & cavab ver
                      </button>
                    )}
                    <button disabled={busy === o.id} onClick={() => partialRefund(o)}
                      className="h-9 px-3 rounded-md text-xs font-semibold bg-warning/20 text-warning border border-warning/40 disabled:opacity-50">Qismən qaytar</button>
                    <button disabled={busy === o.id} onClick={() => cancelOrder(o)}
                      className="h-9 px-3 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30 disabled:opacity-50 inline-flex items-center gap-1.5">
                      {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Sifarişi ləğv et
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "conversations" ? (
          <div className="grid md:grid-cols-[320px_1fr] gap-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {convs.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Mesajlaşma yoxdur</p>}
              {convs.map(c => {
                const linked = orders.find(o => o.conversation_id === c.id);
                const isDisp = linked && (linked.status === "disputed" || (linked.status as any) === "dispute");
                return (
                  <button key={c.id} onClick={() => openConv(c)}
                    className={`w-full text-left rounded-lg border p-3 transition ${activeConv?.id === c.id ? "border-neon bg-neon/5" : isDisp ? "border-warning/40 bg-warning/5 hover:border-warning" : "border-border bg-card-gradient hover:border-primary"}`}>
                    <div className="flex items-center gap-1.5">
                      {isDisp && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-warning/20 text-warning">Etiraz</span>}
                      <div className="text-sm font-semibold truncate">{nameOf(c.user_a)} ↔ {nameOf(c.user_b)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("az-AZ") : ""}</div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-card-gradient card-shadow min-h-[400px] flex flex-col">
              {!activeConv ? (
                <div className="grid place-items-center h-full text-sm text-muted-foreground p-8">Söhbət seçin</div>
              ) : (
                <>
                  <div className="p-3 border-b border-border text-sm font-semibold flex items-center justify-between">
                    <span>{nameOf(activeConv.user_a)} ↔ {nameOf(activeConv.user_b)}</span>
                    {activeConvOrder && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface">{activeConvOrder.status}</span>}
                  </div>
                  <div className="p-4 space-y-2 flex-1 max-h-[480px] overflow-y-auto">
                    {dms.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Mesaj yoxdur</p>}
                    {dms.map(m => {
                      const isStaff = m.kind === "staff" || m.kind === "system";
                      return (
                        <div key={m.id} className={`max-w-[75%] rounded-lg p-2.5 text-sm ${isStaff ? "mx-auto bg-neon/10 border border-neon/40 text-center" : m.sender_id === activeConv.user_a ? "bg-surface border border-border" : "ml-auto bg-primary/10 border border-primary/30"}`}>
                          <div className="text-[10px] uppercase font-bold mb-1 opacity-70">
                            {isStaff ? "NextPlay Dəstək" : nameOf(m.sender_id)} • {new Date(m.created_at).toLocaleString("az-AZ")}
                          </div>
                          {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                          {m.attachment_url && <div className="mt-2"><ChatImage path={m.attachment_url} /></div>}
                        </div>
                      );
                    })}
                  </div>
                  {canReplyInConv ? (
                    <div className="p-3 border-t border-border space-y-2">
                      <div className="text-[11px] text-warning">⚠ Etiraz edilmiş sifariş — "NextPlay Dəstək" adı ilə cavab verə bilərsən.</div>
                      {dmPreview && (
                        <div className="relative inline-block">
                          <img src={dmPreview} alt="" className="max-h-24 rounded-lg border border-border" />
                          <button onClick={() => pickImg(null, setDmFile, setDmPreview)} className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-destructive text-destructive-foreground"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input ref={dmFileRef} type="file" accept="image/*" hidden onChange={e => pickImg(e.target.files?.[0] ?? null, setDmFile, setDmPreview)} />
                        <button type="button" onClick={() => dmFileRef.current?.click()} className="h-10 w-10 self-end grid place-items-center rounded-md bg-surface border border-border hover:border-primary"><Paperclip className="h-4 w-4" /></button>
                        <textarea value={dmReply} onChange={e => setDmReply(e.target.value)} rows={2} placeholder="NextPlay Dəstək olaraq yaz..."
                          className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-sm resize-none" />
                        <button disabled={busy === "dm" || (!dmReply.trim() && !dmFile)} onClick={sendStaffDM}
                          className="px-4 self-end rounded-md bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
                          {busy === "dm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-border text-[11px] text-muted-foreground italic">Yalnız oxuma rejimi — yalnız etiraz edilmiş sifarişlərdə cavab verə bilərsən.</div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(["all","paid","delivered","completed","cancelled","disputed"] as const).map(s => (
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
                  <div className="flex gap-2">
                    <button disabled={!canCancel || busy === o.id} onClick={() => partialRefund(o)}
                      className="h-9 px-3 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 disabled:opacity-40">Qismən qaytar</button>
                    <button disabled={!canCancel || busy === o.id} onClick={() => cancelOrder(o)}
                      className="h-9 px-3 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 disabled:opacity-40 inline-flex items-center gap-1.5">
                      {busy === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Ləğv et
                    </button>
                  </div>
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
