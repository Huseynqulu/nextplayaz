import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Package, Users, FileText, Ticket, Wallet, Trash2, Plus, Eye, X, FileImage, LifeBuoy, Send, ArrowLeft, Receipt, Image as ImageIcon } from "lucide-react";
import { ChatImage } from "@/components/ChatImage";
import { categoryLabel } from "@/lib/marketplace-data";
import { AdminBanners } from "@/components/AdminBanners";
import AdminReviews from "@/components/AdminReviews";
import { AdminGiftCards } from "@/components/AdminGiftCards";
import { AdminGiftMarket } from "@/components/AdminGiftMarket";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AdminBoostPricing } from "@/components/AdminBoostPricing";
import { AdminAnnouncements } from "@/components/AdminAnnouncements";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Panel — NextPlay.az" }] }),
});

type Application = {
  id: string; user_id: string; first_name: string; last_name: string; email: string; phone: string;
  category: string; status: "pending" | "approved" | "rejected"; created_at: string;
  id_front_url: string | null; id_back_url: string | null; selfie_url: string | null;
  admin_notes: string | null;
};

type ProductRow = { id: string; title: string; price: number; stock: number; category: string; is_active: boolean; seller_id: string; created_at: string };
type AdminUser = { id: string; email: string | null; display_name: string | null; username: string | null; wallet_balance: number; roles: ("user"|"seller"|"admin"|"support")[]; created_at: string; verified_at: string | null; last_ip?: string | null; last_ip_at?: string | null; signup_ip?: string | null; banned_at?: string | null; ban_reason?: string | null };
type DiscountCode = { id: string; code: string; percent: number; max_uses: number | null; used_count: number; is_active: boolean; expires_at: string | null; created_at: string };
type AdminTicket = { id: string; user_id: string; order_id: string | null; subject: string; message: string; category: string; status: string; priority: string; created_at: string; updated_at: string };
type TicketMsg = { id: string; sender_id: string; is_admin: boolean; body: string; created_at: string; attachment_url?: string | null };
type TopUp = { id: string; user_id: string; amount: number; method: string; sender_note: string | null; receipt_url: string | null; status: "pending"|"approved"|"rejected"; admin_notes: string | null; created_at: string };
type PaymentSetting = { method: string; label: string; instructions: string; is_active: boolean };
type Category = { slug: string; label_az: string; label_en: string; label_ru: string; sort_order: number; is_active: boolean };
type Subcategory = { id?: string; category_slug: string; slug: string; label_az: string; label_en: string; label_ru: string; sort_order: number; is_active: boolean };

type Tab = "analytics" | "applications" | "users" | "codes" | "products" | "tickets" | "topups" | "withdrawals" | "platform" | "payments" | "categories" | "platforms" | "disputes" | "banners" | "reviews" | "giftcards" | "giftmarket" | "boost" | "announcements";

type PlatformRow = { slug: string; label_az: string; label_en: string; label_ru: string; sort_order: number; is_active: boolean };
type PlatformSub = { platform_slug: string; slug: string; label_az: string; label_en: string; label_ru: string; sort_order: number; is_active: boolean };

type Withdrawal = { id: string; user_id: string; amount: number; fee: number; net_amount: number; method: string; destination: string; account_holder: string | null; status: "pending"|"approved"|"rejected"; admin_notes: string | null; created_at: string };
type LedgerEntry = { id: string; entry_type: string; amount: number; order_id: string | null; withdrawal_id: string | null; user_id: string | null; notes: string | null; created_at: string };

type Dispute = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  total: number;
  status: string;
  disputed_at: string | null;
  disputed_reason: string | null;
  created_at: string;
  conversation_id?: string | null;
  product?: { title: string } | null;
};

