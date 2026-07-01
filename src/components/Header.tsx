import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, ShoppingCart, Menu, Gamepad2, LogOut, User as UserIcon, LayoutDashboard, ShieldCheck, Package, LifeBuoy, Wallet, MessageSquare, Heart, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useOnlinePresence } from "@/lib/presence";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBox } from "@/components/SearchBox";
import { CommandPaletteTrigger } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import nextplayLogo from "@/assets/nextplay-logo.png";
import { imgUrl } from "@/lib/image-url";

export function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  useOnlinePresence();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const [unreadDm, setUnreadDm] = useState(0);

  useEffect(() => {
    if (!user) { setRoles([]); setAvatarUrl(null); setUnreadDm(0); setDisplayLabel(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const r = (data ?? []).map((x: any) => x.role);
      setRoles(r);
      const hasSeller = r.includes("seller");
      supabase.from("profiles").select("avatar_url,shop_name,username,display_name").eq("id", user.id).maybeSingle().then(({ data: p }) => {
        const prof = p as any;
        setAvatarUrl(prof?.avatar_url ?? null);
        const label = hasSeller
          ? (prof?.shop_name || prof?.username || prof?.display_name)
          : (prof?.username || prof?.display_name);
        setDisplayLabel(label || null);
      });
    });
    const loadUnread = () => {
      supabase.from("dm_messages").select("id", { count: "exact", head: true })
        .is("read_at", null).neq("sender_id", user.id)
        .then(({ count }) => setUnreadDm(count ?? 0));
    };
    loadUnread();
    const ch = supabase.channel(`hdr-dm-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);
  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("seller");
  const isSupport = roles.includes("support");

  const nav = [
    { to: "/", label: t("nav.home") },
    { to: "/marketplace", label: t("nav.marketplace") },
    
    { to: "/seller", label: t("nav.seller") },
    { to: "/support", label: t("nav.support") },
  ] as const;

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={nextplayLogo} alt="NextPlay" className="h-10 w-auto drop-shadow-[0_0_12px_hsl(var(--neon)/0.4)] group-hover:drop-shadow-[0_0_18px_hsl(var(--neon)/0.6)] transition" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {nav.map(n => (
            <Link
              key={n.to} to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <SearchBox variant="desktop" />

        <div className="flex items-center gap-2 md:ml-2 ml-auto">
          <CommandPaletteTrigger />
          <ThemeToggle />
          <LanguageSwitcher />
          <CartButton />
          {user && (
            <Link to="/messages" className="hidden md:grid h-10 w-10 place-items-center rounded-lg hover:bg-surface transition relative" aria-label="Mesajlar">
              <MessageSquare className="h-5 w-5" />
              {unreadDm > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-neon text-background text-[10px] font-bold leading-none">
                  {unreadDm > 99 ? "99+" : unreadDm}
                </span>
              )}
            </Link>
          )}
          <NotificationBell />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 h-10 px-2 sm:px-3 rounded-lg hover:bg-surface transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-neon text-background text-xs font-bold overflow-hidden">
                  {avatarUrl ? (
                    <img src={imgUrl(avatarUrl, { width: 56, height: 56, quality: 70 })} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    (user.user_metadata?.display_name ?? user.email ?? "U")[0].toUpperCase()
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
                  {displayLabel ?? user.user_metadata?.display_name ?? user.email?.split("@")[0]}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-border bg-popover shadow-xl card-shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs text-muted-foreground">{t("auth.signedIn")}</p>
                      <p className="text-sm font-semibold truncate">{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <UserIcon className="h-4 w-4" /> {t("menu.profile")}
                    </Link>
                    <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <ShoppingBag className="h-4 w-4" /> {t("menu.orders")}
                    </Link>
                    <Link to="/wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <Wallet className="h-4 w-4" /> Cüzdan
                    </Link>
                    <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <MessageSquare className="h-4 w-4" /> Mesajlar
                    </Link>
                    <Link to="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <Heart className="h-4 w-4" /> İstək siyahım
                    </Link>
                    <Link to="/referrals" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <Gift className="h-4 w-4 text-neon" /> Referal proqramı
                    </Link>
                    <Link to="/support-tickets" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <LifeBuoy className="h-4 w-4" /> Dəstək müraciətlərim
                    </Link>
                    <Link to="/seller" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <LayoutDashboard className="h-4 w-4" /> {t("menu.becomeSeller")}
                    </Link>
                    {isSeller && (
                      <>
                        <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                          <Package className="h-4 w-4" /> {t("menu.myProducts")}
                        </Link>
                        <Link to="/seller-orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                          <ShoppingBag className="h-4 w-4" /> Gələn sifarişlər
                        </Link>
                      </>
                    )}
                    {(isSupport || isAdmin) && (
                      <Link to="/staff" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition text-neon">
                        <LifeBuoy className="h-4 w-4" /> Dəstək Paneli
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition text-neon">
                        <ShieldCheck className="h-4 w-4" /> {t("menu.admin")}
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition text-destructive">
                      <LogOut className="h-4 w-4" /> {t("menu.signOut")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition">
                {t("auth.login")}
              </Link>
              <Link to="/register" className="inline-flex h-10 items-center px-4 rounded-lg text-sm font-semibold bg-neon text-background neon-ring hover:opacity-95 transition">
                {t("auth.register")}
              </Link>
            </>
          )}

          <button onClick={() => setOpen(!open)} className="lg:hidden grid h-10 w-10 place-items-center rounded-lg hover:bg-surface" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="md:hidden border-t border-border/60 px-4 pb-3 pt-2">
        <SearchBox variant="mobile" />
      </div>


      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur">
          <nav className="flex flex-col p-4 gap-1">
            {nav.map(n => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md text-sm font-medium hover:bg-surface">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

import { useCart } from "@/lib/cart";
function CartButton() {
  const { count } = useCart();
  return (
    <Link to="/cart" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface transition relative" aria-label="Səbət">
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-neon text-background text-[10px] font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
