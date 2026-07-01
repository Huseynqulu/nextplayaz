import { useEffect, useState } from "react";
import { getChatAttachmentUrl } from "@/lib/chat-attachments";

export function ChatImage({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getChatAttachmentUrl(path).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [path]);
  if (!url) return <div className="h-32 w-48 rounded-lg bg-surface/60 animate-pulse" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block w-fit">
      <img src={url} alt="attachment" className={className ?? "max-h-64 max-w-[240px] rounded-lg border border-border object-cover"} />
    </a>
  );
}
