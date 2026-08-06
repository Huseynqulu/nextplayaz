import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Upload, Download, FileText, BookOpen, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  onDone: () => void;
};

const CATEGORIES = ["Games", "Accounts", "Keys", "Services"] as const;
const HEADER = [
  "title", "description", "price", "old_price",
  "category", "platform", "delivery", "stock",
  "stock_items", "image_url", "auto_message",
];

const TEMPLATE_CSV = `title,description,price,old_price,category,platform,delivery,stock,stock_items,image_url,auto_message
"Valorant 1000 VP","Sürətli çatdırılma",9.99,12,Games,Valorant,Instant,,"KOD1|KOD2|KOD3",https://...,Təşəkkürlər!
"PUBG 60 UC Hesabı","Tam giriş",4.5,,Accounts,PUBG Mobile,Manual,1,,https://...,
"Steam Wallet Key 50₺","Steam üçün cüzdan kodu",25,,Keys,Steam,Instant,,"AAAA-BBBB-CCCC|DDDD-EEEE-FFFF",,`;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) + "-" + Math.random().toString(36).slice(2, 6);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some(v => v.trim() !== "")) rows.push(row);
        row = [];
      } else cur += c;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); if (row.some(v => v.trim() !== "")) rows.push(row); }
  return rows;
}

