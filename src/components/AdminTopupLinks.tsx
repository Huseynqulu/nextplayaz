import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, Link as LinkIcon } from "lucide-react";

type Link = { id: string; amount: number; url: string; is_active: boolean; sort_order: number };

const PRESETS = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200];

export function AdminTopupLinks() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newUrl, setNewUrl] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("topup_payment_links" as any).select("*").order("amount");
    setLinks((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function addLink() {
    const amt = Number(newAmount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Düzgün məbləğ daxil edin"); return; }
    if (!/^https?:\/\//i.test(newUrl.trim())) { toast.error("Link http:// və ya https:// ilə başlamalıdır"); return; }
    setBusy("new");
    const { error } = await supabase.from("topup_payment_links" as any).insert({
      amount: amt, url: newUrl.trim(), is_active: true,
    } as any);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setNewAmount(""); setNewUrl("");
    toast.success("Əlavə edildi");
    await load();
  }

  async function saveLink(l: Link) {
    if (!/^https?:\/\//i.test(l.url.trim())) { toast.error("Link keçərsizdir"); return; }
    setBusy(l.id);
    const { error } = await supabase.from("topup_payment_links" as any)
      .update({ url: l.url.trim(), is_active: l.is_active, amount: Number(l.amount) } as any)
      .eq("id", l.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Yeniləndi");
    await load();
  }

  async function removeLink(id: string) {
    if (!confirm("Bu linki silmək istədiyinizdən əminsiniz?")) return;
    setBusy(id);
    const { error } = await supabase.from("topup_payment_links" as any).delete().eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    await load();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Hər məbləğ üçün BirBank statik ödəniş linkini əlavə edin. Alıcı cüzdanda həmin məbləği yazdıqda avtomatik uyğun link seçilir və ödəniş açılır.
      </p>

      <div className="rounded-xl border border-border bg-card-gradient p-4 card-shadow space-y-3">
        <h3 className="font-semibold inline-flex items-center gap-2"><Plus className="h-4 w-4 text-neon" /> Yeni link əlavə et</h3>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button key={p} type="button" onClick={() => setNewAmount(String(p))}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border transition ${
                Number(newAmount) === p ? "bg-neon text-background border-neon" : "bg-surface border-border hover:border-neon/40"
              }`}>
              {p} ₼
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
          <input type="number" min="1" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)}
            placeholder="Məbləğ" className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder="https://link.birbank.az/..." className="h-10 px-3 rounded-md bg-background border border-border text-sm" />
          <button disabled={busy === "new"} onClick={addLink}
            className="h-10 px-4 rounded-md bg-neon text-background text-sm font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Əlavə et
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Hələ ödəniş linki əlavə edilməyib.</p>
      ) : (
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={l.id} className="rounded-xl border border-border bg-card-gradient p-4 card-shadow space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-display text-lg font-bold text-neon">{Number(l.amount).toFixed(2)} ₼</span>
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer ml-auto">
                  <input type="checkbox" checked={l.is_active} onChange={e => {
                    const n = [...links]; n[i] = { ...l, is_active: e.target.checked }; setLinks(n);
                  }} className="h-4 w-4 accent-neon" />
                  Aktiv
                </label>
                <button disabled={busy === l.id} onClick={() => removeLink(l.id)}
                  className="grid h-8 w-8 place-items-center rounded-md bg-destructive/15 hover:bg-destructive hover:text-destructive-foreground text-destructive transition disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input value={l.url} onChange={e => {
                  const n = [...links]; n[i] = { ...l, url: e.target.value }; setLinks(n);
                }} className="flex-1 h-9 px-3 rounded-md bg-background border border-border text-xs font-mono" />
              </div>
              <div className="flex justify-end">
                <button disabled={busy === l.id} onClick={() => saveLink(l)}
                  className="h-8 px-3 rounded-md bg-neon text-background text-xs font-semibold neon-ring disabled:opacity-50 inline-flex items-center gap-1.5">
                  {busy === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Yadda saxla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
