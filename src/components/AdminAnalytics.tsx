import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, DollarSign, ShoppingBag, Users } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Link } from "@tanstack/react-router";

type Daily = { day: string; orders: number; gmv: number; commission: number };
type Seller = { seller_id: string; name: string; avatar_url: string | null; orders: number; gmv: number; commission: number };
type Cat = { category: string; orders: number; gmv: number };
type NewUser = { day: string; users: number };
type Analytics = {
  totals: { gmv: number; commission: number; orders: number; completed: number; cancelled: number; disputed: number; avg_order: number };
  daily: Daily[];
  top_sellers: Seller[];
  categories: Cat[];
  new_users: NewUser[];
};

const RANGES = [
  { v: 7, label: "7 gün" },
  { v: 30, label: "30 gün" },
  { v: 90, label: "90 gün" },
  { v: 365, label: "1 il" },
];

const COLORS = ["#a855f7", "#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6"];

const fmt = (n: number) => `${Number(n || 0).toLocaleString("az-AZ", { maximumFractionDigits: 2 })} ₼`;
const fmtNum = (n: number) => Number(n || 0).toLocaleString("az-AZ");

export function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.rpc("admin_analytics" as any, { p_days: days }).then(({ data, error }) => {
      if (error) console.error(error);
      else setData(data as Analytics);
      setLoading(false);
    });
  }, [days]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>;
  }
  if (!data) return <p className="text-muted-foreground text-center py-12">Məlumat yoxdur</p>;

  const t = data.totals;
  const dailyChart = (data.daily || []).map(d => ({ ...d, day: new Date(d.day).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit" }) }));
  const usersChart = (data.new_users || []).map(d => ({ ...d, day: new Date(d.day).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit" }) }));

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map(r => (
          <button key={r.v} onClick={() => setDays(r.v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
              days === r.v ? "bg-neon/20 text-neon border-neon/50" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="GMV" value={fmt(t.gmv)} accent="text-neon" />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Komissiya" value={fmt(t.commission)} accent="text-success" />
        <KpiCard icon={<ShoppingBag className="h-5 w-5" />} label="Sifariş" value={fmtNum(t.orders)} accent="text-primary" />
        <KpiCard icon={<Users className="h-5 w-5" />} label="Orta sifariş" value={fmt(t.avg_order)} accent="text-warning" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniCard label="Tamamlanmış" value={fmtNum(t.completed)} className="text-success" />
        <MiniCard label="Ləğv edilmiş" value={fmtNum(t.cancelled)} className="text-muted-foreground" />
        <MiniCard label="Etirazlı" value={fmtNum(t.disputed)} className="text-destructive" />
      </div>

      {/* Daily GMV chart */}
      <Panel title="Günlük GMV və Komissiya">
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="gGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="day" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8 }} />
              <Area type="monotone" dataKey="gmv" stroke="#a855f7" fill="url(#gGmv)" name="GMV ₼" />
              <Area type="monotone" dataKey="commission" stroke="#10b981" fill="url(#gCom)" name="Komissiya ₼" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Daily orders */}
      <Panel title="Günlük sifariş sayı">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="day" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8 }} />
              <Bar dataKey="orders" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Sifariş" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Categories pie */}
        <Panel title="Kateqoriya breakdown (GMV)">
          {data.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Məlumat yoxdur</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.categories} dataKey="gmv" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.category}>
                    {data.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* New users */}
        <Panel title="Yeni istifadəçilər">
          {usersChart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Məlumat yoxdur</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={usersChart}>
                  <defs>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="day" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="users" stroke="#f59e0b" fill="url(#gUsers)" name="İstifadəçi" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* Top sellers */}
      <Panel title="Top 10 satıcı">
        {data.top_sellers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Satış yoxdur</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Satıcı</th>
                  <th className="py-2 pr-3 text-right">Sifariş</th>
                  <th className="py-2 pr-3 text-right">GMV</th>
                  <th className="py-2 pr-3 text-right">Komissiya</th>
                </tr>
              </thead>
              <tbody>
                {data.top_sellers.map((s, i) => (
                  <tr key={s.seller_id} className="border-b border-border/50 hover:bg-card/50">
                    <td className="py-2.5 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <Link to="/u/$id" params={{ id: s.seller_id }} className="flex items-center gap-2 hover:text-neon">
                        {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-neon/20" />}
                        <span className="font-medium truncate max-w-[180px]">{s.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right">{fmtNum(s.orders)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-neon">{fmt(s.gmv)}</td>
                    <td className="py-2.5 pr-3 text-right text-success">{fmt(s.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-4">
      <div className={`flex items-center gap-2 ${accent} mb-1`}>{icon}<span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function MiniCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${className || ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default AdminAnalytics;
