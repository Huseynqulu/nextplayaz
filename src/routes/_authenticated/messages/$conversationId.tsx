import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send, Loader2, User as UserIcon, CheckCheck, Paperclip, X, ShieldCheck } from "lucide-react";
import { MessageThreadSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { isOnline, formatLastSeen } from "@/lib/presence";
import { uploadChatAttachment } from "@/lib/chat-attachments";
import { ChatImage } from "@/components/ChatImage";
import { DeliveryCard } from "@/components/DeliveryCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  component: ThreadPage,
  head: () => ({ meta: [{ title: "Söhbət — NextPlay.az" }] }),
});

type Msg = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null; kind?: string; attachment_url?: string | null };
type Conv = { id: string; user_a: string; user_b: string; product_id: string | null; order_id: string | null };
type ProfileLite = { id: string; display_name: string | null; username: string | null; shop_name?: string | null; avatar_url: string | null; last_seen_at: string | null; verified_at?: string | null };

function ThreadPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conv, setConv] = useState<Conv | null>(null);
  const [other, setOther] = useState<ProfileLite | null>(null);
  const [product, setProduct] = useState<{ title: string; slug: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [avgRespMin, setAvgRespMin] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  async function markRead() {
    await supabase.rpc("mark_conversation_read" as any, { p_conversation_id: conversationId });
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: c, error } = await supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (!active) return;
      if (error || !c) { toast.error("Söhbət tapılmadı"); navigate({ to: "/messages" }); return; }
      const conv = c as Conv;
      setConv(conv);
      const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
      const [{ data: p }, { data: pr }, { data: msgs }] = await Promise.all([
        supabase.from("public_profiles" as any).select("id,display_name,username,shop_name,avatar_url,last_seen_at,verified_at").eq("id", otherId).maybeSingle(),
        conv.product_id ? supabase.from("products").select("title,slug").eq("id", conv.product_id).maybeSingle() : Promise.resolve({ data: null } as any),
        supabase.from("dm_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      setOther(((p as unknown) as ProfileLite) ?? null);
      setProduct((pr as any) ?? null);
      supabase.rpc("user_avg_response_minutes" as any, { p_user: otherId }).then(({ data }) => {
        const n = typeof data === "number" ? data : data != null ? Number(data) : null;
        if (active && n != null && !Number.isNaN(n) && n > 0) setAvgRespMin(n);
      });
      setMessages((msgs ?? []) as Msg[]);
      setLoading(false);
      void markRead();
      setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); inputRef.current?.focus(); }, 50);
    })();

    const ch = supabase.channel(`dm:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
          if (m.sender_id !== user.id) void markRead();
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read_at: m.read_at } : x));
        }).subscribe();

    const presenceCh = supabase.channel(`presence:${conversationId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const p = payload.new as ProfileLite;
        setOther(o => o && o.id === p.id ? { ...o, last_seen_at: p.last_seen_at } : o);
      }).subscribe();

    const typingCh = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const fromId = (payload?.payload as any)?.user_id;
        if (!fromId || fromId === user.id) return;
        setOtherTyping(true);
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const fromId = (payload?.payload as any)?.user_id;
        if (!fromId || fromId === user.id) return;
        setOtherTyping(false);
      })
      .subscribe();
    typingChRef.current = typingCh;

    const onFocus = () => void markRead();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      supabase.removeChannel(ch);
      supabase.removeChannel(presenceCh);
      supabase.removeChannel(typingCh);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [conversationId, user?.id]);

  function broadcastTyping() {
    if (!user || !typingChRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    void typingChRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }
  function broadcastStopTyping() {
    if (!user || !typingChRef.current) return;
    lastTypingSentRef.current = 0;
    void typingChRef.current.send({ type: "broadcast", event: "stop_typing", payload: { user_id: user.id } });
  }

  async function send() {
    if (!user || !conv) return;
    const body = text.trim();
    if (!body && !pendingFile) return;
    if (body.length > 4000) { toast.error("Mesaj çox uzundur"); return; }
    setSending(true);
    try {
      let attachment_url: string | null = null;
      if (pendingFile) attachment_url = await uploadChatAttachment(pendingFile, user.id);
      const { error } = await supabase.from("dm_messages").insert({
        conversation_id: conv.id, sender_id: user.id, body: body || "", attachment_url,
      } as any);
      if (error) throw error;
      setText(""); setPendingFile(null); setPreview(null);
      broadcastStopTyping();
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message ?? "Göndərmə alınmadı");
    } finally { setSending(false); }
  }

  function onPickFile(f: File | null) {
    if (!f) { setPendingFile(null); setPreview(null); return; }
    if (!f.type.startsWith("image/")) { toast.error("Yalnız şəkil"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Maks 8MB"); return; }
    setPendingFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  const online = isOnline(other?.last_seen_at);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-2xl border border-border bg-card-gradient card-shadow flex flex-col h-[calc(100vh-220px)] min-h-[520px]">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <button onClick={() => navigate({ to: "/messages" })} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"><ArrowLeft className="h-4 w-4" /></button>
              {other ? (
                <Link to="/u/$id" params={{ id: other.id }} className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 group">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-surface grid place-items-center overflow-hidden">
                      {other.avatar_url ? <img src={other.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate group-hover:text-neon transition inline-flex items-center gap-1.5">
                      <span className="truncate">{((other as any).shop_name as string | null) || other.display_name || other.username || "İstifadəçi"}</span>
                      <VerifiedBadge verified={(other as any).verified_at} variant="pill" size={12} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">{online ? "● Onlayn" : formatLastSeen(other.last_seen_at)}</p>
                    {avgRespMin != null && (
                      <p className="text-[11px] text-neon/80">⚡ Adətən {formatResp(avgRespMin)} içində cavab verir</p>
                    )}
                    {product && (
                      <span className="text-[11px] text-neon truncate block">↳ {product.title}</span>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {conv?.order_id && (
                <Link to="/orders" className="text-xs px-2.5 h-8 inline-flex items-center rounded-md border border-border hover:border-primary">Sifariş</Link>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <MessageThreadSkeleton />
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Mesajlaşmağa başlayın.</p>
              ) : messages.map(m => {
                if (m.kind === "system") {
                  if (m.body.includes("🔑 Məhsul məlumatı:")) {
                    return <DeliveryCard key={m.id} body={m.body} />;
                  }
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <div className="max-w-[85%] px-3 py-2 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning whitespace-pre-wrap text-center">
                        {m.body}
                      </div>
                    </div>
                  );
                }
                if (m.kind === "staff") {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <div className="max-w-[85%] px-3.5 py-2 rounded-2xl bg-primary/10 border border-primary/40 text-sm whitespace-pre-wrap break-words">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary mb-1">
                          <ShieldCheck className="h-3 w-3" /> NextPlay Dəstək
                        </div>
                        {m.body}
                        {m.attachment_url && <div className="mt-2"><ChatImage path={m.attachment_url} /></div>}
                        <div className="text-[10px] mt-1 text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                }
                const mine = m.sender_id === user!.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      mine ? "bg-neon text-background rounded-br-sm" : "bg-surface text-foreground rounded-bl-sm border border-border"
                    }`}>
                      {m.body}
                      {m.attachment_url && <div className="mt-2"><ChatImage path={m.attachment_url} /></div>}
                      <div className={`flex items-center gap-1 text-[10px] mt-1 ${mine ? "text-background/70 justify-end" : "text-muted-foreground"}`}>
                        <span>{new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && (
                          m.read_at
                            ? <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                            : <CheckCheck className="h-3.5 w-3.5 opacity-70" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {otherTyping && (
              <div className="px-4 pb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-end gap-0.5 h-3">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon animate-bounce [animation-delay:-0.3s]" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon animate-bounce [animation-delay:-0.15s]" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon animate-bounce" />
                </div>
                <span><span className="text-foreground">{((other as any)?.shop_name) || other?.display_name || other?.username || "İstifadəçi"}</span> yazır...</span>
              </div>
            )}

            <div className="border-t border-border p-3 space-y-2">

              {preview && (
                <div className="relative inline-block">
                  <img src={preview} alt="" className="max-h-32 rounded-lg border border-border" />
                  <button onClick={() => onPickFile(null)} className="absolute -top-2 -right-2 h-6 w-6 grid place-items-center rounded-full bg-destructive text-destructive-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onPickFile(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="h-11 w-11 grid place-items-center rounded-lg bg-surface border border-border hover:border-primary shrink-0" title="Şəkil əlavə et">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea ref={inputRef} value={text}
                  onChange={e => { setText(e.target.value); if (e.target.value.trim()) broadcastTyping(); else broadcastStopTyping(); }}
                  onBlur={() => broadcastStopTyping()}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1} maxLength={4000} placeholder="Mesaj yazın..."
                  className="flex-1 resize-none px-3 py-2.5 rounded-lg bg-background border border-border text-sm max-h-32" />
                <button onClick={send} disabled={sending || (!text.trim() && !pendingFile)}
                  className="h-11 w-11 grid place-items-center rounded-lg bg-neon text-background neon-ring disabled:opacity-50 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
