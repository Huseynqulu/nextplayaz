import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, ShoppingBag, Coins, Package2 } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  seller_net: number;
  status: string;
  quantity: number;
  product_id: string;
  products: { title: string } | null;
};

const COUNTED = new Set(["paid", "delivered", "completed"]);

export function SellerAnalytics({ sellerId }: { sellerId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id,created_at,total,seller_net,status,quantity,product_id,products(title)")
        .eq("seller_id", sellerId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (!cancel) {
        setRows((data as any) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [sellerId]);

  const stats = useMemo(() => {
    const valid = rows.filter(r => COUNTED.has(r.status));
    const revenue = valid.reduce((s, r) => s + Number(r.seller_net || 0), 0);
    const gross = valid.reduce((s, r) => s + Number(r.total || 0), 0);
    const orders = valid.length;
    const units = valid.reduce((s, r) => s + (r.quantity || 0), 0);

    // Last 30 days series
    const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { date: key.slice(5), revenue: 0, orders: 0 });
    }
    for (const r of valid) {
      const key = r.created_at.slice(0, 10);
      const slot = byDay.get(key);
      if (slot) {
        slot.revenue += Number(r.seller_net || 0);
        slot.orders += 1;
      }
    }
    const series = Array.from(byDay.values());

    // Top products
    const byProd = new Map<string, { title: string; revenue: number; units: number; orders: number }>();
    for (const r of valid) {
      const k = r.product_id;
      const prev = byProd.get(k) ?? { title: r.products?.title ?? "—", revenue: 0, units: 0, orders: 0 };
      prev.revenue += Number(r.seller_net || 0);
      prev.units += r.quantity || 0;
      prev.orders += 1;
      byProd.set(k, prev);
    }
    const topProducts = Array.from(byProd.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { revenue, gross, orders, units, series, topProducts };
  }, [rows]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card-gradient p-8 card-shadow mb-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neon" />
      </div>
    );
  }

  const Stat = ({ icon: Icon, label, value, sub }: any) => (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card-gradient p-6 card-shadow mb-8">
      <div className="flex items-center gap-3 mb-5">
        <TrendingUp className="h-5 w-5 text-neon" />
        <h2 className="font-display text-lg font-bold">Analitika — son 30 gün</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={Coins} label="Xalis gəlir" value={`${stats.revenue.toFixed(2)} ₼`} sub={`Brüt: ${stats.gross.toFixed(2)} ₼`} />
        <Stat icon={ShoppingBag} label="Sifariş sayı" value={stats.orders} />
        <Stat icon={Package2} label="Satılmış vahid" value={stats.units} />
        <Stat icon={TrendingUp} label="Orta sifariş" value={`${stats.orders ? (stats.gross / stats.orders).toFixed(2) : "0.00"} ₼`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-surface/30 p-4">
          <div className="text-sm font-semibold mb-3">Gündəlik gəlir</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--neon))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--neon))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(2)} ₼`, "Gəlir"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--neon))" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface/30 p-4">
          <div className="text-sm font-semibold mb-3">Ən çox satılan məhsullar</div>
          {stats.topProducts.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Hələ satış yoxdur</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="title" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(t: string) => t.length > 16 ? t.slice(0, 16) + "…" : t} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)} ₼`, "Gəlir"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--neon))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {stats.topProducts.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 px-2">Məhsul</th>
                <th className="text-right py-2 px-2">Sifariş</th>
                <th className="text-right py-2 px-2">Vahid</th>
                <th className="text-right py-2 px-2">Gəlir</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium">{p.title}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{p.orders}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{p.units}</td>
                  <td className="py-2 px-2 text-right font-semibold text-neon">{p.revenue.toFixed(2)} ₼</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
