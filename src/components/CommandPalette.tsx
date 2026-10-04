import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/use-auth";
import { MARKETPLACE_ENABLED } from "@/lib/store-mode";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, ShoppingBag, Wallet, MessageSquare, Heart, ShoppingCart, Package,
  LayoutDashboard, ShieldCheck, LifeBuoy, Gift, User as UserIcon, Bell, Plus,
  BarChart3, Users, Tag, Headphones, LogOut, Search,
} from "lucide-react";

type Cmd = {
  id: string;
  label: string;
  group: string;
  icon: any;
  shortcut?: string;
  action: () => void;
  roles?: Array<"admin" | "seller" | "support" | "user">;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!user) { setRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data ?? []).map((x: any) => x.role));
    });
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isSeller = roles.includes("seller");
  const isSupport = roles.includes("support");

  const go = (to: string) => () => { setOpen(false); navigate({ to } as any); };

  const commands: Cmd[] = [
    // Naviqasiya
    { id: "home", label: "Ana səhifə", group: "Naviqasiya", icon: Home, action: go("/") },
    { id: "marketplace", label: "Market", group: "Naviqasiya", icon: ShoppingBag, action: go("/marketplace") },
    { id: "gift", label: "Hədiyyə kartları", group: "Naviqasiya", icon: Gift, action: go("/gift-cards") },
    { id: "support", label: "Dəstək", group: "Naviqasiya", icon: LifeBuoy, action: go("/support") },

    // Hesab
    ...(user ? [
      { id: "profile", label: "Profil", group: "Hesab", icon: UserIcon, action: go("/profile") },
      { id: "wallet", label: "Pul kisəsi", group: "Hesab", icon: Wallet, action: go("/wallet") },
      { id: "orders", label: "Sifarişlərim", group: "Hesab", icon: Package, action: go("/orders") },
      { id: "messages", label: "Mesajlar", group: "Hesab", icon: MessageSquare, action: go("/messages") },
      { id: "favorites", label: "Sevimlilər", group: "Hesab", icon: Heart, action: go("/favorites") },
      { id: "cart", label: "Səbət", group: "Hesab", icon: ShoppingCart, action: go("/cart") },
      { id: "notifications", label: "Bildirişlər", group: "Hesab", icon: Bell, action: go("/notifications") },
      { id: "tickets", label: "Dəstək biletlərim", group: "Hesab", icon: Headphones, action: go("/support-tickets") },
    ] as Cmd[] : []),

    // Satıcı
    ...(isSeller ? [
      { id: "seller-dash", label: "Satıcı paneli", group: "Satıcı", icon: LayoutDashboard, action: go("/seller-dashboard") },
      { id: "seller-orders", label: "Gələn sifarişlər", group: "Satıcı", icon: Package, action: go("/seller-orders") },
      { id: "seller-add", label: "Yeni məhsul əlavə et", group: "Satıcı", icon: Plus, action: go("/seller-dashboard") },
      { id: "seller-analytics", label: "Analitika", group: "Satıcı", icon: BarChart3, action: go("/seller-analytics") },
      { id: "seller-withdraw", label: "Pul çıxarma", group: "Satıcı", icon: Wallet, action: go("/wallet") },
    ] as Cmd[] : []),
    ...(!isSeller && user && MARKETPLACE_ENABLED ? [
      { id: "become-seller", label: "Satıcı ol", group: "Satıcı", icon: ShieldCheck, action: go("/seller") },
    ] as Cmd[] : []),

    // Admin
    ...(isAdmin ? [
      { id: "admin", label: "Admin paneli", group: "Admin", icon: ShieldCheck, action: go("/admin") },
      { id: "admin-users", label: "İstifadəçilər", group: "Admin", icon: Users, action: go("/admin") },
      { id: "admin-discount", label: "Endirim kodları", group: "Admin", icon: Tag, action: go("/admin") },
      { id: "admin-staff", label: "Staff paneli", group: "Admin", icon: Headphones, action: go("/staff") },
    ] as Cmd[] : []),

    // Staff
    ...(isSupport && !isAdmin ? [
      { id: "staff", label: "Staff paneli", group: "Dəstək", icon: Headphones, action: go("/staff") },
    ] as Cmd[] : []),

    // Hesab əməliyyatları
    ...(user ? [
      { id: "signout", label: "Çıxış", group: "Sistem", icon: LogOut, action: () => { setOpen(false); signOut(); } },
    ] as Cmd[] : [
      { id: "signin", label: "Daxil ol", group: "Sistem", icon: UserIcon, action: go("/login") },
      { id: "signup", label: "Qeydiyyat", group: "Sistem", icon: Plus, action: go("/register") },
    ] as Cmd[]),
  ];

  const groups = Array.from(new Set(commands.map((c) => c.group)));

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Əmr və ya səhifə axtar... (məhsul axtarışı üçün başına 'm ' yaz)" />
        <CommandList>
          <CommandEmpty>Nəticə yoxdur.</CommandEmpty>
          {groups.map((g, idx) => (
            <div key={g}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={g}>
                {commands.filter((c) => c.group === g).map((c) => (
                  <CommandItem key={c.id} value={`${c.group} ${c.label}`} onSelect={c.action}>
                    <c.icon className="mr-2 h-4 w-4 opacity-70" />
                    <span>{c.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Axtarış">
            <CommandItem
              value="market axtarış"
              onSelect={() => { setOpen(false); navigate({ to: "/marketplace" } as any); }}
            >
              <Search className="mr-2 h-4 w-4 opacity-70" />
              <span>Marketdə axtar...</span>
              <CommandShortcut>⏎</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const dispatch = () => {
    const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(e);
  };
  return (
    <button
      type="button"
      onClick={dispatch}
      className={`hidden md:inline-flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface/70 transition ${className}`}
      title="Komanda paleti"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Tez naviqasiya</span>
      <kbd className="ml-2 rounded bg-background px-1.5 py-0.5 text-[10px] font-mono">{isMac ? "⌘" : "Ctrl"}+K</kbd>
    </button>
  );
}
