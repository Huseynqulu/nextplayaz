import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Headset, MessageCircle, Package, UserRound, X, RotateCcw, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import nextplayLogo from "@/assets/nextplay-logo.png";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";

const AI_STORAGE = "np-support-ai-messages";
const LIVE_STORAGE = "np-support-live-chat";
const WHATSAPP = "https://wa.me/994102345451";

type LiveMsg = { id: string; role: string; content: string; created_at: string };
type LiveStatus = "waiting" | "live" | "closed";

const QUICK = ["Hansı PS5 oyunları var?", "Balansı necə artırım?", "P2 və P3 nədir?"];

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
}

export function SupportChat() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    try { setLiveId(localStorage.getItem(LIVE_STORAGE)); } catch { /* ignore */ }
  }, []);
  if (!mounted) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Dəstək çatını aç"
          className="group fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neon text-background shadow-lg neon-ring transition-transform hover:scale-110 active:scale-95"
        >
          <span className="absolute inset-0 rounded-full bg-neon/50 animate-ping" />
          <Headset className="relative h-7 w-7" strokeWidth={2.2} />
        </button>
      )}
      {open && (
        <div className="fixed z-50 inset-x-2 bottom-2 top-16 md:inset-auto md:bottom-6 md:left-6 md:h-[600px] md:max-h-[calc(100vh-6rem)] md:w-[400px] flex flex-col rounded-2xl border border-border bg-popover shadow-2xl card-shadow overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/60">
            <img src={nextplayLogo} alt="NextPlay" className="h-8 w-auto" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{liveId ? "Canlı dəstək" : "NextPlay Köməkçi"}</p>
              <p className="text-[11px] text-muted-foreground">{liveId ? "Əməkdaşla söhbət" : "AI dəstək · 24/7"}</p>
            </div>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" title="WhatsApp ilə yaz" aria-label="WhatsApp ilə yaz" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4" />
            </a>
            <button onClick={() => setOpen(false)} aria-label="Bağla" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
          {liveId ? (
            <LivePane
              chatId={liveId}
              onExit={() => { try { localStorage.removeItem(LIVE_STORAGE); } catch { /* ignore */ } setLiveId(null); }}
            />
          ) : (
            <AiPane onLive={(id) => { try { localStorage.setItem(LIVE_STORAGE, id); } catch { /* ignore */ } setLiveId(id); }} />
          )}
        </div>
      )}
    </>
  );
}

