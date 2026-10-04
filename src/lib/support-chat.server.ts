import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./ai-gateway-run-id.server";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const SITE = "https://nextplay.az";

const SYSTEM = `Sən NextPlay.az onlayn oyun mağazasının AI dəstək köməkçisisən. Adın "NextPlay Köməkçi"dir.
- Həmişə müştərinin yazdığı dildə cavab ver (əsasən Azərbaycan dili; rus və ingilis dilində də cavab verə bilərsən). Qısa, mehriban və dəqiq ol.
- NextPlay.az rəsmi mağazadır: oyunlar, oyun hesabları, açarlar, hədiyyə kartları və rəqəmsal xidmətlər satır. Ödəniş sayt cüzdanı (balans) ilə edilir; balans "Cüzdan" səhifəsindən artırılır.
- Məhsul, qiymət, stok və ya platforma soruşulanda MÜTLƏQ "search_catalog" alətindən istifadə et. Qiymət və ya məhsul uydurma. Tapdığın məhsulları qiyməti (AZN) və linki ilə göstər: ${SITE}/product/<slug>.
- P2 (Offline) = oyun yalnız aktiv hesabda oynanılır; P3 (Universal) = istənilən şəxsi hesabda oynanılır.
- Sifariş statusu, ödəniş problemi, geri qaytarma, şikayət kimi şəxsi hesab məlumatı tələb edən məsələləri həll edə bilmirsənsə, və ya müştəri canlı insanla danışmaq istəyirsə, "request_human_agent" alətini çağır. Müştəriyə heç vaxt şifrə və ya kart məlumatı soruşma.
- Bilmədiyin şeyi uydurma; əmin deyilsənsə canlı əməkdaşa yönləndirməyi təklif et.`;

function publicClient() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const tools = {
  search_catalog: tool({
    description: "Mağaza kataloqunda aktiv məhsulları axtarır (ad, platforma və ya kateqoriya üzrə).",
    inputSchema: z.object({
      query: z.string().describe("Axtarış sözü, məs. oyun adı. Boş ola bilər."),
      platform: z.string().nullable().describe("Məs. PS4/PS5, Steam, Xbox; bilinmirsə null"),
      max_price: z.number().nullable().describe("Maksimum qiymət AZN; yoxdursa null"),
    }),
    execute: async ({ query, platform, max_price }) => {
      let q = publicClient()
        .from("public_active_products")
        .select("title, slug, price, old_price, platform, category, stock, delivery")
        .gt("stock", 0)
        .order("price", { ascending: true })
        .limit(8);
      const term = query.trim().replace(/[%,()]/g, " ").slice(0, 80);
      if (term) q = q.ilike("title", `%${term}%`);
      if (platform) q = q.ilike("platform", `%${platform.replace(/[%,()]/g, " ")}%`);
      if (max_price != null) q = q.lte("price", max_price);
      const { data, error } = await q;
      if (error) return { error: "Kataloq hazırda əlçatan deyil." };
      return {
        results: (data ?? []).map((p) => ({ ...p, url: `${SITE}/product/${p.slug}` })),
      };
    },
  }),
  request_human_agent: tool({
    description: "Müştərini canlı dəstək əməkdaşına yönləndirir.",
    inputSchema: z.object({ reason: z.string().describe("Yönləndirmə səbəbinin qısa xülasəsi") }),
    execute: async ({ reason }) => ({ handoff: true, reason }),
  }),
};

export async function handleSupportChat(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ error: "AI xidməti konfiqurasiya edilməyib." }, { status: 500 });

  let messages: UIMessage[];
  try {
    const body = await request.json();
    messages = z.array(z.any()).max(60).parse(body?.messages) as UIMessage[];
  } catch {
    return Response.json({ error: "Yanlış sorğu." }, { status: 400 });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: false,
      onError: (err) => {
        console.error("[support-chat]", err);
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 429) return "Hazırda çox sorğu var. Bir az sonra yenidən yazın.";
        if (status === 402) return "AI dəstək xidməti müvəqqəti əlçatan deyil. Canlı əməkdaşla əlaqə saxlayın.";
        return "Cavab alınmadı. Yenidən cəhd edin və ya canlı əməkdaşa yazın.";
      },
    }),
    runIdFetch,
  );
}
