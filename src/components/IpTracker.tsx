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
