import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Loader2, User as UserIcon, Search } from "lucide-react";
import { ConversationListSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { isOnline } from "@/lib/presence";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: InboxPage,
  head: () => ({ meta: [{ title: "Mesajlar — NextPlay.az" }] }),
});

type Conv = {
  id: string; user_a: string; user_b: string; product_id: string | null;
  last_message_at: string; last_message_preview: string | null;
};
type ProfileLite = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; last_seen_at: string | null; shop_name?: string | null };

function InboxPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [products, setProducts] = useState<Record<string, { title: string; slug: string }>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const q = searchQ.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const like = `%${q}%`;
      const { data } = await supabase
        .from("public_profiles" as any)
        .select("id,display_name,username,avatar_url,last_seen_at,shop_name")
        .or(`username.ilike.${like},display_name.ilike.${like},shop_name.ilike.${like}`)
        .neq("id", user.id)
        .limit(10);
      if (!active) return;
      setSearchResults(((data ?? []) as unknown) as ProfileLite[]);
      setSearching(false);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [searchQ, user?.id]);

  async function startChat(otherId: string) {
    if (starting) return;
    setStarting(true);
    const { data, error } = await supabase.rpc("start_conversation", { p_other_user: otherId, p_product_id: null } as any);
    setStarting(false);
    if (error || !data) { toast.error(error?.message ?? "Yazışma başladıla bilmədi"); return; }
    navigate({ to: "/messages/$conversationId", params: { conversationId: data as string } });
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("conversations").select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (!active) return;
      const list = (data ?? []) as Conv[];
      setConvs(list);
      const otherIds = Array.from(new Set(list.map(c => c.user_a === user.id ? c.user_b : c.user_a)));
      const prodIds = Array.from(new Set(list.map(c => c.product_id).filter(Boolean) as string[]));
      const [{ data: ps }, { data: pr }, { data: unreadRows }] = await Promise.all([
        otherIds.length ? supabase.from("public_profiles" as any).select("id,display_name,username,avatar_url,last_seen_at").in("id", otherIds) : Promise.resolve({ data: [] } as any),
        prodIds.length ? supabase.from("products").select("id,title,slug").in("id", prodIds) : Promise.resolve({ data: [] } as any),
        list.length
          ? supabase.from("dm_messages").select("conversation_id").in("conversation_id", list.map(c => c.id)).is("read_at", null).neq("sender_id", user.id)
          : Promise.resolve({ data: [] } as any),
      ]);
      if (!active) return;
      setProfiles(Object.fromEntries(((ps ?? []) as ProfileLite[]).map(p => [p.id, p])));
      setProducts(Object.fromEntries(((pr ?? []) as any[]).map(p => [p.id, { title: p.title, slug: p.slug }])));
      const counts: Record<string, number> = {};
      ((unreadRows ?? []) as { conversation_id: string }[]).forEach(r => { counts[r.conversation_id] = (counts[r.conversation_id] ?? 0) + 1; });
      setUnread(counts);
      setLoading(false);
    })();

    const ch = supabase.channel("inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        supabase.from("conversations").select("*")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order("last_message_at", { ascending: false })
          .then(({ data }) => { if (active) setConvs((data ?? []) as Conv[]); });
      }).subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Mesajlar</h1>
          </div>
          <p className="text-muted-foreground mb-6">Satıcı və alıcılarla birbaşa yazışmalar.</p>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="İstifadəçi adı, mağaza adı və ya ad ilə axtar…"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-border focus:border-neon outline-none text-sm"
            />
            {searchQ.trim().length >= 2 && (
              <div className="absolute z-20 mt-2 left-0 right-0 rounded-xl border border-border bg-card-gradient card-shadow overflow-hidden">
                {searching ? (
                  <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-neon" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">Nəticə tapılmadı</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                    {searchResults.map(r => {
                      const online = isOnline(r.last_seen_at);
                      const primary = r.shop_name || r.display_name || r.username || "İstifadəçi";
                      const secondary = r.username ? `@${r.username}` : "";
                      return (
                        <li key={r.id}>
                          <button
                            disabled={starting}
                            onClick={() => startChat(r.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface text-left disabled:opacity-50"
                          >
                            <div className="relative shrink-0">
                              <div className="h-9 w-9 rounded-full bg-surface grid place-items-center overflow-hidden">
                                {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted"}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate text-sm">{primary}</p>
                              {secondary && <p className="text-xs text-muted-foreground truncate">{secondary}</p>}
                            </div>
                            <span className="text-xs text-neon font-medium shrink-0">Yaz →</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>


          {loading ? (
            <ConversationListSkeleton count={6} />
          ) : convs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card-gradient p-10 text-center card-shadow">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Hələ yazışma yoxdur. Məhsul səhifəsindən satıcıya mesaj göndərin.</p>
              <Link to="/marketplace" className="inline-block mt-4 h-10 px-5 leading-10 rounded-lg bg-neon text-background font-semibold neon-ring">Marketə bax</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {convs.map(c => {
                const otherId = c.user_a === user!.id ? c.user_b : c.user_a;
                const p = profiles[otherId];
                const prod = c.product_id ? products[c.product_id] : null;
                const u = unread[c.id] ?? 0;
                const online = isOnline(p?.last_seen_at);
                return (
                  <button key={c.id} onClick={() => navigate({ to: "/messages/$conversationId", params: { conversationId: c.id } })}
                    className="w-full text-left rounded-xl border border-border bg-card-gradient p-4 hover:border-primary transition flex items-center gap-3 card-shadow">
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-surface grid place-items-center overflow-hidden">
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${u > 0 ? "font-bold" : "font-semibold"}`}>{p?.display_name ?? p?.username ?? "İstifadəçi"}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0">{new Date(c.last_message_at).toLocaleString("az-AZ", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      {prod && <p className="text-[11px] text-neon truncate">↳ {prod.title}</p>}
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate flex-1 ${u > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{c.last_message_preview ?? "—"}</p>
                        {u > 0 && <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-neon text-background text-[11px] font-bold grid place-items-center">{u}</span>}
                      </div>
                    </div>
                  </button>
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
