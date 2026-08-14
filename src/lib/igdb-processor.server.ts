import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface IgdbUploadResult {
  signedUrl: string;
  storagePath: string;
  error?: string;
}

/**
 * Shared helper to download a cover from IGDB, validate it,
 * upload it to Supabase Storage, and return a 10-year signed URL.
 */
export async function downloadAndUploadIgdbCover(
  igdbCoverId: string,
  imageUrl: string,
  sellerId: string,
  normalizedTitle: string
): Promise<IgdbUploadResult> {
  try {
    // 1. Normalize URL
    let fullUrl = imageUrl;
    if (fullUrl.startsWith('//')) {
      fullUrl = 'https:' + fullUrl;
    }
    
    console.log(`[IGDB-Processor] Processing cover ${igdbCoverId} from ${fullUrl}`);

    // 2. Download with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    let response;
    try {
      response = await fetch(fullUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`IGDB download failed: ${response.status} ${response.statusText}`);
    }

    // 3. Validate
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error("Empty image file received");
    }
    
    if (buffer.byteLength > 5 * 1024 * 1024) {
      throw new Error("Image size exceeds 5MB limit");
    }

    const blob = new Blob([buffer], { type: contentType });
    const ext = contentType.split("/")[1] || "jpg";
    
    // 4. Deterministic Storage Path
    const safeTitle = normalizedTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const storagePath = `auto-covers/${sellerId}/${safeTitle}/${igdbCoverId}.${ext}`;

    // 5. Upload to Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(storagePath, blob, { 
        contentType, 
        upsert: true 
      });

    if (uploadError) {
      console.error("[IGDB-Processor] Upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 6. Generate 10-year signed URL (consistent with manual uploads)
    const { data: signData, error: signError } = await supabaseAdmin.storage
      .from("product-images")
      .createSignedUrl(storagePath, 315360000); // 10 years

    if (signError || !signData?.signedUrl) {
      throw signError || new Error("Failed to generate signed URL");
    }

    return {
      signedUrl: signData.signedUrl,
      storagePath
    };
  } catch (err: any) {
    console.error(`[IGDB-Processor] Error:`, err);
    return {
      signedUrl: "",
      storagePath: "",
      error: err.message
    };
  }
}

/**
 * Verifies a URL is publicly accessible without authentication.
 */
export async function verifyPublicUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type');
    return res.ok && !!contentType?.startsWith('image/');
  } catch (err) {
    console.error(`[IGDB-Processor] Public verification failed:`, err);
    return false;
  }
}