function AdminPage() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("applications");
  const [apps, setApps] = useState<Application[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [topups, setTopups] = useState<TopUp[]>([]);
  const [paySettings, setPaySettings] = useState<PaymentSetting[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<Record<string, Subcategory>>({});
  const [platformsList, setPlatformsList] = useState<PlatformRow[]>([]);
  const [platformSubs, setPlatformSubs] = useState<PlatformSub[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState<PlatformRow>({ slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true });
  const [newPSub, setNewPSub] = useState<Record<string, PlatformSub>>({});
  const [newCategory, setNewCategory] = useState<Category>({ slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true });
  const [stats, setStats] = useState({ users: 0, sellers: 0, products: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "pending" | "answered" | "closed">("all");
  const [topupFilter, setTopupFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [topupReceipt, setTopupReceipt] = useState<{ id: string; url: string } | null>(null);
  const [viewing, setViewing] = useState<Application | null>(null);
  const [signed, setSigned] = useState<{ front?: string; back?: string; selfie?: string }>({});
  const [activeTicket, setActiveTicket] = useState<AdminTicket | null>(null);
  const [ticketMsgs, setTicketMsgs] = useState<TicketMsg[]>([]);
  const [ticketUser, setTicketUser] = useState<{ email: string | null; name: string | null } | null>(null);
  const [reply, setReply] = useState("");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawFilter, setWithdrawFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [platformBalance, setPlatformBalance] = useState(0);
  const [userSearch, setUserSearch] = useState("");


  // new code form
  const [newCode, setNewCode] = useState({ code: "", percent: "10", max_uses: "", expires_at: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (!data) { toast.error("Admin icazəniz yoxdur"); navigate({ to: "/profile" }); }
    })();
  }, [user, navigate]);

  async function refresh() {
    setLoading(true);
    const [{ data: a }, { data: p }, { data: u }, { data: dc }, { data: tk }, { data: tu }, { data: ps }, { data: cats }, { count: uc }, { count: sc }, { count: pc }, { count: oc }] = await Promise.all([
      supabase.from("seller_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, title, price, stock, category, is_active, seller_id, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.rpc("admin_list_users"),
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }),
      supabase.from("wallet_topups").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_settings").select("*").order("label"),
      supabase.from("categories" as any).select("*").order("sort_order"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "seller"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);
    const { data: ds } = await supabase.from("orders").select("id,buyer_id,seller_id,product_id,total,status,disputed_at,disputed_reason,created_at,conversation_id,product:products(title)").in("status", ["disputed", "dispute"] as any).order("disputed_at", { ascending: false });
    setDisputes((ds as any) ?? []);
    const [{ data: wds }, { data: lg }] = await Promise.all([
      supabase.from("wallet_withdrawals" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("platform_ledger" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setWithdrawals((wds as any) ?? []);
    const ledgerRows = (lg as any) ?? [];
    setLedger(ledgerRows);
    setPlatformBalance(ledgerRows.reduce((sum: number, r: LedgerEntry) => sum + Number(r.amount), 0));
    setApps((a as any) ?? []);
    setProducts((p as any) ?? []);
    setUsers((u as any) ?? []);
    setCodes((dc as any) ?? []);
    setTickets((tk as any) ?? []);
    setTopups((tu as any) ?? []);
    setPaySettings((ps as any) ?? []);
    setCategories((cats as any) ?? []);
    const [{ data: subs }, { data: pls }, { data: psubs }] = await Promise.all([
      supabase.from("subcategories" as any).select("*").order("sort_order"),
      supabase.from("platforms" as any).select("*").order("sort_order"),
      supabase.from("platform_subcategories" as any).select("*").order("sort_order"),
    ]);
    setSubcategories((subs as any) ?? []);
    setPlatformsList((pls as any) ?? []);
    setPlatformSubs((psubs as any) ?? []);
    setStats({ users: uc ?? 0, sellers: sc ?? 0, products: pc ?? 0, orders: oc ?? 0 });
    setLoading(false);
  }

  async function savePlatform(p: PlatformRow) {
    if (!p.slug || !p.label_az) { toast.error("Slug və AZ ad tələb olunur"); return; }
    setBusy(`pl:${p.slug}`);
    const { error } = await supabase.from("platforms" as any).upsert({
      slug: p.slug.trim(), label_az: p.label_az, label_en: p.label_en || p.label_az,
      label_ru: p.label_ru || p.label_az, sort_order: p.sort_order, is_active: p.is_active,
    });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Yadda saxlandı"); await refresh(); }
  }
  async function deletePlatform(slug: string) {
    if (!confirm(`"${slug}" platforması silinsin?`)) return;
    setBusy(`pl:${slug}`);
    const { error } = await supabase.from("platforms" as any).delete().eq("slug", slug);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
  }
  async function addNewPlatform() {
    await savePlatform(newPlatform);
    setNewPlatform({ slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true });
  }
  async function savePSub(s: PlatformSub) {
    if (!s.slug || !s.label_az || !s.platform_slug) { toast.error("Slug və AZ ad tələb olunur"); return; }
    setBusy(`psub:${s.platform_slug}:${s.slug}`);
    const { error } = await supabase.from("platform_subcategories" as any).upsert({
      platform_slug: s.platform_slug, slug: s.slug.trim(), label_az: s.label_az,
      label_en: s.label_en || s.label_az, label_ru: s.label_ru || s.label_az,
      sort_order: s.sort_order, is_active: s.is_active,
    }, { onConflict: "platform_slug,slug" });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Yadda saxlandı"); await refresh(); }
  }
  async function deletePSub(platform_slug: string, slug: string) {
    if (!confirm(`"${slug}" alt-kateqoriya silinsin?`)) return;
    setBusy(`psub:${platform_slug}:${slug}`);
    const { error } = await supabase.from("platform_subcategories" as any).delete().eq("platform_slug", platform_slug).eq("slug", slug);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
  }
  async function addNewPSub(platform_slug: string) {
    const draft = newPSub[platform_slug];
    if (!draft) return;
    await savePSub({ ...draft, platform_slug });
    setNewPSub(s => ({ ...s, [platform_slug]: { platform_slug, slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true } }));
  }

  async function saveCategory(c: Category) {
    if (!c.slug || !c.label_az) { toast.error("Slug və AZ ad tələb olunur"); return; }
    setBusy(c.slug);
    const { error } = await supabase.rpc("admin_upsert_category" as any, {
      p_slug: c.slug.trim(), p_label_az: c.label_az, p_label_en: c.label_en || c.label_az,
      p_label_ru: c.label_ru || c.label_az, p_sort_order: c.sort_order, p_is_active: c.is_active,
    });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Yadda saxlandı"); await refresh(); }
  }
  async function deleteCategory(slug: string) {
    if (!confirm(`"${slug}" kateqoriyası silinsin?`)) return;
    setBusy(slug);
    const { error } = await supabase.rpc("admin_delete_category" as any, { p_slug: slug });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
  }
  async function addNewCategory() {
    await saveCategory(newCategory);
    setNewCategory({ slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true });
  }
  async function saveSub(s: Subcategory) {
    if (!s.slug || !s.label_az || !s.category_slug) { toast.error("Slug və AZ ad tələb olunur"); return; }
    setBusy(`sub:${s.category_slug}:${s.slug}`);
    const { error } = await supabase.rpc("admin_upsert_subcategory" as any, {
      p_category_slug: s.category_slug, p_slug: s.slug.trim(), p_label_az: s.label_az,
      p_label_en: s.label_en || s.label_az, p_label_ru: s.label_ru || s.label_az,
      p_sort_order: s.sort_order, p_is_active: s.is_active,
    });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Yadda saxlandı"); await refresh(); }
  }
  async function deleteSub(category_slug: string, slug: string) {
    if (!confirm(`"${slug}" alt-kateqoriya silinsin?`)) return;
    setBusy(`sub:${category_slug}:${slug}`);
    const { error } = await supabase.rpc("admin_delete_subcategory" as any, { p_category_slug: category_slug, p_slug: slug });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
  }
  async function addNewSub(category_slug: string) {
    const draft = newSub[category_slug];
    if (!draft) return;
    await saveSub({ ...draft, category_slug });
    setNewSub(s => ({ ...s, [category_slug]: { category_slug, slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true } }));
  }

  async function openTicket(t: AdminTicket) {
    setActiveTicket(t);
    setReply("");
    const [{ data: msgs }, { data: prof }] = await Promise.all([
      supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at"),
      supabase.rpc("admin_list_users"),
    ]);
    setTicketMsgs((msgs as any) ?? []);
    const found = ((prof as any) ?? []).find((x: any) => x.id === t.user_id);
    setTicketUser(found ? { email: found.email, name: found.display_name ?? found.username } : null);
  }

  async function sendReply() {
    if (!activeTicket || !reply.trim()) return;
    setBusy("reply");
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: activeTicket.id, sender_id: user!.id, is_admin: true, body: reply.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setReply("");
      const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", activeTicket.id).order("created_at");
      setTicketMsgs((data as any) ?? []);
      await refresh();
    }
    setBusy(null);
  }

  async function setTicketStatus(s: "open" | "pending" | "answered" | "closed") {
    if (!activeTicket) return;
    setBusy("status");
    const { error } = await supabase.from("support_tickets").update({ status: s }).eq("id", activeTicket.id);
    if (error) toast.error(error.message);
    else { toast.success("Status yeniləndi"); setActiveTicket({ ...activeTicket, status: s }); await refresh(); }
    setBusy(null);
  }


  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function decide(app: Application, status: "approved" | "rejected") {
    setBusy(app.id);
    try {
      const { error: e1 } = await supabase.from("seller_applications").update({ status }).eq("id", app.id);
      if (e1) throw e1;
      if (status === "approved") {
        const { error: e2 } = await supabase.rpc("admin_grant_role", { p_user_id: app.user_id, p_role: "seller" });
        if (e2) throw e2;
        const { error: e3 } = await supabase.rpc("admin_set_verified", { p_user_id: app.user_id, p_verified: true });
        if (e3) throw e3;
      }
      toast.success(status === "approved" ? "Satıcı təsdiqləndi və doğrulandı" : "Müraciət rədd edildi");
      await refresh();
    } catch (e: any) { toast.error(e.message ?? "Xəta"); } finally { setBusy(null); }
  }

  async function toggleVerified(u: AdminUser) {
    setBusy(u.id + "verify");
    const { error } = await supabase.rpc("admin_set_verified", { p_user_id: u.id, p_verified: !u.verified_at });
    if (error) toast.error(error.message); else { toast.success(u.verified_at ? "Doğrulama silindi" : "Doğrulandı"); await refresh(); }
    setBusy(null);
  }

  async function toggleBan(u: AdminUser) {
    const isBanned = !!u.banned_at;
    let reason: string | null = null;
    if (!isBanned) {
      reason = prompt(`"${u.display_name ?? u.username ?? u.email}" istifadəçisini ban etmək üçün səbəb daxil edin (məcburi deyil):`, "");
      if (reason === null) return;
    } else {
      if (!confirm(`"${u.display_name ?? u.username ?? u.email}" istifadəçisinin banı silinsin?`)) return;
    }
    setBusy(u.id + "ban");
    const { error } = await (supabase.rpc as any)("admin_set_banned", { p_user_id: u.id, p_banned: !isBanned, p_reason: reason });
    if (error) toast.error(error.message); else { toast.success(isBanned ? "Ban silindi" : "İstifadəçi ban edildi"); await refresh(); }
    setBusy(null);
  }




  async function toggleProduct(p: ProductRow) {
    setBusy(p.id);
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function setBalance(u: AdminUser) {
    const val = prompt(`${u.display_name ?? u.email} üçün yeni balans (AZN):`, String(u.wallet_balance));
    if (val === null) return;
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) { toast.error("Etibarsız məbləğ"); return; }
    setBusy(u.id);
    const { error } = await supabase.rpc("admin_set_wallet_balance", { p_user_id: u.id, p_balance: num });
    if (error) toast.error(error.message); else { toast.success("Balans yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function toggleRole(u: AdminUser, role: "seller" | "admin" | "support") {
    setBusy(u.id + role);
    const has = u.roles.includes(role as any);
    const { error } = await supabase.rpc(has ? "admin_revoke_role" : "admin_grant_role", { p_user_id: u.id, p_role: role as any });
    if (error) toast.error(error.message); else { toast.success(has ? "Vəzifə alındı" : "Vəzifə verildi"); await refresh(); }
    setBusy(null);
  }

  async function createCode() {
    if (!newCode.code.trim() || !newCode.percent) { toast.error("Kod və faiz tələb olunur"); return; }
    setBusy("new-code");
    const payload: any = {
      code: newCode.code.trim().toUpperCase(),
      percent: Number(newCode.percent),
      max_uses: newCode.max_uses ? Number(newCode.max_uses) : null,
      expires_at: newCode.expires_at ? new Date(newCode.expires_at).toISOString() : null,
      created_by: user!.id,
    };
    const { error } = await supabase.from("discount_codes").insert(payload);
    if (error) toast.error(error.message); else {
      toast.success("Endirim kodu yaradıldı");
      setNewCode({ code: "", percent: "10", max_uses: "", expires_at: "" });
      await refresh();
    }
    setBusy(null);
  }

  async function toggleCode(c: DiscountCode) {
    setBusy(c.id);
    const { error } = await supabase.from("discount_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); await refresh(); }
    setBusy(null);
  }

  async function deleteCode(c: DiscountCode) {
    if (!confirm(`"${c.code}" kodu silinsin?`)) return;
    setBusy(c.id);
    const { error } = await supabase.from("discount_codes").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); await refresh(); }
    setBusy(null);
  }

  async function openDetails(a: Application) {
    setViewing(a);
    setSigned({});
    const paths = [a.id_front_url, a.id_back_url, a.selfie_url];
    const keys = ["front", "back", "selfie"] as const;
    const results = await Promise.all(paths.map(p => p ? supabase.storage.from("seller-verification").createSignedUrl(p, 600) : Promise.resolve(null as any)));
    const out: any = {};
    results.forEach((r, i) => { if (r?.data?.signedUrl) out[keys[i]] = r.data.signedUrl; });
    setSigned(out);
  }

  async function viewReceipt(t: TopUp) {
    if (!t.receipt_url) { toast.error("Qəbz əlavə edilməyib"); return; }
    const { data, error } = await supabase.storage.from("topup-receipts").createSignedUrl(t.receipt_url, 600);
    if (error || !data) { toast.error(error?.message ?? "Açıla bilmədi"); return; }
    setTopupReceipt({ id: t.id, url: data.signedUrl });
  }

  async function decideTopup(t: TopUp, approve: boolean) {
    const notes = prompt(approve ? "Qeyd (ixtiyari):" : "Rədd səbəbi (ixtiyari):", "") ?? "";
    setBusy(t.id);
    const { error } = await supabase.rpc(approve ? "admin_approve_topup" : "admin_reject_topup", { p_topup_id: t.id, p_notes: notes || undefined });
    if (error) toast.error(error.message);
    else { toast.success(approve ? `+${t.amount} ₼ əlavə edildi` : "Rədd edildi"); await refresh(); }
    setBusy(null);
  }

  async function savePaymentSetting(s: PaymentSetting) {
    setBusy(s.method);
    const { error } = await supabase.from("payment_settings").update({
      label: s.label, instructions: s.instructions, is_active: s.is_active,
    }).eq("method", s.method as any);
    if (error) toast.error(error.message);
    else toast.success(`${s.label} yeniləndi`);
    setBusy(null);
  }


  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-7 w-7 text-neon" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground mb-8">Platforma idarəetməsi və moderasiya.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "İstifadəçi", value: stats.users, icon: Users },
              { label: "Satıcı", value: stats.sellers, icon: ShieldCheck },
              { label: "Məhsul", value: stats.products, icon: Package },
              { label: "Sifariş", value: stats.orders, icon: FileText },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                <s.icon className="h-5 w-5 text-neon mb-3" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
            {([
              ["analytics", "📊 Analitika"],
              ["announcements", "📢 Elanlar"],
              ["applications", `Müraciətlər (${apps.filter(a => a.status === "pending").length})`],
              ["tickets", `Dəstək (${tickets.filter(t => t.status === "open" || t.status === "pending").length})`],
              ["disputes", `Etirazlar (${disputes.length})`],
              ["users", "İstifadəçilər"],
              ["topups", `Balans (${topups.filter(t => t.status === "pending").length})`],
              ["withdrawals", `Pul çıxarış (${withdrawals.filter(w => w.status === "pending").length})`],
              ["platform", `Platforma (${platformBalance.toFixed(2)} ₼)`],
              ["payments", "Rekvizitlər"],
              ["categories", "Kateqoriyalar"],
              ["platforms", "Platformalar"],
              ["banners", "Bannerlər"],
              ["reviews", "Rəylər"],
              ["giftcards", "Hədiyyə kartları"],
              ["giftmarket", "🎮 Gift Marketplace"],
              ["boost", "🚀 Boost qiymətləri"],
              ["codes", "Endirim kodları"],
              ["products", "Məhsullar"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as Tab)}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                  tab === key ? "border-neon text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
          ) : tab === "analytics" ? (
            <AdminAnalytics />
          ) : tab === "applications" ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap mb-2">
                {(["all","pending","approved","rejected"] as const).map(f => {
                  const n = f === "all" ? apps.length : apps.filter(a => a.status === f).length;
                  return (
                    <button key={f} onClick={() => setAppFilter(f)}
                      className={`h-8 px-3 rounded-full text-xs font-semibold transition ${
                        appFilter === f ? "bg-neon text-background" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}>{f === "all" ? "Hamısı" : f === "pending" ? "Gözləyən" : f === "approved" ? "Təsdiqli" : "Rədd"} ({n})</button>
                  );
                })}
              </div>
              {apps.filter(a => appFilter === "all" || a.status === appFilter).length === 0 && (
                <p className="text-muted-foreground text-center py-12">Müraciət yoxdur.</p>
              )}
              {apps.filter(a => appFilter === "all" || a.status === appFilter).map(a => (
                <div key={a.id} className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{a.first_name} {a.last_name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface">{categoryLabel(a.category)}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.status === "approved" ? "bg-success/20 text-success" :
                          a.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                        }`}>{a.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{a.email} · {a.phone}</p>
                      <div className="flex gap-3 mt-2 text-[11px]">
                        {a.id_front_url && <span className="text-success">✓ ID ön</span>}
                        {a.id_back_url && <span className="text-success">✓ ID arxa</span>}
                        {a.selfie_url && <span className="text-success">✓ Selfie</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString("az-AZ")}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openDetails(a)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-border text-sm font-semibold hover:border-primary">
                        <Eye className="h-4 w-4" /> Detallar
                      </button>
                      {a.status === "pending" && (
                        <>
                          <button disabled={busy === a.id} onClick={() => decide(a, "approved")}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                            <CheckCircle2 className="h-4 w-4" /> Təsdiq
                          </button>
                          <button disabled={busy === a.id} onClick={() => decide(a, "rejected")}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                            <XCircle className="h-4 w-4" /> Rədd
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : tab === "users" ? (
            <div className="space-y-2">
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="ID, email, ad, istifadəçi adı və ya IP ilə axtar..."
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm mb-2"
              />
              {(() => {
                const q = userSearch.trim().toLowerCase();
                const filtered = q
                  ? users.filter(u =>
                      u.id.toLowerCase().includes(q) ||
                      (u.email ?? "").toLowerCase().includes(q) ||
                      (u.display_name ?? "").toLowerCase().includes(q) ||
                      (u.username ?? "").toLowerCase().includes(q) ||
                      (u.last_ip ?? "").toLowerCase().includes(q) ||
                      (u.signup_ip ?? "").toLowerCase().includes(q)
                    )
                  : users;
                return <>
                  {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">İstifadəçi tapılmadı.</p>}
                  {filtered.map(u => (
                <div key={u.id} className="rounded-xl border border-border bg-card-gradient p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{u.display_name ?? u.username ?? "—"}</p>
                        <VerifiedBadge verified={u.verified_at} size={16} />
                        {u.roles.map(r => (
                          <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r === "admin" ? "bg-neon/20 text-neon" : r === "seller" ? "bg-success/20 text-success" : "bg-surface text-muted-foreground"
                          }`}>{r}</span>
                        ))}
                        {u.banned_at && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400">BAN</span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                      <p className="text-sm mt-1 inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-neon" /> <span className="font-semibold">{Number(u.wallet_balance).toFixed(2)} ₼</span></p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
                        <span>Son IP: <span className="text-foreground">{u.last_ip ?? "—"}</span>{u.last_ip_at && <span className="ml-1 opacity-70">({new Date(u.last_ip_at).toLocaleString("az-AZ")})</span>}</span>
                        {u.signup_ip && u.signup_ip !== u.last_ip && <span>Qeydiyyat IP: <span className="text-foreground">{u.signup_ip}</span></span>}
                      </div>
                      {u.banned_at && (
                        <p className="mt-1 text-[11px] text-red-400">Ban: {new Date(u.banned_at).toLocaleString("az-AZ")}{u.ban_reason ? ` — ${u.ban_reason}` : ""}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy === u.id} onClick={() => setBalance(u)}
                        className="h-9 px-3 rounded-md text-xs font-semibold bg-surface border border-border hover:border-primary disabled:opacity-50">Balans</button>
                      <button disabled={busy === u.id + "seller"} onClick={() => toggleRole(u, "seller")}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.roles.includes("seller") ? "bg-success/20 text-success" : "bg-surface border border-border"}`}>
                        {u.roles.includes("seller") ? "Satıcı ✓" : "Satıcı et"}
                      </button>
                      <button disabled={busy === u.id + "support"} onClick={() => toggleRole(u, "support")}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.roles.includes("support" as any) ? "bg-primary/20 text-primary" : "bg-surface border border-border"}`}>
                        {u.roles.includes("support" as any) ? "Dəstək ✓" : "Dəstək et"}
                      </button>
                      <button disabled={busy === u.id + "admin" || u.id === user!.id} onClick={() => toggleRole(u, "admin")}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.roles.includes("admin") ? "bg-neon/20 text-neon" : "bg-surface border border-border"}`}>
                        {u.roles.includes("admin") ? "Admin ✓" : "Admin et"}
                      </button>
                      <button disabled={busy === u.id + "verify"} onClick={() => toggleVerified(u)}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.verified_at ? "bg-sky-500/20 text-sky-300" : "bg-surface border border-border"}`}>
                        {u.verified_at ? "✓ Doğrulanmış" : "Doğrula (KYC)"}
                      </button>
                      <button disabled={busy === u.id + "ban" || u.id === user!.id} onClick={() => toggleBan(u)}
                        className={`h-9 px-3 rounded-md text-xs font-semibold disabled:opacity-50 ${u.banned_at ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-surface border border-border hover:border-red-500/60 hover:text-red-400"}`}>
                        {u.banned_at ? "Banı sil" : "Ban et"}
                      </button>

                    </div>
                  </div>
                </div>
              ))}
                </>;
              })()}
            </div>
          ) : tab === "codes" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card-gradient p-5 card-shadow">
                <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni endirim kodu</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <input value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} placeholder="KOD (məs. SUMMER25)" className="h-10 px-3 rounded-lg bg-background border border-border text-sm uppercase" />
                  <input type="number" min="1" max="100" value={newCode.percent} onChange={e => setNewCode({...newCode, percent: e.target.value})} placeholder="Faiz %" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <input type="number" min="1" value={newCode.max_uses} onChange={e => setNewCode({...newCode, max_uses: e.target.value})} placeholder="Maks istifadə (boş = limitsiz)" className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <input type="datetime-local" value={newCode.expires_at} onChange={e => setNewCode({...newCode, expires_at: e.target.value})} className="h-10 px-3 rounded-lg bg-background border border-border text-sm" />
                  <button disabled={busy === "new-code"} onClick={createCode} className="h-10 rounded-lg bg-neon text-background font-semibold disabled:opacity-50">Yarat</button>
                </div>
              </div>

              {codes.length === 0 && <p className="text-muted-foreground text-center py-12">Endirim kodu yoxdur.</p>}
              {codes.map(c => (
                <div key={c.id} className="rounded-xl border border-border bg-card-gradient p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Ticket className="h-4 w-4 text-neon" />
                      <span className="font-mono font-bold">{c.code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon/20 text-neon">-{c.percent}%</span>
                      {!c.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">DEAKTIV</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      İstifadə: {c.used_count}{c.max_uses ? `/${c.max_uses}` : " (limitsiz)"}
                      {c.expires_at && ` · son: ${new Date(c.expires_at).toLocaleDateString("az-AZ")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={busy === c.id} onClick={() => toggleCode(c)}
                      className={`h-8 px-3 rounded-md text-xs font-semibold ${c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Aktiv" : "Deaktiv"}
                    </button>
                    <button disabled={busy === c.id} onClick={() => deleteCode(c)}
                      className="h-8 w-8 grid place-items-center rounded-md text-xs bg-destructive/15 text-destructive hover:bg-destructive/25">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "tickets" ? (
            activeTicket ? (
              <div className="rounded-2xl border border-border bg-card-gradient card-shadow overflow-hidden">
                <div className="p-5 border-b border-border flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button onClick={() => setActiveTicket(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                      <ArrowLeft className="h-3 w-3" /> Geri
                    </button>
                    <h3 className="font-semibold text-lg">{activeTicket.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ticketUser?.name ?? "—"} · {ticketUser?.email ?? activeTicket.user_id.slice(0,8)} · {activeTicket.category}
                      {activeTicket.order_id && ` · Sifariş #${activeTicket.order_id.slice(0,8)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["open","pending","answered","closed"] as const).map(s => (
                      <button key={s} disabled={busy === "status"} onClick={() => setTicketStatus(s)}
                        className={`h-8 px-3 rounded-md text-xs font-semibold ${activeTicket.status === s ? "bg-neon text-background" : "bg-surface border border-border hover:border-primary"}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
                  <div className="rounded-lg bg-surface/40 border border-border p-3">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">İstifadəçi · {new Date(activeTicket.created_at).toLocaleString("az-AZ")}</div>
                    <p className="text-sm whitespace-pre-wrap">{activeTicket.message}</p>
                  </div>
                  {ticketMsgs.map(m => (
                    <div key={m.id} className={`rounded-lg p-3 border ${m.is_admin ? "bg-neon/10 border-neon/30" : "bg-surface/40 border-border"}`}>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">{m.is_admin ? "Admin" : "İstifadəçi"} · {new Date(m.created_at).toLocaleString("az-AZ")}</div>
                      {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
                      {m.attachment_url && <div className="mt-2"><ChatImage path={m.attachment_url} /></div>}
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Admin cavabı..." className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none" />
                  <button onClick={sendReply} disabled={busy === "reply" || !reply.trim()} className="h-10 self-end px-4 rounded-lg bg-neon text-background font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                    {busy === "reply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Göndər
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap mb-2">
                  {(["all","open","pending","answered","closed"] as const).map(f => {
                    const n = f === "all" ? tickets.length : tickets.filter(t => t.status === f).length;
                    return (
                      <button key={f} onClick={() => setTicketFilter(f)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold transition ${ticketFilter === f ? "bg-neon text-background" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                        {f === "all" ? "Hamısı" : f} ({n})
                      </button>
                    );
                  })}
                </div>
                {tickets.filter(t => ticketFilter === "all" || t.status === ticketFilter).length === 0 && (
                  <p className="text-muted-foreground text-center py-12">Müraciət yoxdur.</p>
                )}
                {tickets.filter(t => ticketFilter === "all" || t.status === ticketFilter).map(t => (
                  <button key={t.id} onClick={() => openTicket(t)} className="w-full text-left rounded-xl border border-border bg-card-gradient p-4 hover:border-primary/50 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <LifeBuoy className="h-3.5 w-3.5 text-neon" />
                          <p className="font-semibold truncate">{t.subject}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "answered" ? "bg-success/20 text-success" :
                            t.status === "closed" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-warning"
                          }`}>{t.status}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-surface">{t.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{t.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{new Date(t.updated_at).toLocaleString("az-AZ")}{t.order_id && ` · Sifariş #${t.order_id.slice(0,8)}`}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : tab === "topups" ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap mb-2">
                {(["all","pending","approved","rejected"] as const).map(f => {
                  const n = f === "all" ? topups.length : topups.filter(t => t.status === f).length;
                  return (
                    <button key={f} onClick={() => setTopupFilter(f)}
                      className={`h-8 px-3 rounded-full text-xs font-semibold transition ${topupFilter === f ? "bg-neon text-background" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                      {f === "all" ? "Hamısı" : f === "pending" ? "Gözləyən" : f === "approved" ? "Təsdiqli" : "Rədd"} ({n})
                    </button>
                  );
                })}
              </div>
              {topups.filter(t => topupFilter === "all" || t.status === topupFilter).length === 0 && (
                <p className="text-muted-foreground text-center py-12">Balans müraciəti yoxdur.</p>
              )}
              {topups.filter(t => topupFilter === "all" || t.status === topupFilter).map(t => {
                const u = users.find(x => x.id === t.user_id);
                return (
                  <div key={t.id} className="rounded-xl border border-border bg-card-gradient p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Receipt className="h-4 w-4 text-neon" />
                          <span className="font-bold text-lg">{Number(t.amount).toFixed(2)} ₼</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface">{t.method}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "approved" ? "bg-success/20 text-success" :
                            t.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                          }`}>{t.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{u?.display_name ?? u?.username ?? "—"} · {u?.email ?? t.user_id.slice(0,8)}</p>
                        {t.sender_note && <p className="text-xs mt-1.5 bg-surface/50 px-2 py-1 rounded">Qeyd: {t.sender_note}</p>}
                        {t.admin_notes && <p className="text-xs mt-1.5 bg-neon/5 border border-neon/20 px-2 py-1 rounded">Admin: {t.admin_notes}</p>}
                        <p className="text-[11px] text-muted-foreground mt-2">{new Date(t.created_at).toLocaleString("az-AZ")}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {t.receipt_url && (
                          <button onClick={() => viewReceipt(t)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-border text-sm font-semibold hover:border-primary">
                            <Eye className="h-4 w-4" /> Qəbz
                          </button>
                        )}
                        {t.status === "pending" && (
                          <>
                            <button disabled={busy === t.id} onClick={() => decideTopup(t, true)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                              <CheckCircle2 className="h-4 w-4" /> Təsdiq
                            </button>
                            <button disabled={busy === t.id} onClick={() => decideTopup(t, false)}
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                              <XCircle className="h-4 w-4" /> Rədd
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : tab === "payments" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Bu rekvizitlər istifadəçilərin <span className="text-neon font-semibold">Cüzdan</span> səhifəsində ödəniş üsulu seçildikdə avtomatik göstərilir.</p>
              {paySettings.map((s, i) => (
                <div key={s.method} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface mr-2">{s.method}</span>
                      <input value={s.label} onChange={e => {
                        const next = [...paySettings]; next[i] = { ...s, label: e.target.value }; setPaySettings(next);
                      }} className="h-9 px-3 rounded-md bg-background border border-border text-sm font-semibold" />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={s.is_active} onChange={e => {
                        const next = [...paySettings]; next[i] = { ...s, is_active: e.target.checked }; setPaySettings(next);
                      }} className="h-4 w-4 accent-neon" />
                      Aktiv
                    </label>
                  </div>
                  <textarea value={s.instructions} onChange={e => {
                    const next = [...paySettings]; next[i] = { ...s, instructions: e.target.value }; setPaySettings(next);
                  }} rows={3} placeholder="Məs: m10 nömrəsi: +994 50 123 45 67, Ad: Eli Novruzov"
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm font-mono resize-none" />
                  <div className="flex justify-end">
                    <button disabled={busy === s.method} onClick={() => savePaymentSetting(s)}
                      className="h-9 px-4 rounded-md bg-neon text-background text-sm font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
                      {busy === s.method ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Yadda saxla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "categories" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card-gradient p-4 card-shadow">
                <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni kateqoriya əlavə et</h3>
                <div className="grid sm:grid-cols-5 gap-2">
                  <input value={newCategory.slug} onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })}
                    placeholder="slug (məs: Boosting)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newCategory.label_az} onChange={e => setNewCategory({ ...newCategory, label_az: e.target.value })}
                    placeholder="Ad (AZ)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newCategory.label_en} onChange={e => setNewCategory({ ...newCategory, label_en: e.target.value })}
                    placeholder="Name (EN)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newCategory.label_ru} onChange={e => setNewCategory({ ...newCategory, label_ru: e.target.value })}
                    placeholder="Имя (RU)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <button onClick={addNewCategory} disabled={busy === newCategory.slug}
                    className="h-10 px-4 rounded-md bg-neon text-background text-sm font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                    <Plus className="h-4 w-4" /> Əlavə et
                  </button>
                </div>
              </div>
              {categories.length === 0 && <p className="text-muted-foreground text-center py-12">Kateqoriya yoxdur.</p>}
              {categories.map((c, i) => (
                <div key={c.slug} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow">
                  <div className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface text-center">{c.slug}</span>
                    <input value={c.label_az} onChange={e => { const n = [...categories]; n[i] = { ...c, label_az: e.target.value }; setCategories(n); }}
                      className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                    <input value={c.label_en} onChange={e => { const n = [...categories]; n[i] = { ...c, label_en: e.target.value }; setCategories(n); }}
                      className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                    <input value={c.label_ru} onChange={e => { const n = [...categories]; n[i] = { ...c, label_ru: e.target.value }; setCategories(n); }}
                      className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                    <input type="number" value={c.sort_order} onChange={e => { const n = [...categories]; n[i] = { ...c, sort_order: Number(e.target.value) }; setCategories(n); }}
                      className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={c.is_active} onChange={e => { const n = [...categories]; n[i] = { ...c, is_active: e.target.checked }; setCategories(n); }}
                          className="h-4 w-4 accent-neon" />
                        Aktiv
                      </label>
                      <button disabled={busy === c.slug} onClick={() => saveCategory(c)}
                        className="h-9 w-9 grid place-items-center rounded-md bg-neon text-background disabled:opacity-50" title="Yadda saxla">
                        {busy === c.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button disabled={busy === c.slug} onClick={() => deleteCategory(c.slug)}
                        className="h-9 w-9 grid place-items-center rounded-md bg-destructive text-destructive-foreground disabled:opacity-50" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setExpandedCat(expandedCat === c.slug ? null : c.slug)}
                        className="h-9 px-3 rounded-md bg-surface border border-border text-xs font-semibold hover:border-primary/40" title="Alt-kateqoriyalar">
                        {expandedCat === c.slug ? "▲" : "▼"} Alt
                      </button>
                    </div>
                  </div>

                  {expandedCat === c.slug && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Alt-kateqoriyalar — {c.label_az}</h4>
                      {subcategories.filter(s => s.category_slug === c.slug).map((s, si) => {
                        const idx = subcategories.findIndex(x => x.category_slug === c.slug && x.slug === s.slug);
                        const key = `sub:${c.slug}:${s.slug}`;
                        return (
                          <div key={s.slug} className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-background text-center">{s.slug}</span>
                            <input value={s.label_az} onChange={e => { const n = [...subcategories]; n[idx] = { ...s, label_az: e.target.value }; setSubcategories(n); }}
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input value={s.label_en} onChange={e => { const n = [...subcategories]; n[idx] = { ...s, label_en: e.target.value }; setSubcategories(n); }}
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input value={s.label_ru} onChange={e => { const n = [...subcategories]; n[idx] = { ...s, label_ru: e.target.value }; setSubcategories(n); }}
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input type="number" value={s.sort_order} onChange={e => { const n = [...subcategories]; n[idx] = { ...s, sort_order: Number(e.target.value) }; setSubcategories(n); }}
                              className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                            <div className="flex items-center gap-1.5">
                              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox" checked={s.is_active} onChange={e => { const n = [...subcategories]; n[idx] = { ...s, is_active: e.target.checked }; setSubcategories(n); }}
                                  className="h-4 w-4 accent-neon" />
                                Aktiv
                              </label>
                              <button disabled={busy === key} onClick={() => saveSub(s)}
                                className="h-9 w-9 grid place-items-center rounded-md bg-neon text-background disabled:opacity-50" title="Yadda saxla">
                                {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </button>
                              <button disabled={busy === key} onClick={() => deleteSub(c.slug, s.slug)}
                                className="h-9 w-9 grid place-items-center rounded-md bg-destructive text-destructive-foreground disabled:opacity-50" title="Sil">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {subcategories.filter(s => s.category_slug === c.slug).length === 0 && (
                        <p className="text-xs text-muted-foreground">Bu kateqoriyada alt-kateqoriya yoxdur.</p>
                      )}
                      {(() => {
                        const d = newSub[c.slug] ?? { category_slug: c.slug, slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true };
                        const set = (patch: Partial<Subcategory>) => setNewSub(ns => ({ ...ns, [c.slug]: { ...d, ...patch } as Subcategory }));
                        return (
                          <div className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center pt-2 mt-2 border-t border-dashed border-border">
                            <input value={d.slug} onChange={e => set({ slug: e.target.value })} placeholder="slug"
                              className="h-9 px-2 rounded-md bg-background border border-border text-xs font-bold" />
                            <input value={d.label_az} onChange={e => set({ label_az: e.target.value })} placeholder="Ad (AZ)"
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input value={d.label_en} onChange={e => set({ label_en: e.target.value })} placeholder="Name (EN)"
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input value={d.label_ru} onChange={e => set({ label_ru: e.target.value })} placeholder="Имя (RU)"
                              className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                            <input type="number" value={d.sort_order} onChange={e => set({ sort_order: Number(e.target.value) })}
                              className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                            <button onClick={() => addNewSub(c.slug)}
                              className="h-9 px-3 rounded-md bg-neon text-background text-xs font-semibold neon-ring inline-flex items-center gap-1.5">
                              <Plus className="h-4 w-4" /> Əlavə
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : tab === "platforms" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card-gradient p-4 card-shadow">
                <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni platforma əlavə et</h3>
                <div className="grid sm:grid-cols-5 gap-2">
                  <input value={newPlatform.slug} onChange={e => setNewPlatform({ ...newPlatform, slug: e.target.value })}
                    placeholder="slug (məs: pc)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newPlatform.label_az} onChange={e => setNewPlatform({ ...newPlatform, label_az: e.target.value })}
                    placeholder="Ad (AZ)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newPlatform.label_en} onChange={e => setNewPlatform({ ...newPlatform, label_en: e.target.value })}
                    placeholder="Name (EN)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <input value={newPlatform.label_ru} onChange={e => setNewPlatform({ ...newPlatform, label_ru: e.target.value })}
                    placeholder="Имя (RU)" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
                  <button onClick={addNewPlatform} disabled={busy === `pl:${newPlatform.slug}`}
                    className="h-10 px-4 rounded-md bg-neon text-background text-sm font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                    <Plus className="h-4 w-4" /> Əlavə et
                  </button>
                </div>
              </div>
              {platformsList.length === 0 && <p className="text-muted-foreground text-center py-12">Platforma yoxdur.</p>}
              {platformsList.map((p, i) => {
                const key = `pl:${p.slug}`;
                return (
                  <div key={p.slug} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow">
                    <div className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-surface text-center">{p.slug}</span>
                      <input value={p.label_az} onChange={e => { const n = [...platformsList]; n[i] = { ...p, label_az: e.target.value }; setPlatformsList(n); }}
                        className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                      <input value={p.label_en} onChange={e => { const n = [...platformsList]; n[i] = { ...p, label_en: e.target.value }; setPlatformsList(n); }}
                        className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                      <input value={p.label_ru} onChange={e => { const n = [...platformsList]; n[i] = { ...p, label_ru: e.target.value }; setPlatformsList(n); }}
                        className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                      <input type="number" value={p.sort_order} onChange={e => { const n = [...platformsList]; n[i] = { ...p, sort_order: Number(e.target.value) }; setPlatformsList(n); }}
                        className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                      <div className="flex items-center gap-1.5">
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={p.is_active} onChange={e => { const n = [...platformsList]; n[i] = { ...p, is_active: e.target.checked }; setPlatformsList(n); }}
                            className="h-4 w-4 accent-neon" />
                          Aktiv
                        </label>
                        <button disabled={busy === key} onClick={() => savePlatform(p)}
                          className="h-9 w-9 grid place-items-center rounded-md bg-neon text-background disabled:opacity-50" title="Yadda saxla">
                          {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <button disabled={busy === key} onClick={() => deletePlatform(p.slug)}
                          className="h-9 w-9 grid place-items-center rounded-md bg-destructive text-destructive-foreground disabled:opacity-50" title="Sil">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setExpandedPlatform(expandedPlatform === p.slug ? null : p.slug)}
                          className="h-9 px-3 rounded-md bg-surface border border-border text-xs font-semibold hover:border-primary/40" title="Alt-kateqoriyalar">
                          {expandedPlatform === p.slug ? "▲" : "▼"} Alt
                        </button>
                      </div>
                    </div>

                    {expandedPlatform === p.slug && (
                      <div className="mt-4 pt-4 border-t border-border space-y-2">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Alt-kateqoriyalar — {p.label_az}</h4>
                        {platformSubs.filter(s => s.platform_slug === p.slug).map(s => {
                          const idx = platformSubs.findIndex(x => x.platform_slug === p.slug && x.slug === s.slug);
                          const k = `psub:${p.slug}:${s.slug}`;
                          return (
                            <div key={s.slug} className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-background text-center">{s.slug}</span>
                              <input value={s.label_az} onChange={e => { const n = [...platformSubs]; n[idx] = { ...s, label_az: e.target.value }; setPlatformSubs(n); }}
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input value={s.label_en} onChange={e => { const n = [...platformSubs]; n[idx] = { ...s, label_en: e.target.value }; setPlatformSubs(n); }}
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input value={s.label_ru} onChange={e => { const n = [...platformSubs]; n[idx] = { ...s, label_ru: e.target.value }; setPlatformSubs(n); }}
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input type="number" value={s.sort_order} onChange={e => { const n = [...platformSubs]; n[idx] = { ...s, sort_order: Number(e.target.value) }; setPlatformSubs(n); }}
                                className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                              <div className="flex items-center gap-1.5">
                                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input type="checkbox" checked={s.is_active} onChange={e => { const n = [...platformSubs]; n[idx] = { ...s, is_active: e.target.checked }; setPlatformSubs(n); }}
                                    className="h-4 w-4 accent-neon" />
                                  Aktiv
                                </label>
                                <button disabled={busy === k} onClick={() => savePSub(s)}
                                  className="h-9 w-9 grid place-items-center rounded-md bg-neon text-background disabled:opacity-50" title="Yadda saxla">
                                  {busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                </button>
                                <button disabled={busy === k} onClick={() => deletePSub(p.slug, s.slug)}
                                  className="h-9 w-9 grid place-items-center rounded-md bg-destructive text-destructive-foreground disabled:opacity-50" title="Sil">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {platformSubs.filter(s => s.platform_slug === p.slug).length === 0 && (
                          <p className="text-xs text-muted-foreground">Bu platformada alt-kateqoriya yoxdur.</p>
                        )}
                        {(() => {
                          const d = newPSub[p.slug] ?? { platform_slug: p.slug, slug: "", label_az: "", label_en: "", label_ru: "", sort_order: 10, is_active: true };
                          const set = (patch: Partial<PlatformSub>) => setNewPSub(ns => ({ ...ns, [p.slug]: { ...d, ...patch } as PlatformSub }));
                          return (
                            <div className="grid sm:grid-cols-[100px_1fr_1fr_1fr_80px_auto] gap-2 items-center pt-2 mt-2 border-t border-dashed border-border">
                              <input value={d.slug} onChange={e => set({ slug: e.target.value })} placeholder="slug"
                                className="h-9 px-2 rounded-md bg-background border border-border text-xs font-bold" />
                              <input value={d.label_az} onChange={e => set({ label_az: e.target.value })} placeholder="Ad (AZ)"
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input value={d.label_en} onChange={e => set({ label_en: e.target.value })} placeholder="Name (EN)"
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input value={d.label_ru} onChange={e => set({ label_ru: e.target.value })} placeholder="Имя (RU)"
                                className="h-9 px-3 rounded-md bg-background border border-border text-sm" />
                              <input type="number" value={d.sort_order} onChange={e => set({ sort_order: Number(e.target.value) })}
                                className="h-9 px-2 rounded-md bg-background border border-border text-sm text-center" />
                              <button onClick={() => addNewPSub(p.slug)}
                                className="h-9 px-3 rounded-md bg-neon text-background text-xs font-semibold neon-ring inline-flex items-center gap-1.5">
                                <Plus className="h-4 w-4" /> Əlavə
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : tab === "withdrawals" ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(["pending","approved","rejected","all"] as const).map(s => (
                  <button key={s} onClick={() => setWithdrawFilter(s)}
                    className={`h-8 px-3 rounded-md text-xs font-semibold border ${withdrawFilter === s ? "bg-neon text-background border-neon" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                    {s === "all" ? "Hamısı" : s === "pending" ? "Gözləyən" : s === "approved" ? "Təsdiqli" : "Rədd"}
                  </button>
                ))}
              </div>
              {withdrawals.filter(w => withdrawFilter === "all" || w.status === withdrawFilter).length === 0 && (
                <p className="text-muted-foreground text-center py-12">Çıxarış müraciəti yoxdur.</p>
              )}
              {withdrawals.filter(w => withdrawFilter === "all" || w.status === withdrawFilter).map(w => {
                const u = users.find(x => x.id === w.user_id);
                return (
                  <div key={w.id} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{u?.display_name ?? u?.email ?? w.user_id.slice(0,8)} <span className="text-xs text-muted-foreground font-normal">· {new Date(w.created_at).toLocaleString("az-AZ")}</span></p>
                        <p className="text-sm mt-1">
                          <span className="text-destructive font-bold">−{Number(w.amount).toFixed(2)} ₼</span>
                          <span className="text-muted-foreground"> · komissya </span>
                          <span className="text-warning font-mono">{Number(w.fee).toFixed(2)} ₼</span>
                          <span className="text-muted-foreground"> · alacaq </span>
                          <span className="text-success font-bold">{Number(w.net_amount).toFixed(2)} ₼</span>
                        </p>
                        <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md bg-surface/50 border border-border p-2">
                            <div className="text-[10px] uppercase text-muted-foreground">Üsul</div>
                            <div className="font-medium">{w.method}</div>
                          </div>
                          <div className="rounded-md bg-surface/50 border border-border p-2">
                            <div className="text-[10px] uppercase text-muted-foreground">Hesab</div>
                            <div className="font-mono break-all">{w.destination}</div>
                          </div>
                          {w.account_holder && (
                            <div className="rounded-md bg-surface/50 border border-border p-2 sm:col-span-2">
                              <div className="text-[10px] uppercase text-muted-foreground">Sahib</div>
                              <div>{w.account_holder}</div>
                            </div>
                          )}
                        </div>
                        {w.admin_notes && <p className="text-xs mt-2 bg-background/50 px-2 py-1 rounded">Admin qeydi: {w.admin_notes}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          w.status === "approved" ? "bg-success/20 text-success" :
                          w.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
                        }`}>{w.status}</span>
                        {w.status === "pending" && (
                          <>
                            <button disabled={busy === w.id} onClick={async () => {
                              const notes = prompt("Təsdiq qeydi (ixtiyari):", "") ?? "";
                              if (!confirm(`${Number(w.net_amount).toFixed(2)} ₼ ${w.method} hesabına köçürdünüzmü? Təsdiq edilsin?`)) return;
                              setBusy(w.id);
                              const { error } = await supabase.rpc("admin_approve_withdrawal" as any, { p_id: w.id, p_notes: notes || null });
                              setBusy(null);
                              if (error) toast.error(error.message); else { toast.success("Təsdiqləndi"); refresh(); }
                            }} className="h-9 px-3 rounded-md bg-success text-background text-xs font-semibold disabled:opacity-50">Təsdiq</button>
                            <button disabled={busy === w.id} onClick={async () => {
                              const notes = prompt("Rədd səbəbi:", "") ?? "";
                              if (!notes) return;
                              setBusy(w.id);
                              const { error } = await supabase.rpc("admin_reject_withdrawal" as any, { p_id: w.id, p_notes: notes });
                              setBusy(null);
                              if (error) toast.error(error.message); else { toast.success("Rədd edildi, balans qaytarıldı"); refresh(); }
                            }} className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-50">Rədd</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : tab === "platform" ? (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-neon/30 bg-neon/5 p-5">
                  <p className="text-xs uppercase text-muted-foreground">Cari platforma balansı</p>
                  <p className="font-display text-3xl font-bold text-neon mt-2">{platformBalance.toFixed(2)} ₼</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Bütün komissyalar − manual payoutlar</p>
                </div>
                <div className="rounded-xl border border-border bg-card-gradient p-5">
                  <p className="text-xs uppercase text-muted-foreground">Satış komissyası (cəm)</p>
                  <p className="font-display text-2xl font-bold mt-2">
                    {ledger.filter(l => l.entry_type === "commission_sale").reduce((s, l) => s + Number(l.amount), 0).toFixed(2)} ₼
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card-gradient p-5">
                  <p className="text-xs uppercase text-muted-foreground">Çıxarış komissyası (cəm)</p>
                  <p className="font-display text-2xl font-bold mt-2">
                    {ledger.filter(l => l.entry_type === "commission_withdrawal").reduce((s, l) => s + Number(l.amount), 0).toFixed(2)} ₼
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card-gradient p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <h3 className="font-semibold">Manual payout qeyd et</h3>
                  <button onClick={async () => {
                    const raw = prompt(`Hesabınıza köçürdüyünüz məbləğ (cari balans: ${platformBalance.toFixed(2)} ₼):`, platformBalance.toFixed(2));
                    if (!raw) return;
                    const amt = Number(raw);
                    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Yanlış məbləğ"); return; }
                    const notes = prompt("Qeyd (ixtiyari):", "") ?? "";
                    const { error } = await supabase.rpc("admin_record_platform_payout" as any, { p_amount: amt, p_notes: notes || null });
                    if (error) toast.error(error.message); else { toast.success("Payout qeyd edildi"); refresh(); }
                  }} className="h-9 px-3 rounded-md bg-neon text-background text-xs font-semibold">Payout qeyd et</button>
                </div>
                <p className="text-xs text-muted-foreground">Platforma cüzdanından öz bank hesabınıza köçürmə etdikdə burada qeydiyyatdan keçirin — cari balansdan çıxılacaq.</p>
              </div>

              <div className="rounded-xl border border-border bg-card-gradient p-5">
                <h3 className="font-semibold mb-3">Son əməliyyatlar (200)</h3>
                {ledger.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Əməliyyat yoxdur.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                    {ledger.map(l => (
                      <div key={l.id} className="flex items-center justify-between gap-3 text-xs border border-border rounded-md px-3 py-2 bg-surface/40">
                        <div className="min-w-0">
                          <span className="font-semibold">{l.entry_type}</span>
                          {l.notes && <span className="text-muted-foreground"> · {l.notes}</span>}
                          <div className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("az-AZ")}</div>
                        </div>
                        <span className={`font-mono font-bold ${Number(l.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                          {Number(l.amount) >= 0 ? "+" : ""}{Number(l.amount).toFixed(2)} ₼
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "disputes" ? (
            <div className="space-y-3">
              {disputes.length === 0 && <p className="text-muted-foreground text-center py-12">Açıq etiraz yoxdur.</p>}
              {disputes.map(d => (
                <div key={d.id} className="rounded-xl border border-warning/30 bg-card-gradient p-4 card-shadow">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{d.product?.title ?? "Məhsul"}</p>
                      <p className="text-xs text-muted-foreground">Sifariş: {d.id.slice(0, 8)} · {Number(d.total).toFixed(2)} ₼ · {d.disputed_at ? new Date(d.disputed_at).toLocaleString("az-AZ") : "—"}</p>
                      <p className="text-xs mt-1"><span className="text-muted-foreground">Alıcı:</span> {d.buyer_id.slice(0,8)} · <span className="text-muted-foreground">Satıcı:</span> {d.seller_id.slice(0,8)}</p>
                      {d.disputed_reason && (
                        <div className="mt-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                          <span className="font-semibold text-warning">Səbəb: </span>{d.disputed_reason}
                        </div>
                      )}
                      {d.conversation_id && (
                        <a href={`/messages/${d.conversation_id}`} className="inline-block mt-2 text-xs text-neon hover:underline">↳ Söhbətə bax</a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                      <button disabled={busy === d.id} onClick={async () => {
                        if (!confirm("Alıcıya tam geri qaytarılsın?")) return;
                        setBusy(d.id);
                        const { error } = await supabase.rpc("admin_resolve_dispute" as any, { p_order_id: d.id, p_refund: true });
                        setBusy(null);
                        if (error) toast.error(error.message); else { toast.success("Alıcıya qaytarıldı"); refresh(); }
                      }} className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-50">Tam qaytar</button>
                      <button disabled={busy === d.id} onClick={async () => {
                        const raw = prompt(`Alıcıya qaytarılacaq məbləğ (maks ${Number(d.total).toFixed(2)} ₼):`, (Number(d.total) / 2).toFixed(2));
                        if (!raw) return;
                        const amount = Number(raw);
                        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(d.total)) { toast.error("Yanlış məbləğ"); return; }
                        const notes = prompt("Qeyd (ixtiyari):", "") ?? "";
                        setBusy(d.id);
                        const { error } = await supabase.rpc("admin_partial_refund" as any, { p_order_id: d.id, p_refund_amount: amount, p_notes: notes || null });
                        setBusy(null);
                        if (error) toast.error(error.message); else { toast.success(`${amount.toFixed(2)} ₼ alıcıya qaytarıldı`); refresh(); }
                      }} className="h-9 px-3 rounded-md bg-warning/20 text-warning border border-warning/40 text-xs font-semibold disabled:opacity-50">Qismən qaytar</button>
                      <button disabled={busy === d.id} onClick={async () => {
                        if (!confirm("Satıcıya ödəniş köçürülsün?")) return;
                        setBusy(d.id);
                        const { error } = await supabase.rpc("admin_resolve_dispute" as any, { p_order_id: d.id, p_refund: false });
                        setBusy(null);
                        if (error) toast.error(error.message); else { toast.success("Satıcıya köçürüldü"); refresh(); }
                      }} className="h-9 px-3 rounded-md bg-success text-background text-xs font-semibold disabled:opacity-50">Satıcıya ver</button>
                      <button disabled={busy === d.id} onClick={async () => {
                        const reason = prompt("Ləğv səbəbi:", "") ?? "";
                        if (!confirm(`Sifariş ləğv edilsin? Alıcıya ${Number(d.total).toFixed(2)} ₼ qaytarılacaq.`)) return;
                        setBusy(d.id);
                        const { error } = await supabase.rpc("staff_cancel_order" as any, { p_order_id: d.id, p_reason: reason || null });
                        setBusy(null);
                        if (error) toast.error(error.message); else { toast.success("Ləğv edildi"); refresh(); }
                      }} className="h-9 px-3 rounded-md bg-surface border border-border text-xs font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">Sifarişi ləğv et</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "banners" ? (
            <AdminBanners />
          ) : tab === "reviews" ? (
            <AdminReviews />
          ) : tab === "giftcards" ? (
            <AdminGiftCards />
          ) : tab === "giftmarket" ? (
            <AdminGiftMarket />
          ) : tab === "boost" ? (
            <AdminBoostPricing />
          ) : (
            <div className="space-y-2">
              {products.length === 0 && <p className="text-muted-foreground text-center py-12">Məhsul yoxdur.</p>}
              {products.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card-gradient p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(p.category)} · {p.price} AZN · stok: {p.stock}</p>
                  </div>
                  <button disabled={busy === p.id} onClick={() => toggleProduct(p)}
                    className={`h-8 px-3 rounded-md text-xs font-semibold ${p.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active ? "Aktiv" : "Deaktiv"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {viewing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card-gradient p-6 card-shadow" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-2xl font-bold">{viewing.first_name} {viewing.last_name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Satıcı müraciəti detalları</p>
              </div>
              <button onClick={() => setViewing(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {[
                ["Email", viewing.email],
                ["Telefon", viewing.phone],
                ["Kateqoriya", categoryLabel(viewing.category)],
                ["Status", viewing.status.toUpperCase()],
                ["İstifadəçi ID", viewing.user_id],
                ["Tarix", new Date(viewing.created_at).toLocaleString("az-AZ")],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface/50 border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
                  <div className="text-sm font-medium mt-0.5 break-all">{v}</div>
                </div>
              ))}
            </div>

            {viewing.admin_notes && (
              <div className="rounded-lg bg-surface/50 border border-border p-3 mb-5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Admin qeydləri</div>
                <div className="text-sm mt-1">{viewing.admin_notes}</div>
              </div>
            )}

            <h3 className="font-semibold mb-3 inline-flex items-center gap-2"><FileImage className="h-4 w-4 text-neon" /> Sənədlər</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {(["front","back","selfie"] as const).map(k => {
                const labels = { front: "ID Ön", back: "ID Arxa", selfie: "Selfie" };
                const url = signed[k];
                return (
                  <div key={k} className="rounded-lg border border-border overflow-hidden bg-background">
                    <div className="aspect-[4/3] grid place-items-center bg-surface/40">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                          <img src={url} alt={labels[k]} className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Yüklənir...</span>
                      )}
                    </div>
                    <div className="p-2 text-xs font-semibold text-center">{labels[k]}</div>
                  </div>
                );
              })}
            </div>

            {viewing.status === "pending" && (
              <div className="flex gap-2 mt-6">
                <button disabled={busy === viewing.id} onClick={async () => { await decide(viewing, "approved"); setViewing(null); }}
                  className="flex-1 h-10 rounded-lg bg-success text-background font-semibold disabled:opacity-50">Təsdiq et</button>
                <button disabled={busy === viewing.id} onClick={async () => { await decide(viewing, "rejected"); setViewing(null); }}
                  className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground font-semibold disabled:opacity-50">Rədd et</button>
              </div>
            )}
          </div>
        </div>
      )}


      {topupReceipt && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTopupReceipt(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card-gradient p-4 card-shadow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Ödəniş qəbzi</h3>
              <button onClick={() => setTopupReceipt(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"><X className="h-4 w-4" /></button>
            </div>
            <a href={topupReceipt.url} target="_blank" rel="noreferrer" className="block">
              <img src={topupReceipt.url} alt="Receipt" className="w-full rounded-lg border border-border" />
            </a>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
