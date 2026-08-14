// Image URL transformer.
// For Supabase Storage public URLs, swaps `/object/public/` with `/render/image/public/`
// and appends width/height/quality. Supabase serves WebP automatically when the
// browser supports it. Non-Supabase URLs are returned unchanged.

export type ImageTransform = {
  width?: number;
  height?: number;
  quality?: number; // 20..100
  resize?: "cover" | "contain" | "fill";
};

export function imgUrl(src: string | null | undefined, t: ImageTransform = {}): string {
  if (!src) return "";
  // Only transform Supabase public storage URLs
  // Transform Supabase public or signed storage URLs
  const publicMarker = "/storage/v1/object/public/";
  const signedMarker = "/storage/v1/object/sign/";
  const isPublic = src.indexOf(publicMarker) !== -1;
  const isSigned = src.indexOf(signedMarker) !== -1;

  if (!isPublic && !isSigned) return src;

  const marker = isPublic ? publicMarker : signedMarker;
  const i = src.indexOf(marker);
  const target = isPublic ? "/storage/v1/render/image/public/" : "/storage/v1/render/image/sign/";

  const base = src.slice(0, i) + target + src.slice(i + marker.length);
  const url = new URL(base);
  if (t.width) url.searchParams.set("width", String(Math.round(t.width)));
  if (t.height) url.searchParams.set("height", String(Math.round(t.height)));
  url.searchParams.set("resize", t.resize || "cover");
  url.searchParams.set("quality", String(t.quality ?? 75));

  return url.toString();
  const base = src.slice(0, i) + "/storage/v1/render/image/public/" + src.slice(i + marker.length);
  const params = new URLSearchParams();
  if (t.width) params.set("width", String(Math.round(t.width)));
  if (t.height) params.set("height", String(Math.round(t.height)));
  params.set("resize", t.resize || "cover");
  params.set("quality", String(t.quality ?? 75));
  return `${base}?${params.toString()}`;
}

// Build a `srcset` for responsive images. Returns "" for non-transformable URLs.
export function imgSrcSet(src: string | null | undefined, widths: number[], t: Omit<ImageTransform, "width"> = {}): string {
  if (!src) return "";
  if (src.indexOf("/storage/v1/object/public/") === -1) return "";
  return widths.map(w => `${imgUrl(src, { ...t, width: w })} ${w}w`).join(", ");
}
