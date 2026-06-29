import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function extractIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("true-client-ip") ||
    null
  );
}

export const recordMyIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const req = getRequest();
    const ip = extractIp(req.headers);
    if (!ip) return { ok: false };
    await (context.supabase.rpc as any)("record_user_ip", { p_ip: ip });
    return { ok: true };
  });
