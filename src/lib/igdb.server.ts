import { normalizeGameTitle } from "./title-normalization";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { downloadAndUploadIgdbCover, verifyPublicUrl } from "./igdb-processor.server";



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

export async function searchIgdbForProducts(normalizedTitles: string[]) {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[IGDB] IGDB credentials not configured");
    throw new Error("IGDB credentials not configured");
  }

  // 1. Check cache first
  const { data: cached } = await supabaseAdmin
    .from("product_cover_suggestions")
    .select("normalized_title, suggestions")
    .in("normalized_title", normalizedTitles);

  const cachedMap = new Map(cached?.map(c => [c.normalized_title, c.suggestions]) || []);
  const missingTitles = normalizedTitles.filter(t => !cachedMap.has(t));

  if (missingTitles.length === 0) {
    return normalizedTitles.map(t => ({
      normalizedTitle: t,
      candidates: cachedMap.get(t)
    }));
  }

  console.log(`[IGDB] Searching for ${missingTitles.length} missing titles...`);
  const token = await getTwitchToken(clientId, clientSecret);
  const results: any[] = [];

  // IGDB rate limit is 4 requests per second
  for (const title of missingTitles) {
    try {
      const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body: `search "${title.replace(/"/g, '\\"')}"; fields name, cover.url, cover.image_id, first_release_date, platforms.name; limit 5;`,
      });

      if (!igdbResponse.ok) {
        if (igdbResponse.status === 429) {
          console.warn("[IGDB] Rate limit exceeded, skipping title:", title);
          continue;
        }
        const errorText = await igdbResponse.text();
        console.error(`[IGDB] API error for "${title}": ${igdbResponse.status} ${errorText}`);
        continue;
      }

      const games = await igdbResponse.json();
      const candidates = games.map((g: any) => ({
        igdbId: g.id,
        name: g.name,
        coverUrl: g.cover?.url ? `https:${g.cover.url.replace("t_thumb", "t_cover_big")}` : "",
        coverId: g.cover?.image_id || "",
        releaseYear: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : undefined,
        platforms: g.platforms?.map((p: any) => p.name),
        confidence: g.name.toLowerCase() === title.toLowerCase() ? 100 : 
                   (g.name.toLowerCase().includes(title.toLowerCase()) ? 85 : 60)
      }));

      // Cache the result
      await supabaseAdmin.from("product_cover_suggestions").upsert({
        normalized_title: title,
        suggestions: candidates,
        updated_at: new Date().toISOString()
      });

      results.push({ normalizedTitle: title, candidates });
      
      // Small delay to respect rate limits if processing many
      if (missingTitles.length > 5) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } catch (err) {
      console.error(`[IGDB] Error searching for "${title}":`, err);
    }
  }

  // Combine cached and new
  return normalizedTitles.map(t => ({
    normalizedTitle: t,
    candidates: cachedMap.get(t) || results.find(r => r.normalizedTitle === t)?.candidates || []
  }));
}

export async function applyCoversToProducts(matches: any[], userId: string) {
  const results = [];

  for (const match of matches) {
    try {
      // 1. Fetch product to get seller_id and check ownership
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("seller_id, image_url, image_urls")
        .eq("id", match.productId)
        .eq("seller_id", userId)
        .single();
      
      if (!product) throw new Error("Product not found or unauthorized");

      // 2. Use shared helper for processing
      const uploadResult = await downloadAndUploadIgdbCover(
        match.igdbCoverId,
        match.imageUrl,
        product.seller_id,
        match.normalizedTitle
      );

      if (uploadResult.error) throw new Error(uploadResult.error);

      // 3. Public verification (anonymous)
      const isVerified = await verifyPublicUrl(uploadResult.signedUrl);
      if (!isVerified) {
        throw new Error("İctimai səhifədə yoxlama uğursuz oldu");
      }

      // 4. Update product
      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update({
          image_url: uploadResult.signedUrl,
          image_urls: [uploadResult.signedUrl],
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
        storage_path: uploadResult.storagePath,
      });

      results.push({ productId: match.productId, status: "success", url: uploadResult.signedUrl });
    } catch (err: any) {
      console.error(`[IGDB] Failed to apply cover for product ${match.productId}:`, err);
      results.push({ productId: match.productId, status: "error", message: err.message });
    }
  }

  return results;
}
