import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, Menu, Gamepad2, LogOut, User as UserIcon, LayoutDashboard, ShieldCheck, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data ?? []).map(r => r.role));
    });
  }, [user]);
  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("seller");

  const nav = [
    { to: "/", label: "Ana səhifə" },
    { to: "/marketplace", label: "Marketplace" },
    { to: "/seller", label: "Satıcı ol" },
    { to: "/support", label: "Dəstək" },
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
          <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-neon shadow-neon">
            <Gamepad2 className="h-5 w-5 text-background" strokeWidth={2.5} />
            <div className="absolute inset-0 -z-10 rounded-lg blur-md opacity-70 bg-neon group-hover:opacity-100 transition" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            NEXT<span className="text-gradient">PLAY</span>
            <span className="text-muted-foreground text-sm">.az</span>
          </span>
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

        <div className="hidden md:flex flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Oyun, hesab, açar axtar..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        <div className="flex items-center gap-2 md:ml-2 ml-auto">
          <button className="hidden sm:grid h-10 w-10 place-items-center rounded-lg hover:bg-surface transition" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 h-10 px-2 sm:px-3 rounded-lg hover:bg-surface transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-neon text-background text-xs font-bold">
                  {(user.user_metadata?.display_name ?? user.email ?? "U")[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                  {user.user_metadata?.display_name ?? user.email?.split("@")[0]}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-border bg-popover shadow-xl card-shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs text-muted-foreground">Daxil olunub</p>
                      <p className="text-sm font-semibold truncate">{user.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <UserIcon className="h-4 w-4" /> Profil
                    </Link>
                    <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <ShoppingBag className="h-4 w-4" /> Sifarişlərim
                    </Link>
                    <Link to="/seller" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                      <LayoutDashboard className="h-4 w-4" /> Satıcı ol
                    </Link>
                    {isSeller && (
                      <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition">
                        <Package className="h-4 w-4" /> Məhsullarım
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition text-neon">
                        <ShieldCheck className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface transition text-destructive">
                      <LogOut className="h-4 w-4" /> Çıxış
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition">
                Giriş
              </Link>
              <Link to="/register" className="inline-flex h-10 items-center px-4 rounded-lg text-sm font-semibold bg-neon text-background neon-ring hover:opacity-95 transition">
                Qeydiyyat
              </Link>
            </>
          )}

          <button onClick={() => setOpen(!open)} className="lg:hidden grid h-10 w-10 place-items-center rounded-lg hover:bg-surface" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
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
