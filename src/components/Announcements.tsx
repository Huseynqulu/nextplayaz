import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, ArrowRight, Tag } from "lucide-react";

type Announcement = {
  id: string;
  content: string;
  link_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  is_active: boolean;
};

export function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    supabase.from("announcements" as any)
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setItems(data as any);
      });
  }, []);

  if (!isVisible || items.length === 0) return null;

  // For now just show the first active announcement
  const item = items[0];

  return (
    <div 
      className="relative z-50 border-b border-white/10 overflow-hidden"
      style={{ 
        backgroundColor: item.bg_color || "hsl(var(--neon))",
        color: item.text_color || "hsl(var(--background))"
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center justify-center gap-2 text-center text-xs sm:text-sm font-bold tracking-tight uppercase italic">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <p>
              {item.content}
            </p>
            {item.link_url && (
              <Link 
                to={item.link_url} 
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:opacity-80 transition ml-2"
              >
                İndi bax <ArrowRight className="h-3 w-3 sm:h-3.5 sm:h-3.5" />
              </Link>
            )}
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-black/10 rounded-lg transition"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Decorative pulse/glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse pointer-events-none" />
    </div>
  );
}
