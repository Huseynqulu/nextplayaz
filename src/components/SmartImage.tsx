import { useState, type ImgHTMLAttributes } from "react";
import { imgUrl, imgSrcSet, type ImageTransform } from "@/lib/image-url";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string | null | undefined;
  /** Target render width in CSS px (used for transform). */
  width?: number;
  /** Target render height in CSS px (used for transform). */
  height?: number;
  /** Quality 20..100 (default 75). */
  quality?: number;
  /** Resize mode (default cover). */
  resize?: ImageTransform["resize"];
  /** Pixel widths for srcset (1x/2x). Pass [] to disable srcset. */
  widths?: number[];
  /** `sizes` attribute for responsive selection. */
  sizes?: string;
  /** Eager-load the LCP image. Default: false (lazy). */
  eager?: boolean;
  /** Wrapper className (controls aspect/size). */
  wrapperClassName?: string;
};

/**
 * Lazy-loaded image with blur-up placeholder + Supabase image transform.
 * - loading="lazy" + decoding="async" by default
 * - smooth fade-in on load
 * - srcset for responsive sizes when source is Supabase Storage
 */
export function SmartImage({
  src,
  alt = "",
  width,
  height,
  quality = 75,
  resize = "cover",
  widths,
  sizes,
  eager = false,
  className = "",
  wrapperClassName = "",
  style,
  onLoad,
  onError,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const finalSrc = src ? imgUrl(src, { width, height, quality, resize }) : "";
  const ws = widths && widths.length ? widths : (width ? [width, width * 2] : []);
  const srcSet = src ? imgSrcSet(src, ws, { quality, resize, height }) : "";

  return (
    <span className={`block relative overflow-hidden ${wrapperClassName}`} style={style} aria-hidden={alt === "" ? true : undefined}>
      {/* Blur / shimmer placeholder */}
      <span
        className={`absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        style={{
          background:
            "linear-gradient(110deg, hsl(var(--surface)) 30%, hsl(var(--border)/0.6) 50%, hsl(var(--surface)) 70%)",
          backgroundSize: "200% 100%",
          animation: loaded ? undefined : "smartimg-shimmer 1.4s ease-in-out infinite",
          filter: "blur(8px)",
        }}
      />
      {finalSrc && !errored && (
        <img
          src={finalSrc}
          srcSet={srcSet || undefined}
          sizes={srcSet ? (sizes || "100vw") : undefined}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          width={width}
          height={height}
          className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
          onError={(e) => { setErrored(true); onError?.(e); }}
          {...rest}
        />
      )}
      <style>{`@keyframes smartimg-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </span>
  );
}
