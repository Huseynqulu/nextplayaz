import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000; // 2 min
}

export function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "heç vaxt aktiv olmayıb";
  const diff = Date.now() - new Date(lastSeen).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "indi onlayn";
  if (m < 60) return `${m} dəq əvvəl aktiv idi`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat əvvəl aktiv idi`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün əvvəl aktiv idi`;
  return new Date(lastSeen).toLocaleDateString("az-AZ");
}

export function useOnlinePresence() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const ping = () => { void supabase.rpc("touch_last_seen" as any); };
    ping();
    const id = setInterval(() => { if (alive) ping(); }, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [user]);
}
