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
  const marker = "/storage/v1/object/public/";
  const i = src.indexOf(marker);
  if (i === -1) return src;
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
