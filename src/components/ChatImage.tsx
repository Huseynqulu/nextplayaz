import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getChatAttachmentUrl } from "@/lib/chat-attachments";

export function ChatImage({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getChatAttachmentUrl(path).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!url) return <div className="h-32 w-48 rounded-lg bg-surface/60 animate-pulse" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block max-w-full cursor-zoom-in transition hover:opacity-90"
      >
        <img
          src={url}
          alt="attachment"
          className={className ?? "max-h-64 w-auto max-w-full h-auto rounded-lg border border-border object-cover"}
        />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Bağla"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={url}
            alt="attachment preview"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl cursor-zoom-out"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm"
          >
            Yeni pəncərədə aç
          </a>
        </div>,
        document.body
      )}
    </>
  );
}
