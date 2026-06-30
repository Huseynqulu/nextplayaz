import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaOnClick?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  ctaOnClick,
  secondaryLabel,
  secondaryTo,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}>
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-neon/20 blur-2xl rounded-full" aria-hidden />
        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-neon/15 to-violet-500/15 border border-neon/30 grid place-items-center">
          <Icon className="h-9 w-9 text-neon" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ctaLabel && ctaTo && (
          <Button asChild className="bg-neon text-background hover:bg-neon/90 font-semibold">
            <Link to={ctaTo as any}>{ctaLabel}</Link>
          </Button>
        )}
        {ctaLabel && !ctaTo && ctaOnClick && (
          <Button onClick={ctaOnClick} className="bg-neon text-background hover:bg-neon/90 font-semibold">
            {ctaLabel}
          </Button>
        )}
        {secondaryLabel && secondaryTo && (
          <Button asChild variant="outline">
            <Link to={secondaryTo as any}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
