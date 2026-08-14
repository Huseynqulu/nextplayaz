import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { downloadAndUploadIgdbCover, verifyPublicUrl } from "./igdb-processor.server";

export interface RepairStatus {
  productId: string;
  title: string;
  status: "success" | "skipped_manual" | "skipped_working" | "error" | "failed_verification";
  message: string;
}

export interface DryRunReport {
  totalInspected: number;
  identifiedIgdb: number;
  brokenIgdb: number;
  manualUploaded: number;
  products: Array<{
    id: string;
    title: string;
    imageUrl: string;
    reason: string;
  }>;
}

/**
 * Identifies products that need repair.
 */
export const getRepairDryRun = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Fetch all products with auto-cover indicators
    const { data: allProducts } = await supabaseAdmin
      .from("products")
      .select("id, title, image_url, image_urls")
      .not("image_url", "is", null);

    if (!allProducts) return { totalInspected: 0, identifiedIgdb: 0, brokenIgdb: 0, manualUploaded: 0, products: [] };

    const brokenPattern = "/storage/v1/object/public/product-images/auto-covers/";
    const igdbPattern = "igdb.com";

    const productsToRepair = allProducts
      .filter(p => {
        const url = p.image_url || "";
        return url.includes(brokenPattern) || url.includes(igdbPattern);
      })
      .map(p => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url || "",
        reason: p.image_url?.includes(brokenPattern) ? "Public Storage URL" : "Direct IGDB URL"
      }));

    return {
      totalInspected: allProducts.length,
      identifiedIgdb: productsToRepair.length,
      brokenIgdb: productsToRepair.length,
      manualUploaded: allProducts.length - productsToRepair.length,
      products: productsToRepair
    };
  });

/**
 * Executes repair on a batch of products.
 */
export const executeRepairBatch = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    productIds: z.array(z.string()) 
  }).parse(data))
  .handler(async ({ data }) => {
    const results: RepairStatus[] = [];

    for (const productId of data.productIds) {
      try {
        // 1. Get product and its audit data
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("id, title, seller_id, image_url")
          .eq("id", productId)
          .single();

        if (!product) {
          results.push({ productId, title: "Unknown", status: "error", message: "Məhsul tapılmadı" });
          continue;
        }

        const { data: audit } = await supabaseAdmin
          .from("product_cover_audit")
          .select("*")
          .eq("product_id", productId)
          .maybeSingle();

        if (!audit) {
          results.push({ productId, title: product.title, status: "error", message: "Audit qeydi tapılmadı" });
          continue;
        }

        // 2. We need the original IGDB cover URL to re-process if we don't have it in audit
        // But for these, we have the IGDB IDs. We can reconstruct the IGDB URL if needed,
        // or re-search. However, the audit record HAS the storage_path if it was uploaded.
        // If it was uploaded to storage, we just need to re-sign it.
        
        let finalUrl = "";
        let storagePath = audit.storage_path;

        if (storagePath) {
          console.log(`[Repair] Re-signing existing storage path: ${storagePath}`);
          const { data: signData, error: signError } = await supabaseAdmin.storage
            .from("product-images")
            .createSignedUrl(storagePath, 315360000);

          if (signError || !signData?.signedUrl) {
            throw signError || new Error("Yenidən imzalama uğursuz oldu");
          }
          finalUrl = signData.signedUrl;
        } else {
          // If no storage path, we need to download/upload again
          // Reconstruct IGDB URL from cover_id
          const igdbUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${audit.igdb_cover_id}.jpg`;
          const uploadResult = await downloadAndUploadIgdbCover(
            audit.igdb_cover_id,
            igdbUrl,
            product.seller_id,
            audit.normalized_title || product.title
          );

          if (uploadResult.error) throw new Error(uploadResult.error);
          finalUrl = uploadResult.signedUrl;
          storagePath = uploadResult.storagePath;
        }

        // 3. Verify Public Access
        const isVerified = await verifyPublicUrl(finalUrl);
        if (!isVerified) {
          results.push({ productId, title: product.title, status: "failed_verification", message: "İctimai səhifədə yoxlama uğursuz oldu" });
          continue;
        }

        // 4. Update Product
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update({
            image_url: finalUrl,
            image_urls: [finalUrl]
          })
          .eq("id", productId);

        if (updateError) throw updateError;

        // 5. Update Audit if storage path changed
        if (storagePath !== audit.storage_path) {
          await supabaseAdmin
            .from("product_cover_audit")
            .update({ storage_path: storagePath })
            .eq("id", audit.id);
        }

        results.push({ productId, title: product.title, status: "success", message: "Uğurla düzəldildi" });
      } catch (err: any) {
        console.error(`[Repair] Error for ${productId}:`, err);
        results.push({ productId, title: "Unknown", status: "error", message: err.message });
      }
    }

    return results;
  });
