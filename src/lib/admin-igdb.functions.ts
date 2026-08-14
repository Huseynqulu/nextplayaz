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
    const { searchIgdbForProducts } = await import("./igdb.server");
    const { normalizeGameTitle } = await import("./title-normalization");

    console.log(`[AdminAutoCover] Starting batch processing, limit: ${limit}`);

    // 1. Fetch products without images
    // EXCLUSION: If we already tried this product in product_cover_audit, maybe skip it if it failed?
    // For now, let's just get the oldest products without images.
    const { data: products, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("id, title, seller_id")
      .is("image_url", null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error("[AdminAutoCover] Fetch error:", fetchError);
      throw new Error(`Məhsul siyahısı alınarkən xəta: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      console.log("[AdminAutoCover] No products without images found.");
      return { processed: 0, status: "completed", message: "Şəkilsiz məhsul tapılmadı" };
    }

    console.log(`[AdminAutoCover] Processing ${products.length} products:`, products.map(p => p.title));

    // 2. Group and search
    const titles = products.map(p => normalizeGameTitle(p.title));
    const uniqueTitles = Array.from(new Set(titles));
    
    console.log(`[AdminAutoCover] Searching IGDB for ${uniqueTitles.length} unique titles...`);
    const igdbResults = await searchIgdbForProducts(uniqueTitles);

    // 3. Auto-apply high confidence matches
    const matchesToApply = [];
    for (const product of products) {
      const normalized = normalizeGameTitle(product.title);
      const match = igdbResults.find(r => r.normalizedTitle === normalized);
      const bestCandidate = match?.candidates?.[0];

      // Use a slightly lower threshold for auto-apply to increase coverage, 
      // but only if it's the top result.
      if (bestCandidate && bestCandidate.confidence >= 70) {
        matchesToApply.push({
          productId: product.id,
          igdbGameId: bestCandidate.igdbId,
          igdbCoverId: bestCandidate.coverId,
          imageUrl: bestCandidate.coverUrl,
          normalizedTitle: normalized,
          confidence: bestCandidate.confidence,
          sellerId: product.seller_id
        });
      } else {
        console.log(`[AdminAutoCover] Low confidence or no match for "${product.title}" (Score: ${bestCandidate?.confidence || 0})`);
      }
    }

    console.log(`[AdminAutoCover] Found ${matchesToApply.length} high-confidence matches to apply.`);

    if (matchesToApply.length === 0) {
      // We still "processed" them (checked them), so we should return processed count 
      // so the UI can move to the next batch.
      return { 
        processed: products.length, 
        applied: 0, 
        status: "no_matches", 
        message: `${products.length} məhsul yoxlanıldı, uyğun şəkil tapılmadı` 
      };
    }

    const { downloadAndUploadIgdbCover, verifyPublicUrl } = await import("./igdb-processor.server");
    
    let appliedCount = 0;
    for (const match of matchesToApply) {
      try {
        console.log(`[AdminAutoCover] Applying cover to ${match.productId} (${match.normalizedTitle})...`);
        const uploadResult = await downloadAndUploadIgdbCover(
          match.igdbCoverId,
          match.imageUrl,
          match.sellerId,
          match.normalizedTitle
        );

        if (!uploadResult.error && uploadResult.signedUrl) {
          const isVerified = await verifyPublicUrl(uploadResult.signedUrl);
          if (isVerified) {
            const { error: updateError } = await supabaseAdmin
              .from("products")
              .update({
                image_url: uploadResult.signedUrl,
                image_urls: [uploadResult.signedUrl],
              })
              .eq("id", match.productId);

            if (updateError) {
               console.error(`[AdminAutoCover] Product update error for ${match.productId}:`, updateError);
               continue;
            }

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
            console.log(`[AdminAutoCover] Successfully applied cover to ${match.productId}`);
          } else {
            console.warn(`[AdminAutoCover] Verification failed for ${match.productId}`);
          }
        } else {
          console.error(`[AdminAutoCover] Upload error for ${match.productId}:`, uploadResult.error);
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
