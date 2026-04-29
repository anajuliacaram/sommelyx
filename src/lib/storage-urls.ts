import { supabase } from "@/integrations/supabase/client";

export type StorageRef = {
  bucket: string;
  path: string;
};

const STORAGE_URL_PATTERNS = [
  /\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i,
  /\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/i,
  /\/storage\/v1\/object\/authenticated\/([^/]+)\/([^?]+)/i,
];

export function extractStorageRef(value?: string | null): StorageRef | null {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url || /^(data|blob):/i.test(url)) return null;

  if (!/^https?:\/\//i.test(url)) {
    return { bucket: "wine-label-images", path: url.replace(/^\/+/, "") };
  }

  for (const pattern of STORAGE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1] && match?.[2]) {
      try {
        return { bucket: match[1], path: decodeURIComponent(match[2]) };
      } catch {
        return { bucket: match[1], path: match[2] };
      }
    }
  }

  return null;
}

export async function resolveStorageImageUrl(
  value?: string | null,
  opts?: { fallbackBucket?: string; expiresIn?: number },
) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return null;
  if (/^(data|blob):/i.test(url)) return url;

  if (!/^https?:\/\//i.test(url)) {
    const bucket = opts?.fallbackBucket || "wine-label-images";
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(url.replace(/^\/+/, ""), opts?.expiresIn ?? 60 * 60);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // fall through
    }
    return url;
  }

  const ref = extractStorageRef(url);
  if (!ref) return url;

  const bucket = ref.bucket || opts?.fallbackBucket || "wine-label-images";
  const expiresIn = opts?.expiresIn ?? 60 * 60;

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ref.path, expiresIn);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // fall through to original value
  }

  return url;
}
