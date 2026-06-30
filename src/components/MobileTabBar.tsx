import { Link, useLocation } from "@tanstack/react-router";
import { Home, Store, MessageCircle, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

type Item = {
  to: string;
  label: string;
  Icon: typeof Home;
  match: (p: string) => boolean;
  badge?: number;
};

export function MobileTabBar() {
  const loc = useLocation();
  const { count: cartCount } = useCart();
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("dm_messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      if (!cancelled) setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("mobile-tab-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [userId]);

  const path = loc.pathname;
  // Hide on auth pages and message thread (chat input collides)
  if (path === "/auth" || path === "/login" || path === "/register") return null;
  if (path.startsWith("/messages/") && path !== "/messages") return null;

  const items: Item[] = [
    { to: "/", label: "Ev", Icon: Home, match: (p) => p === "/" },
    { to: "/marketplace", label: "Market", Icon: Store, match: (p) => p.startsWith("/marketplace") || p.startsWith("/product") },
    { to: "/messages", label: "Mesaj", Icon: MessageCircle, match: (p) => p.startsWith("/messages"), badge: unread },
    { to: "/cart", label: "Səbət", Icon: ShoppingCart, match: (p) => p.startsWith("/cart"), badge: cartCount },
    { to: userId ? "/profile" : "/auth", label: "Profil", Icon: User, match: (p) => p.startsWith("/profile") || p.startsWith("/auth") },
  ];

  return (
    <>
      {/* spacer so content isn't hidden under the bar on mobile */}
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, Icon, match, badge }) => {
            const active = match(path);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
                    active ? "text-neon" : "text-muted-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_6px_rgba(0,255,170,0.6)]" : ""}`} />
                    {badge && badge > 0 ? (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-neon text-background text-[9px] font-bold leading-4 text-center">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </span>
                  <span>{label}</span>
                  {active ? <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-neon" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
