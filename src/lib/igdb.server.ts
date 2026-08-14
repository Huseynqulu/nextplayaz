import { normalizeGameTitle } from "./title-normalization";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


interface IgdbMatch {
  productId: string;
  normalizedTitle: string;
  candidates: Array<{
    igdbId: number;
    name: string;
    coverUrl: string;
    coverId: string;
    releaseYear?: number;
    platforms?: string[];
    confidence: number;
  }>;
}

async function getTwitchToken(clientId: string, clientSecret: string) {
  console.log("[IGDB] Requesting Twitch token...");
  const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[IGDB] Failed to get Twitch token: ${response.status} ${errorText}`);
    throw new Error(`Failed to get Twitch token: ${response.status}`);
  }
  const data = await response.json();
  return data.access_token;
}

export async function searchIgdbForProducts(productIds: string[], userId: string) {
  // supabaseAdmin imported at top scope

  
  // 1. Get products and verify ownership
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, title, seller_id")
    .in("id", productIds)
    .eq("seller_id", userId);

  if (error || !products) throw new Error("Failed to fetch products");

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[IGDB] IGDB credentials not configured (clientId or clientSecret missing)");
    throw new Error("IGDB credentials not configured");
  }

  console.log(`[IGDB] Searching for ${productIds.length} products using clientId: ${clientId.substring(0, 4)}...`);
  const token = await getTwitchToken(clientId, clientSecret);

  const results: IgdbMatch[] = [];

  for (const product of products) {
    const normalized = normalizeGameTitle(product.title);
    
    // IGDB Search
    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `search "${normalized.replace(/"/g, '\\"')}"; fields name, cover.url, cover.image_id, first_release_date, platforms.name; limit 5;`,
    });

    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text();
      console.error(`[IGDB] API error for "${normalized}": ${igdbResponse.status} ${errorText}`);
      continue;
    }

    const games = await igdbResponse.json();
    const candidates = games.map((g: any) => {
      const coverUrl = g.cover?.url ? `https:${g.cover.url.replace("t_thumb", "t_cover_big")}` : "";
      
      // Calculate confidence
      let confidence = 0;
      const lowerName = g.name.toLowerCase();
      const lowerNorm = normalized.toLowerCase();
      
      if (lowerName === lowerNorm) confidence = 100;
      else if (lowerName.includes(lowerNorm) || lowerNorm.includes(lowerName)) confidence = 85;
      else confidence = 60;

      return {
        igdbId: g.id,
        name: g.name,
        coverUrl,
        coverId: g.cover?.image_id || "",
        releaseYear: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : undefined,
        platforms: g.platforms?.map((p: any) => p.name),
        confidence,
      };
    });

    results.push({
      productId: product.id,
      normalizedTitle: normalized,
      candidates,
    });
  }

  return results;
}

export async function applyCoversToProducts(matches: any[], userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const results = [];

  for (const match of matches) {
    try {
      // 1. Download image
      const imgRes = await fetch(match.imageUrl);
      if (!imgRes.ok) throw new Error("Failed to download image");
      
      const blob = await imgRes.blob();
      if (blob.size > 5 * 1024 * 1024) throw new Error("Image too large");
      
      const contentType = blob.type || "image/jpeg";
      const ext = contentType.split("/")[1] || "jpg";
      
      // 2. Fetch product to get seller_id and check ownership
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("seller_id")
        .eq("id", match.productId)
        .eq("seller_id", userId)
        .single();
      
      if (!product) throw new Error("Product not found or unauthorized");

      const path = `auto-covers/${product.seller_id}/${match.normalizedTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}/${match.igdbCoverId}.${ext}`;

      // 3. Upload to storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(path, blob, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);

      // 4. Update product
      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update({
          image_url: publicUrl,
          image_urls: [publicUrl],
        })
        .eq("id", match.productId);

      if (updateError) throw updateError;

      // 5. Audit log
      await supabaseAdmin.from("product_cover_audit").insert({
        product_id: match.productId,
        seller_id: product.seller_id,
        normalized_title: match.normalizedTitle,
        igdb_game_id: match.igdbGameId,
        igdb_cover_id: match.igdbCoverId,
        confidence_score: match.confidence,
        storage_path: path,
      });

      results.push({ productId: match.productId, status: "success", url: publicUrl });
    } catch (err: any) {
      results.push({ productId: match.productId, status: "error", message: err.message });
    }
  }

  return results;
}