function AiPane({ onLive }: { onLive: (chatId: string) => void }) {
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/support-chat" }), []);
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "np-support",
    transport,
    onError: (e) => toast.error(e.message || "Cavab alınmadı."),
  });
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(AI_STORAGE);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [setMessages]);

  useEffect(() => {
    if (status !== "ready" || !restored.current) return;
    try { localStorage.setItem(AI_STORAGE, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const handleSubmit = (m: PromptInputMessage) => {
    const text = m.text?.trim();
    if (!text || busy) return;
    sendMessage({ text });
  };

  const startLive = useCallback(async () => {
    if (!user) return;
    setStarting(true);
    try {
      const { data: chat, error: e1 } = await supabase.from("support_chats").insert({ user_id: user.id }).select("id").single();
      if (e1 || !chat) throw e1 ?? new Error("chat");
      const transcript = messages
        .slice(-12)
        .map((m) => `${m.role === "user" ? "Müştəri" : "AI"}: ${textOf(m)}`)
        .filter((l) => !l.endsWith(": "))
        .join("\n")
        .slice(0, 7500);
      const { error: e2 } = await supabase.from("support_chat_messages").insert({
        chat_id: chat.id,
        role: "system",
        sender_id: user.id,
        content: transcript ? `AI söhbətinin xülasəsi:\n${transcript}` : "Müştəri canlı dəstək istədi.",
      });
      if (e2) throw e2;
      onLive(chat.id);
    } catch (err) {
      console.error(err);
      toast.error("Canlı dəstəyə qoşulmaq alınmadı. Yenidən cəhd edin.");
    } finally {
      setStarting(false);
    }
  }, [user, messages, onLive]);

  const handoff = (
    <div className="mt-2 rounded-xl border border-neon/30 bg-neon/10 p-3 text-sm">
      <p className="font-semibold flex items-center gap-2"><UserRound className="h-4 w-4 text-neon" /> Canlı əməkdaşla danışın</p>
      {user ? (
        <button onClick={startLive} disabled={starting} className="mt-2 h-9 px-4 rounded-lg bg-neon text-background text-sm font-bold disabled:opacity-60">
          {starting ? "Qoşulur..." : "Əməkdaşa qoşul"}
        </button>
      ) : (
        <p className="mt-1 text-muted-foreground">
          Canlı dəstək üçün <Link to="/login" className="text-neon font-semibold underline">hesabınıza daxil olun</Link>.
        </p>
      )}
    </div>
  );

  return (
    <>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="gap-4 p-4">
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <img src={nextplayLogo} alt="" className="h-12 w-auto mx-auto" />
              <div>
                <p className="font-semibold">Salam! Sizə necə kömək edə bilərəm?</p>
                <p className="text-xs text-muted-foreground mt-1">Məhsul axtarışı, qiymətlər, ödəniş və sifarişlər haqqında soruşun.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => sendMessage({ text: q })} className="px-3 py-1.5 rounded-full border border-border text-xs hover:border-neon hover:text-neon transition">
                    {q}
                  </button>
                ))}
              </div>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp ilə yazmaq istəyirəm
              </a>
            </div>
          )}
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                {m.parts.map((part, i) => {
                  if (part.type === "text") return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  if (part.type === "tool-search_catalog") {
                    const out = part.state === "output-available" ? (part.output as { results?: CatalogItem[] }) : null;
                    return (
                      <div key={i} className="space-y-2">
                        <Tool defaultOpen={false}>
                          <ToolHeader type={part.type} state={part.state} title="Kataloq axtarışı" />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            <ToolOutput output={part.output} errorText={part.errorText} />
                          </ToolContent>
                        </Tool>
                        {out?.results && out.results.length > 0 && <CatalogCards items={out.results.slice(0, 4)} />}
                      </div>
                    );
                  }
                  if (part.type === "tool-request_human_agent") {
                    return <div key={i}>{handoff}</div>;
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant"><MessageContent><Shimmer>Düşünür...</Shimmer></MessageContent></Message>
          )}
          {error && <p className="text-xs text-destructive">Cavab alınmadı. Yenidən yazın və ya canlı əməkdaşa qoşulun.</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <button onClick={() => { setMessages([]); try { localStorage.removeItem(AI_STORAGE); } catch { /* ignore */ } }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Yeni söhbət
          </button>
          {user ? (
            <button onClick={startLive} disabled={starting} className="inline-flex items-center gap-1 text-neon font-semibold disabled:opacity-60">
              <UserRound className="h-3 w-3" /> {starting ? "Qoşulur..." : "Canlı əməkdaş"}
            </button>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-1 text-neon font-semibold"><UserRound className="h-3 w-3" /> Canlı əməkdaş üçün daxil olun</Link>
          )}
        </div>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Sualınızı yazın..." autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

type CatalogItem = { title: string; slug: string; price: number; platform: string | null };

function CatalogCards({ items }: { items: CatalogItem[] }) {
  return (
    <div className="grid gap-1.5">
      {items.map((p) => (
        <Link key={p.slug} to="/product/$slug" params={{ slug: p.slug }} className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 hover:border-neon transition">
          <Package className="h-4 w-4 text-neon shrink-0" />
          <span className="flex-1 min-w-0 truncate text-xs">{p.title}</span>
          <span className="text-xs font-bold text-neon whitespace-nowrap">{Number(p.price).toFixed(2)} ₼</span>
        </Link>
      ))}
    </div>
  );
}

function LivePane({ chatId, onExit }: { chatId: string; onExit: () => void }) {
  const { user, loading } = useAuth();
  const [msgs, setMsgs] = useState<LiveMsg[]>([]);
  const [status, setStatus] = useState<LiveStatus>("waiting");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data: chat }, { data: rows }] = await Promise.all([
        supabase.from("support_chats").select("status").eq("id", chatId).maybeSingle(),
        supabase.from("support_chat_messages").select("id, role, content, created_at").eq("chat_id", chatId).order("created_at"),
      ]);
      if (!alive) return;
      if (!chat) { onExit(); return; }
      setStatus(chat.status as LiveStatus);
      setMsgs(rows ?? []);
    })();
    const ch = supabase
      .channel(`support-chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `chat_id=eq.${chatId}` }, (p) => {
        const row = p.new as LiveMsg;
        setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_chats", filter: `id=eq.${chatId}` }, (p) => {
        setStatus((p.new as { status: LiveStatus }).status);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [chatId, user, onExit]);

  const send = async (m: PromptInputMessage) => {
    const text = m.text?.trim();
    if (!text || !user || status === "closed") return;
    setSending(true);
    const { data, error } = await supabase
      .from("support_chat_messages")
      .insert({ chat_id: chatId, role: "user", sender_id: user.id, content: text.slice(0, 8000) })
      .select("id, role, content, created_at")
      .single();
    setSending(false);
    if (error) { toast.error("Mesaj göndərilmədi."); return; }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  };

  if (!loading && !user) {
    return (
      <div className="flex-1 grid place-items-center p-6 text-center text-sm">
        <div>
          <p>Canlı söhbəti görmək üçün hesabınıza daxil olun.</p>
          <Link to="/login" className="mt-3 inline-flex h-9 items-center px-4 rounded-lg bg-neon text-background font-bold">Daxil ol</Link>
        </div>
      </div>
    );
  }

  const statusLabel = status === "waiting" ? "Əməkdaş gözlənilir..." : status === "live" ? "Əməkdaş söhbətə qoşuldu" : "Söhbət bağlandı";

  return (
    <>
      <div className="px-4 py-2 text-[11px] border-b border-border bg-surface/40 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-success" : status === "waiting" ? "bg-warning animate-pulse" : "bg-muted-foreground"}`} />
        <span className="text-muted-foreground">{statusLabel}</span>
      </div>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="gap-4 p-4">
          {msgs.map((m) =>
            m.role === "system" ? (
              <p key={m.id} className="text-[11px] text-muted-foreground text-center whitespace-pre-line line-clamp-3">
                {m.content.startsWith("AI söhbətinin") ? "AI söhbətinin xülasəsi əməkdaşa ötürüldü." : m.content}
              </p>
            ) : (
              <Message from={m.role === "user" ? "user" : "assistant"} key={m.id}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.role === "staff" && <span className="text-[10px] font-semibold text-neon flex items-center gap-1"><Headset className="h-3 w-3" /> NextPlay əməkdaşı</span>}
                  <MessageResponse>{m.content}</MessageResponse>
                </MessageContent>
              </Message>
            ),
          )}
          {status === "waiting" && <Shimmer className="text-xs">Əməkdaş tezliklə cavab verəcək...</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border p-3 space-y-2">
        <button onClick={onExit} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> AI köməkçiyə qayıt
        </button>
        {status === "closed" ? (
          <p className="text-xs text-muted-foreground">Bu söhbət bağlanıb. Yeni sualınız üçün AI köməkçiyə qayıdın.</p>
        ) : (
          <PromptInput onSubmit={send}>
            <PromptInputTextarea placeholder="Əməkdaşa yazın..." autoFocus />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={sending ? "submitted" : "ready"} />
            </PromptInputFooter>
          </PromptInput>
        )}
      </div>
    </>
  );
}
