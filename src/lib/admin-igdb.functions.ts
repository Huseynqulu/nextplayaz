import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminAutoCoverStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { count: totalProducts } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true });

    // Products without images (null or empty)
    const { count: productsWithoutImages } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .or('image_url.is.null,image_url.eq.""');

    const { count: productsWithIgdbCovers } = await supabaseAdmin
      .from("product_cover_audit")
      .select("*", { count: "exact", head: true });

    return {
      totalProducts: totalProducts || 0,
      productsWithoutImages: productsWithoutImages || 0,
      productsWithIgdbCovers: productsWithIgdbCovers || 0
    };
  });

/**
 * Canary Test: Processes 5 representative products and verifies them publicly.
 */
export const runCanaryTest = createServerFn({ method: "POST" })
  .handler(async () => {
    const { searchIgdbForProducts } = await import("./igdb.server");
    const { normalizeGameTitle } = await import("./title-normalization");
    const { downloadAndUploadIgdbCover, verifyPublicUrl } = await import("./igdb-processor.server");

    // Get 5 products (attempt to get a mix by order/type)
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, title, seller_id, image_url, image_urls")
      .or('image_url.is.null,image_url.eq.""')
      .limit(5);

    if (!products || products.length === 0) return { success: false, message: "Test üçün məhsul tapılmadı" };

    const results = [];
    console.log(`[Canary] Starting test for ${products.length} products`);

    for (const product of products) {
      try {
        const normalized = normalizeGameTitle(product.title);
        console.log(`[Canary] Normalizing "${product.title}" -> "${normalized}"`);

        const igdbResults = await searchIgdbForProducts([normalized]);
        console.log(`[Canary] IGDB search returned ${igdbResults.length} groups`);

        const igdbResult = igdbResults[0];
        const bestCandidate = igdbResult.candidates?.[0];

        if (bestCandidate && bestCandidate.confidence >= 70) {
          console.log(`[Canary] Found candidate for "${normalized}": ${bestCandidate.name} (${bestCandidate.confidence}%)`);
          const oldImageUrl = product.image_url;
          const oldImageUrls = product.image_urls;

          console.log(`[Canary] Downloading/Uploading cover ${bestCandidate.coverId}`);
          const upload = await downloadAndUploadIgdbCover(
            bestCandidate.coverId,
            bestCandidate.coverUrl,
            product.seller_id,
            normalized
          );

          if (upload.signedUrl) {
            console.log(`[Canary] Upload success: ${upload.signedUrl.substring(0, 50)}...`);
            // Update
            const { error: updateError } = await supabaseAdmin.from("products").update({
              image_url: upload.signedUrl,
              image_urls: [upload.signedUrl]
            }).eq("id", product.id);

            if (updateError) {
              console.error(`[Canary] DB Update error:`, updateError);
              throw updateError;
            }

            // Verify
            console.log(`[Canary] Verifying public access...`);
            const isVerified = await verifyPublicUrl(upload.signedUrl);
            if (!isVerified) {
              console.warn(`[Canary] Verification failed for ${product.id}`);
              await supabaseAdmin.from("products").update({
                image_url: oldImageUrl,
                image_urls: oldImageUrls
              }).eq("id", product.id);
              results.push({ title: product.title, status: "failed", message: "Public verification failed" });
            } else {
              console.log(`[Canary] Success for ${product.id}`);
              results.push({ title: product.title, status: "success" });
            }
          } else {
            console.error(`[Canary] Upload failed: ${upload.error}`);
            results.push({ title: product.title, status: "failed", message: upload.error });
          }
        } else {
          console.log(`[Canary] No high-confidence match for "${normalized}"`);
          results.push({ title: product.title, status: "no_match" });
        }
      } catch (e: any) {
        console.error(`[Canary] Unexpected error for "${product.title}":`, e);
        results.push({ title: product.title, status: "error", message: e.message });
      }
    }

    const allSuccess = results.filter(r => r.status === "success").length > 0;
    return { success: allSuccess, results };
  });

export const processAdminAutoCovers = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    limit: z.number().optional().default(20),
    minConfidence: z.number().optional().default(90),
  }))
  .handler(async ({ data }) => {
    const { limit, minConfidence } = data;
    const { searchIgdbForProducts } = await import("./igdb.server");
    const { normalizeGameTitle } = await import("./title-normalization");
    const { downloadAndUploadIgdbCover, verifyPublicUrl } = await import("./igdb-processor.server");

    const { data: products, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("id, title, seller_id, image_url, image_urls")
      .or('image_url.is.null,image_url.eq.""')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError || !products || products.length === 0) {
      return { processed: 0, status: "completed", message: "Şəkilsiz məhsul tapılmadı" };
    }

    // Grouping by normalized title to reuse covers
    const productGroups = new Map<string, any[]>();
    products.forEach(p => {
      const normalized = normalizeGameTitle(p.title);
      if (!productGroups.has(normalized)) productGroups.set(normalized, []);
      productGroups.get(normalized)!.push(p);
    });

    const uniqueTitles = Array.from(productGroups.keys());
    const igdbResults = await searchIgdbForProducts(uniqueTitles);

    let appliedCount = 0;
    let reviewCount = 0;
    let noMatchCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const igdbResult of igdbResults) {
      const bestCandidate = igdbResult.candidates?.[0];
      const relatedProducts = productGroups.get(igdbResult.normalizedTitle) || [];

      if (!bestCandidate || bestCandidate.confidence < 75) {
        noMatchCount += relatedProducts.length;
        continue;
      }

      // Manual review list for 75-89%
      if (bestCandidate.confidence < minConfidence) {
        reviewCount += relatedProducts.length;
        // Log to a review table if needed, for now just increment counter
        continue;
      }

      // High confidence (90%+) - Reuse one cover for all variants in group
      try {
        const firstProd = relatedProducts[0];
        const upload = await downloadAndUploadIgdbCover(
          bestCandidate.coverId,
          bestCandidate.coverUrl,
          firstProd.seller_id,
          igdbResult.normalizedTitle
        );

        if (upload.signedUrl && await verifyPublicUrl(upload.signedUrl)) {
          for (const prod of relatedProducts) {
            await supabaseAdmin.from("products").update({
              image_url: upload.signedUrl,
              image_urls: [upload.signedUrl],
            }).eq("id", prod.id);

            await supabaseAdmin.from("product_cover_audit").insert({
              product_id: prod.id,
              seller_id: prod.seller_id,
              normalized_title: igdbResult.normalizedTitle,
              igdb_game_id: bestCandidate.igdbId,
              igdb_cover_id: bestCandidate.coverId,
              confidence_score: bestCandidate.confidence,
              storage_path: upload.storagePath,
            });
            appliedCount++;
          }
        } else {
          errorCount += relatedProducts.length;
        }
      } catch (e) {
        errorCount += relatedProducts.length;
      }
    }

    return { 
      processed: products.length, 
      applied: appliedCount, 
      review: reviewCount,
      noMatch: noMatchCount,
      errors: errorCount,
      status: "success"
    };
  });
