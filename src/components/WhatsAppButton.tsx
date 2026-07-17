import { MessageCircleMore } from "lucide-react";

export function WhatsAppButton() {
  const phone = "994102345451";
  const href = `https://wa.me/${phone}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ilə əlaqə"
      className="group fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95"
    >
      <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold ring-2 ring-background">1</span>
      <MessageCircleMore className="relative h-7 w-7 drop-shadow-sm transition-transform group-hover:rotate-[-8deg]" strokeWidth={2.2} />
    </a>
  );
}
