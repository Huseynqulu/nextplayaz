import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeGameTitle } from "./title-normalization";

// We'll define the IGDB search logic in a .server.ts file for security
// but first we need the client-side safe functions.

export const searchIgdbCovers = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    productIds: z.array(z.string()),
  }))
  .handler(async ({ data, context }) => {
    const { productIds } = data;
    const { searchIgdbForProducts } = await import("./igdb.server");
    return searchIgdbForProducts(productIds);
  });

export const applyProductCovers = createServerFn({ method: "POST" })
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
    return applyCoversToProducts(matches);
  });
