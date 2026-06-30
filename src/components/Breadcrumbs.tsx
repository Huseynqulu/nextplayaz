import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = {
  label: string;
  to?: string;
  search?: Record<string, any>;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana səhifə", item: "/" },
      ...items.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.label,
        ...(c.to ? { item: c.to } : {}),
      })),
    ],
  };

  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-6">
      <ol className="flex items-center gap-1.5 flex-wrap text-muted-foreground">
        <li>
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition">
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Ana</span>
          </Link>
        </li>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
              {last || !c.to ? (
                <span
                  className={`truncate max-w-[180px] sm:max-w-[280px] ${last ? "text-foreground font-medium" : ""}`}
                  aria-current={last ? "page" : undefined}
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.to as any}
                  search={c.search as any}
                  className="truncate max-w-[180px] sm:max-w-[280px] hover:text-foreground transition"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
