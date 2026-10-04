import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, CheckCircle2, UserRound, Headset } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Chat = { id: string; user_id: string; status: "waiting" | "live" | "closed"; assigned_to: string | null; updated_at: string; created_at: string };
type Msg = { id: string; chat_id: string; role: string; content: string; created_at: string };

const STATUS_LABEL: Record<Chat["status"], string> = { waiting: "Gözləyir", live: "Aktiv", closed: "Bağlı" };

export function LiveSupportPanel() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [active, setActive] = useState<Chat | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    const q = supabase.from("support_chats").select("*").order("updated_at", { ascending: false }).limit(100);
    const { data, error } = filter === "open" ? await q.neq("status", "closed") : await q.eq("status", "closed");
    setLoading(false);
    if (error) { toast.error("Çatlar yüklənmədi."); return; }
    const rows = (data ?? []) as Chat[];
    setChats(rows);
    const ids = [...new Set(rows.map((c) => c.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      setNames((prev) => ({ ...prev, ...Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? "Müştəri"])) }));
    }
  }, [filter]);

  useEffect(() => { loadChats(); }, [loadChats]);

  useEffect(() => {
    const ch = supabase
      .channel("staff-live-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_chats" }, () => loadChats())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_chat_messages" }, (p) => {
        const row = p.new as Msg;
        setMsgs((prev) => (prev.length && prev[0].chat_id === row.chat_id && !prev.some((m) => m.id === row.id) ? [...prev, row] : prev));
        loadChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadChats]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function open(c: Chat) {
    setActive(c);
    const { data } = await supabase.from("support_chat_messages").select("*").eq("chat_id", c.id).order("created_at");
    setMsgs((data ?? []) as Msg[]);
  }

  async function setStatus(c: Chat, status: Chat["status"]) {
    if (!user) return;
    const { error } = await supabase.from("support_chats").update({ status, assigned_to: user.id }).eq("id", c.id);
    if (error) { toast.error("Status dəyişmədi."); return; }
    if (status === "closed") {
      await supabase.from("support_chat_messages").insert({ chat_id: c.id, role: "system", sender_id: user.id, content: "Əməkdaş söhbəti bağladı." });
    }
    setActive({ ...c, status, assigned_to: user.id });
    loadChats();
  }

  async function send() {
    const text = reply.trim();
    if (!text || !active || !user) return;
    setBusy(true);
    if (active.status === "waiting") await setStatus(active, "live");
    const { data, error } = await supabase
      .from("support_chat_messages")
      .insert({ chat_id: active.id, role: "staff", sender_id: user.id, content: text.slice(0, 8000) })
      .select("*")
      .single();
    setBusy(false);
    if (error) { toast.error("Mesaj göndərilmədi."); return; }
    setReply("");
    setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      <div className="rounded-xl border border-border bg-card-gradient card-shadow overflow-hidden">
        <div className="flex border-b border-border">
          {(["open", "closed"] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setActive(null); setMsgs([]); }}
              className={`flex-1 h-10 text-sm font-semibold ${filter === f ? "text-neon border-b-2 border-neon" : "text-muted-foreground"}`}>
              {f === "open" ? "Açıq" : "Bağlı"}
            </button>
          ))}
        </div>
        <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
          ) : chats.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Hələ ki canlı çat yoxdur.</p>
          ) : chats.map((c) => (
            <button key={c.id} onClick={() => open(c)} className={`w-full text-left px-4 py-3 hover:bg-surface transition ${active?.id === c.id ? "bg-surface" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate">{names[c.user_id] ?? "Müştəri"}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.status === "waiting" ? "border-warning/40 text-warning" : c.status === "live" ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(c.updated_at).toLocaleString("az-AZ")}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card-gradient card-shadow flex flex-col min-h-[560px]">
        {!active ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Söhbət seçin</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-neon" />
                <span className="font-semibold">{names[active.user_id] ?? "Müştəri"}</span>
                <span className="text-xs text-muted-foreground">· {STATUS_LABEL[active.status]}</span>
              </div>
              {active.status !== "closed" && (
                <button onClick={() => setStatus(active, "closed")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs hover:border-neon">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Söhbəti bağla
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[440px]">
              {msgs.map((m) => m.role === "system" ? (
                <p key={m.id} className="text-[11px] text-muted-foreground whitespace-pre-line rounded-lg bg-surface/50 border border-border p-3">{m.content}</p>
              ) : (
                <div key={m.id} className={`flex ${m.role === "staff" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "staff" ? "bg-primary text-primary-foreground" : "bg-surface border border-border"}`}>
                    {m.role === "staff" && <span className="block text-[10px] opacity-80 mb-0.5 flex items-center gap-1"><Headset className="h-3 w-3" /> Əməkdaş</span>}
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            {active.status !== "closed" && (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Cavab yazın..." className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-neon" />
                <button disabled={busy || !reply.trim()} className="h-10 px-4 rounded-lg bg-neon text-background font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
