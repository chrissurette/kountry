import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset } from "@/types/database";

const BUCKET = "assets";

/** Shared by the single-provider parse flow and comparison mode — downloads and hashes an uploaded photo once. */
export async function downloadAssetBytes(
  supabase: SupabaseClient,
  assetId: string
): Promise<{ bytes: Uint8Array; mimeType: string; asset: Asset }> {
  const { data: asset, error: assetError } = await supabase.from("assets").select("*").eq("id", assetId).single();
  if (assetError) throw assetError;
  const typedAsset = asset as Asset;

  const { data: fileBlob, error: downloadError } = await supabase.storage.from(BUCKET).download(typedAsset.storage_path);
  if (downloadError) throw downloadError;
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());

  const contentHash = createHash("sha256").update(bytes).digest("hex");
  if (typedAsset.content_hash !== contentHash) {
    await supabase.from("assets").update({ content_hash: contentHash }).eq("id", assetId);
  }

  return { bytes, mimeType: typedAsset.mime ?? "image/jpeg", asset: typedAsset };
}
