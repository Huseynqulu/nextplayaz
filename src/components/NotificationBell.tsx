import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "indi";
  if (m < 60) return `${m} dəq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat`;
  const d = Math.floor(h / 24);
  return `${d} gün`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    let active = true;
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (active) setItems((data ?? []) as Notification[]); });

    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          toast(n.title, { description: n.body ?? undefined });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    await supabase.rpc("mark_notifications_read", { p_ids: null });
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markOne(id: string) {
    await supabase.rpc("mark_notifications_read", { p_ids: [id] });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface transition relative"
        aria-label="Bildirişlər"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold rounded-full bg-neon text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-80 sm:w-96 rounded-xl border border-border bg-popover shadow-xl card-shadow overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Bildirişlər</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-neon hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Hamısını oxu
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Hələ bildiriş yoxdur</p>
              ) : (
                items.map((n) => {
                  const content = (
                    <div className={`px-4 py-3 border-b border-border/50 hover:bg-surface transition cursor-pointer ${!n.read_at ? "bg-surface/50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                      {!n.read_at && <span className="inline-block mt-1 h-1.5 w-1.5 rounded-full bg-neon" />}
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      to={n.link}
                      onClick={() => { setOpen(false); markOne(n.id); }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id} onClick={() => markOne(n.id)}>{content}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
