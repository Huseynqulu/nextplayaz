import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Upload, ShieldCheck, TrendingUp, Wallet, CheckCircle2, Loader2, Clock, XCircle, Info, Lock, UserCheck, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/seller")({
  component: SellerPage,
  head: () => ({ meta: [{ title: "Satıcı ol — NextPlay.az" }] }),
});

type FileSlot = "id_front" | "id_back" | "selfie";

function SellerPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<{ status: string; created_at: string } | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "",
    category: "Games" as "Games" | "Accounts" | "Keys" | "Services",
  });
  const [files, setFiles] = useState<Record<FileSlot, File | null>>({ id_front: null, id_back: null, selfie: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setLoadingApp(false); return; }
    setForm(f => ({ ...f, email: user.email ?? "" }));
    supabase.from("seller_applications")
      .select("status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExisting(data);
        setLoadingApp(false);
      });
  }, [user]);

  async function uploadFile(slot: FileSlot): Promise<string | null> {
    const file = files[slot];
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${slot}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("seller-verification").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { navigate({ to: "/login" }); return; }
    if (!files.id_front || !files.id_back || !files.selfie) {
      toast.error("Bütün şəxsiyyət sənədləri tələb olunur");
      return;
    }
    setSubmitting(true);
    try {
      const [id_front_url, id_back_url, selfie_url] = await Promise.all([
        uploadFile("id_front"), uploadFile("id_back"), uploadFile("selfie"),
      ]);
      const { error } = await supabase.from("seller_applications").insert({
        user_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
        category: form.category,
        id_front_url, id_back_url, selfie_url,
      });
      if (error) throw error;
      toast.success("Müraciətin qəbul edildi! Yoxlama 24 saat çəkir.");
      setExisting({ status: "pending", created_at: new Date().toISOString() });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Xəta baş verdi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-hero border-b border-border">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
            <span className="text-xs font-semibold tracking-[0.2em] text-neon uppercase">Satıcı ol</span>
            <h1 className="mt-3 font-display text-4xl sm:text-6xl font-bold">
              Gaming məhsullarınla <br /><span className="text-gradient">qazanmağa başla</span>
            </h1>
            <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
              Sadəcə bir neçə addımda yoxlanılmış satıcı statusu qazan və minlərlə alıcıya çıxış əldə et.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-bold">Niyə NextPlay-də satmalısan?</h2>
            {[
              { icon: TrendingUp, t: "Yüksək qazanc", d: "Orta aylıq satıcı qazancı 800-2500 AZN" },
              { icon: Wallet, t: "Sürətli ödəniş", d: "Tamamlanmış sifariş — 24 saata balansda" },
              { icon: ShieldCheck, t: "Tam qorunma", d: "Escrow sistem fraud-dan qoruyur" },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-border bg-card-gradient">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon/15 border border-neon/30 shrink-0">
                  <f.icon className="h-5 w-5 text-neon" />
                </div>
                <div>
                  <h4 className="font-semibold">{f.t}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{f.d}</p>
                </div>
              </div>
            ))}
          </div>

          {authLoading || loadingApp ? (
            <div className="rounded-2xl border border-border bg-card-gradient p-10 grid place-items-center card-shadow">
              <Loader2 className="h-6 w-6 animate-spin text-neon" />
            </div>
          ) : !user ? (
            <SignInPrompt />
          ) : existing ? (
            <StatusCard status={existing.status} createdAt={existing.created_at} />
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card-gradient p-7 card-shadow">
              <h3 className="font-display text-xl font-bold mb-2">Satıcı müraciəti</h3>
              <p className="text-sm text-muted-foreground mb-6">Yoxlamadan sonra hesabın 24 saat ərzində aktivləşir.</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Ad" placeholder="Eyvaz" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                <Field label="Soyad" placeholder="Məmmədov" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                <Field label="Email" type="email" placeholder="you@example.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Field label="Telefon" placeholder="+994 50 123 45 67" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Kateqoriya</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="Games">Oyunlar</option>
                  <option value="Accounts">Hesablar</option>
                  <option value="Keys">Açarlar</option>
                  <option value="Services">Xidmətlər</option>
                </select>
              </div>

              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                <FileUpload label="Vəsiqə ön" file={files.id_front} onChange={f => setFiles({ ...files, id_front: f })} />
                <FileUpload label="Vəsiqə arxa" file={files.id_back} onChange={f => setFiles({ ...files, id_back: f })} />
                <FileUpload label="Selfie" file={files.selfie} onChange={f => setFiles({ ...files, selfie: f })} />
              </div>

              <label className="flex gap-2 text-xs text-muted-foreground mt-5">
                <input type="checkbox" required className="accent-primary mt-0.5" />
                <span>Bütün məlumatların doğru olduğunu təsdiq edirəm</span>
              </label>

              <button disabled={submitting} className="mt-6 w-full h-12 rounded-xl bg-neon text-background font-semibold neon-ring hover:scale-[1.005] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Müraciət göndər
              </button>

              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Sənin məlumatların şifrələnir və yalnız yoxlama üçün istifadə olunur
              </div>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="rounded-2xl border border-border bg-card-gradient p-10 text-center card-shadow">
      <h3 className="font-display text-xl font-bold">Əvvəlcə daxil ol</h3>
      <p className="mt-2 text-sm text-muted-foreground">Satıcı müraciəti üçün hesab tələb olunur.</p>
      <div className="mt-5 flex justify-center gap-2">
        <a href="/login" className="inline-flex h-11 items-center px-5 rounded-xl bg-neon text-background font-semibold neon-ring">Daxil ol</a>
        <a href="/register" className="inline-flex h-11 items-center px-5 rounded-xl border border-border hover:bg-surface font-semibold">Qeydiyyat</a>
      </div>
    </div>
  );
}

function StatusCard({ status, createdAt }: { status: string; createdAt: string }) {
  const info = {
    pending: { icon: Clock, color: "text-warning", title: "Müraciətin baxılır", desc: "Komandamız 24 saat ərzində yoxlamanı tamamlayacaq." },
    approved: { icon: CheckCircle2, color: "text-success", title: "Təbriklər! Təsdiqləndin", desc: "Artıq məhsul əlavə edə bilərsən." },
    rejected: { icon: XCircle, color: "text-destructive", title: "Müraciət rədd edildi", desc: "Yenidən müraciət etmək üçün dəstəklə əlaqə saxla." },
  }[status] ?? { icon: Clock, color: "text-muted-foreground", title: status, desc: "" };
  const Icon = info.icon;
  return (
    <div className="rounded-2xl border border-border bg-card-gradient p-10 text-center card-shadow">
      <Icon className={`h-12 w-12 mx-auto ${info.color}`} />
      <h3 className="mt-4 font-display text-xl font-bold">{info.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{info.desc}</p>
      <p className="mt-4 text-xs text-muted-foreground">Göndərilib: {new Date(createdAt).toLocaleString("az")}</p>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <input {...props} className="w-full h-11 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function FileUpload({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className={`cursor-pointer flex flex-col items-center justify-center h-28 rounded-xl border border-dashed bg-background hover:bg-surface transition text-center px-2 ${file ? "border-neon" : "border-border hover:border-primary"}`}>
      <Upload className={`h-5 w-5 mb-1.5 ${file ? "text-success" : "text-neon"}`} />
      <span className="text-xs font-medium truncate max-w-full">{file ? file.name : label}</span>
      <span className="text-[10px] text-muted-foreground">PNG, JPG · max 5MB</span>
      <input type="file" className="hidden" accept="image/*" onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}