export function BulkUploadDialog({ open, onClose, sellerId, onDone }: Props) {
  const [tab, setTab] = useState<"guide" | "upload">("guide");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ row: number; title: string; ok: boolean; error?: string }[]>([]);

  if (!open) return null;

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nextplay-toplu-mehsul-sablonu.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsvText(text);
    setTab("upload");
  }

  async function process() {
    if (!csvText.trim()) { toast.error("CSV faylı boşdur"); return; }
    const rows = parseCSV(csvText);
    if (rows.length < 2) { toast.error("Ən azı 1 məhsul sətri olmalıdır"); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const missing = HEADER.filter(h => !header.includes(h));
    if (missing.length) { toast.error(`Sütun çatışmır: ${missing.join(", ")}`); return; }
    const idx: Record<string, number> = {};
    HEADER.forEach(h => { idx[h] = header.indexOf(h); });

    setBusy(true);
    setResults([]);
    const out: typeof results = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const get = (k: string) => (r[idx[k]] ?? "").trim();
      const title = get("title");
      try {
        if (!title) throw new Error("title boşdur");
        const price = Number(get("price"));
        if (!Number.isFinite(price) || price <= 0) throw new Error("price düzgün deyil");
        const oldPriceRaw = get("old_price");
        const old_price = oldPriceRaw ? Number(oldPriceRaw) : null;
        const category = get("category") as any;
        if (!CATEGORIES.includes(category)) throw new Error(`category yanlışdır (${category})`);
        const platform = get("platform");
        if (!platform) throw new Error("platform boşdur");
        const delivery = (get("delivery") || "Manual") as "Instant" | "Manual";
        if (delivery !== "Instant" && delivery !== "Manual") throw new Error("delivery Instant və ya Manual olmalıdır");

        const stockItemsRaw = get("stock_items");
        const stockItems = delivery === "Instant"
          ? stockItemsRaw.split("|").map(s => s.trim()).filter(Boolean)
          : [];
        const stock = delivery === "Instant"
          ? stockItems.length
          : Math.max(1, Number(get("stock") || "1"));
        if (delivery === "Instant" && stockItems.length === 0) throw new Error("Sürətli çatdırılma üçün stock_items boşdur");

        const imageUrlRaw = get("image_url");
        const imageUrls = imageUrlRaw
          ? imageUrlRaw.split("|").map(s => s.trim()).filter(s => /^https?:\/\//i.test(s))
          : [];
        const image_url = imageUrls[0] || null;
        const auto_message = get("auto_message") || null;

        const payload: any = {
          seller_id: sellerId,
          title,
          slug: slugify(title),
          description: get("description") || null,
          price, old_price, stock,
          category, platform,
          delivery,
          image_url,
          image_urls: imageUrls,
          auto_message_enabled: !!auto_message,
          auto_message,
        };
        const { data: ins, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;

        if (delivery === "Instant" && ins?.id && stockItems.length) {
          const { error: se } = await supabase.from("product_stock_items" as any).insert(
            stockItems.map(content => ({ product_id: ins.id, content }))
          );
          if (se) throw se;
        }
        out.push({ row: i + 1, title, ok: true });
      } catch (e: any) {
        out.push({ row: i + 1, title, ok: false, error: e.message ?? String(e) });
      }
      setResults([...out]);
    }
    setBusy(false);
    const okN = out.filter(x => x.ok).length;
    toast.success(`${okN}/${out.length} məhsul yükləndi`);
    if (okN > 0) onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card-gradient p-6 card-shadow" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Upload className="h-6 w-6 text-neon" /> Toplu məhsul yerləşdirmə
            </h2>
            <p className="text-sm text-muted-foreground mt-1">CSV faylı vasitəsilə bir neçə məhsulu eyni anda əlavə edin.</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-2 border-b border-border mb-5">
          {[["guide", "Bələdçi", BookOpen], ["upload", "Yüklə", Upload]].map(([k, l, Icon]: any) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-2 px-4 h-10 -mb-px border-b-2 text-sm font-semibold ${tab === k ? "border-neon text-neon" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>

        {tab === "guide" && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-neon/30 bg-neon/5 p-4">
              <p className="font-semibold text-neon mb-2">1. Şablonu yüklə</p>
              <p className="text-muted-foreground mb-3">Aşağıdakı düymə ilə nümunəli CSV şablonunu yüklə və Excel / Google Sheets ilə aç.</p>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neon text-background font-semibold">
                <Download className="h-4 w-4" /> Şablonu yüklə (CSV)
              </button>
            </div>

            <div className="rounded-xl border border-border bg-surface/40 p-4">
              <p className="font-semibold mb-2">2. Sütunların izahı</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li><b className="text-foreground">title</b> — Məhsul adı (mütləq)</li>
                <li><b className="text-foreground">description</b> — Açıqlama (boş ola bilər)</li>
                <li><b className="text-foreground">price</b> — Qiymət AZN (mütləq, &gt; 0)</li>
                <li><b className="text-foreground">old_price</b> — Köhnə qiymət (boş ola bilər)</li>
                <li><b className="text-foreground">category</b> — Games / Accounts / Keys / Services</li>
                <li><b className="text-foreground">platform</b> — Məs: Valorant, PUBG Mobile, Steam, PlayStation</li>
                <li><b className="text-foreground">delivery</b> — <code>Instant</code> (anında) və ya <code>Manual</code> (əllə)</li>
                <li><b className="text-foreground">stock</b> — Manual üçün stok sayı (Instant-da boş)</li>
                <li><b className="text-foreground">stock_items</b> — Instant üçün stok elementləri. <b>«|» işarəsi</b> ilə ayır: <code>KOD1|KOD2|KOD3</code></li>
                <li><b className="text-foreground">image_url</b> — Şəkil linki (URL). Bir neçə şəkil üçün <code>«|»</code> ilə ayır: <code>https://.../1.jpg|https://.../2.jpg</code>. Birinci əsas şəkil olur. Boş ola bilər.</li>
                <li><b className="text-foreground">auto_message</b> — Alışdan sonra avtomatik mesaj (boş = söndürülmüş)</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface/40 p-4">
              <p className="font-semibold mb-2">3. Diqqət</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs list-disc pl-5">
                <li>Birinci sətir mütləq sütun adlarıdır — silmə.</li>
                <li>Vergül ehtiva edən mətnləri <code>"dırnaq"</code> içində yaz.</li>
                <li>Instant məhsul üçün <code>stock</code> avtomatik <code>stock_items</code> sayından hesablanır.</li>
                <li>Hər sətir bir məhsul = bir elan deməkdir. Səhv sətirlər atlanır, digərləri uğurla yüklənir.</li>
                <li>Yüklədikdən sonra «Məhsullarım» bölməsindən şəkilləri əlavə edə və redaktə edə bilərsiniz.</li>
              </ul>
            </div>

            <button onClick={() => setTab("upload")} className="w-full h-11 rounded-lg bg-neon text-background font-semibold neon-ring">
              Davam et — Faylı yüklə →
            </button>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-surface hover:border-neon cursor-pointer text-sm font-semibold">
                <FileText className="h-4 w-4" /> CSV faylı seç
                <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
              </label>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-surface hover:border-neon text-sm font-semibold">
                <Download className="h-4 w-4" /> Şablonu yüklə
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">və ya CSV mətnini yapışdır</label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                rows={8} placeholder="title,description,price,..."
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono" />
            </div>

            <button onClick={process} disabled={busy || !csvText.trim()}
              className="w-full h-11 rounded-lg bg-neon text-background font-semibold neon-ring disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Yüklənir..." : "Yüklə"}
            </button>

            {results.length > 0 && (
              <div className="rounded-xl border border-border bg-surface/40 divide-y divide-border max-h-64 overflow-y-auto">
                {results.map(r => (
                  <div key={r.row} className="flex items-start gap-3 p-3 text-sm">
                    {r.ok
                      ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      : <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate"><span className="text-muted-foreground">Sətir {r.row}:</span> <b>{r.title || "(adı yox)"}</b></p>
                      {!r.ok && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
