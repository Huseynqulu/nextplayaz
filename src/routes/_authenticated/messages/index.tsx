import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Loader2, User as UserIcon } from "lucide-react";
import { isOnline } from "@/lib/presence";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: InboxPage,
  head: () => ({ meta: [{ title: "Mesajlar — NextPlay.az" }] }),
});

type Conv = {
  id: string; user_a: string; user_b: string; product_id: string | null;
  last_message_at: string; last_message_preview: string | null;
};
type ProfileLite = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

function InboxPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [products, setProducts] = useState<Record<string, { title: string; slug: string }>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      const [{ data: ps }, { data: pr }] = await Promise.all([
        otherIds.length ? supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", otherIds) : Promise.resolve({ data: [] } as any),
        prodIds.length ? supabase.from("products").select("id,title,slug").in("id", prodIds) : Promise.resolve({ data: [] } as any),
      ]);
      if (!active) return;
      setProfiles(Object.fromEntries(((ps ?? []) as ProfileLite[]).map(p => [p.id, p])));
      setProducts(Object.fromEntries(((pr ?? []) as any[]).map(p => [p.id, { title: p.title, slug: p.slug }])));
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
          <p className="text-muted-foreground mb-8">Satıcı və alıcılarla birbaşa yazışmalar.</p>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
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
                return (
                  <button key={c.id} onClick={() => navigate({ to: "/messages/$conversationId", params: { conversationId: c.id } })}
                    className="w-full text-left rounded-xl border border-border bg-card-gradient p-4 hover:border-primary transition flex items-center gap-3 card-shadow">
                    <div className="h-11 w-11 rounded-full bg-surface grid place-items-center overflow-hidden shrink-0">
                      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{p?.display_name ?? p?.username ?? "İstifadəçi"}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0">{new Date(c.last_message_at).toLocaleString("az-AZ", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      {prod && <p className="text-[11px] text-neon truncate">↳ {prod.title}</p>}
                      <p className="text-sm text-muted-foreground truncate">{c.last_message_preview ?? "—"}</p>
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
