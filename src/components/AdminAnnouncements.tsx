import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Megaphone, Send } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  recipients_count: number;
  created_at: string;
};

export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (title.trim().length < 2 || body.trim().length < 2) {
      toast.error("Başlıq və mətn tələb olunur");
      return;
    }
    if (!confirm("Bu elan BÜTÜN istifadəçilərə göndəriləcək. Davam edək?")) return;
    setSending(true);
    const { data, error } = await supabase.rpc("admin_broadcast_announcement", {
      p_title: title.trim(),
      p_body: body.trim(),
      p_link: link.trim() || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    const recipients = (data as { recipients?: number } | null)?.recipients ?? 0;
    toast.success(`Elan göndərildi — ${recipients} istifadəçi`);
    setTitle(""); setBody(""); setLink("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card-gradient p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-neon" />
          <h3 className="font-semibold">Yeni elan göndər</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Bu mesaj bildiriş kimi bütün istifadəçilərə çatdırılacaq. İstifadəçilər cavab verə bilməyəcək.
        </p>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Başlıq (məs. Texniki işlər)"
          className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Mətn..."
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-y"
        />
        <input
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder="Əlavə link (məcburi deyil) — məs. /marketplace"
          className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
        />
        <div className="flex justify-end">
          <button
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-neon text-background font-semibold text-sm disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Hamıya göndər
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Göndərilmiş elanlar</h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">Hələ elan yoxdur.</p>
        ) : (
          <div className="space-y-2">
            {items.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-card-gradient p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-medium">{a.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("az-AZ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                {a.link && <p className="text-xs text-neon mt-1">→ {a.link}</p>}
                <p className="text-xs text-muted-foreground mt-2">📨 {a.recipients_count} istifadəçiyə çatdırıldı</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
