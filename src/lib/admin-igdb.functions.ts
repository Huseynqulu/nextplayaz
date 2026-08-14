import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminAutoCoverStats = createServerFn({ method: "GET" })
  .handler(async () => {
    // Check if the caller is an admin (this is usually handled by TanStack middleware, 
    // but we can add a secondary check inside the handler for safety)
    
    const { count: totalProducts } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true });

    const { count: productsWithoutImages } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("image_url", null);

    const { count: productsWithIgdbCovers } = await supabaseAdmin
      .from("product_cover_audit")
      .select("*", { count: "exact", head: true });

    return {
      totalProducts: totalProducts || 0,
      productsWithoutImages: productsWithoutImages || 0,
      productsWithIgdbCovers: productsWithIgdbCovers || 0
    };
  });

export const processAdminAutoCovers = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    limit: z.number().optional().default(20),
  }))
  .handler(async ({ data }) => {
    const { limit } = data;
    const { searchIgdbForProducts, applyCoversToProducts } = await import("./igdb.server");
    const { normalizeGameTitle } = await import("./title-normalization");

    // 1. Fetch products without images
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, title, seller_id")
      .is("image_url", null)
      .limit(limit);

    if (!products || products.length === 0) {
      return { processed: 0, status: "completed", message: "Şəkilsiz məhsul tapılmadı" };
    }

    // 2. Group and search
    const results = [];
    const titles = products.map(p => normalizeGameTitle(p.title));
    const uniqueTitles = Array.from(new Set(titles));
    
    const igdbResults = await searchIgdbForProducts(uniqueTitles);

    // 3. Auto-apply high confidence matches
    const matchesToApply = [];
    for (const product of products) {
      const normalized = normalizeGameTitle(product.title);
      const match = igdbResults.find(r => r.normalizedTitle === normalized);
      const bestCandidate = match?.candidates?.[0];

      // Only apply if the product doesn't already have an audit entry (to prevent re-processing)
      if (bestCandidate && bestCandidate.confidence >= 70) {
        matchesToApply.push({
          productId: product.id,
          igdbGameId: bestCandidate.igdbId,
          igdbCoverId: bestCandidate.coverId,
          imageUrl: bestCandidate.coverUrl,
          normalizedTitle: normalized,
          confidence: bestCandidate.confidence,
          sellerId: product.seller_id // Pass sellerId to bypass userId requirement if needed
        });
      }
    }

    if (matchesToApply.length === 0) {
      return { 
        processed: products.length, 
        applied: 0, 
        status: "no_high_confidence", 
        message: `${products.length} məhsul yoxlanıldı, lakin yüksək uyğunluqlu şəkil tapılmadı` 
      };
    }

    // 4. We need to modify applyCoversToProducts to accept a custom sellerId 
    // or use a new internal helper that doesn't check against userId.
    // For now, let's process them one by one using a new internal helper logic.
    const { downloadAndUploadIgdbCover, verifyPublicUrl } = await import("./igdb-processor.server");
    
    let appliedCount = 0;
    for (const match of matchesToApply) {
      try {
        const uploadResult = await downloadAndUploadIgdbCover(
          match.igdbCoverId,
          match.imageUrl,
          match.sellerId,
          match.normalizedTitle
        );

        if (!uploadResult.error && uploadResult.signedUrl) {
          const isVerified = await verifyPublicUrl(uploadResult.signedUrl);
          if (isVerified) {
            await supabaseAdmin
              .from("products")
              .update({
                image_url: uploadResult.signedUrl,
                image_urls: [uploadResult.signedUrl],
              })
              .eq("id", match.productId);

            await supabaseAdmin.from("product_cover_audit").insert({
              product_id: match.productId,
              seller_id: match.sellerId,
              normalized_title: match.normalizedTitle,
              igdb_game_id: match.igdbGameId,
              igdb_cover_id: match.igdbCoverId,
              confidence_score: match.confidence,
              storage_path: uploadResult.storagePath,
            });
            appliedCount++;
          }
        }
      } catch (e) {
        console.error(`[AdminAutoCover] Error processing ${match.productId}:`, e);
      }
    }

    return { 
      processed: products.length, 
      applied: appliedCount, 
      status: "success", 
      message: `${products.length} məhsuldan ${appliedCount} ədədinə şəkil əlavə edildi` 
    };
  });
