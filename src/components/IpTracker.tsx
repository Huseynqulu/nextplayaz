import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recordMyIp } from "@/lib/ip.functions";

export function IpTracker() {
  const record = useServerFn(recordMyIp);
  useEffect(() => {
    let done = false;
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || done) return;
      done = true;
      try { await record(); } catch {}
      try {
        const { data: prof } = await (supabase
          .from("profiles") as any)
          .select("banned_at, ban_reason")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (prof?.banned_at) {
          await supabase.auth.signOut();
          alert(`Hesabınız ban edilib.${prof.ban_reason ? `\nSəbəb: ${prof.ban_reason}` : ""}`);
          window.location.href = "/";
        }
      } catch {}
    };
    run();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        done = false;
        run();
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [record]);
  return null;
}
