import { supabase } from "@/integrations/supabase/client";

export async function uploadChatAttachment(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Yalnız şəkil yükləyin");
  if (file.size > 8 * 1024 * 1024) throw new Error("Şəkil 8MB-dan böyük olmamalıdır");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

const cache = new Map<string, { url: string; exp: number }>();
export async function getChatAttachmentUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const c = cache.get(path);
  if (c && c.exp > now) return c.url;
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, exp: now + 50 * 60 * 1000 });
  return data.signedUrl;
}
