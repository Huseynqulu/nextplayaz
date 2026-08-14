import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchIgdbCovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    productIds: z.array(z.string()),
  }))
  .handler(async ({ data, context }) => {
    const { productIds } = data;
    const { searchIgdbForProducts } = await import("./igdb.server");
    return searchIgdbForProducts(productIds, context.userId);
  });

export const applyProductCovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    matches: z.array(z.object({
      productId: z.string(),
      igdbGameId: z.number(),
      igdbCoverId: z.string(),
      imageUrl: z.string(),
      normalizedTitle: z.string(),
      confidence: z.number(),
    })),
  }))
  .handler(async ({ data, context }) => {
    const { matches } = data;
    const { applyCoversToProducts } = await import("./igdb.server");
    return applyCoversToProducts(matches, context.userId);
  });

