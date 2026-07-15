import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { resolveTask } from "@/lib/providers/registry";
import { recordUsage } from "@/lib/providers/usage";
import { ProviderError } from "@/lib/providers/types";
import { downloadAssetBytes } from "./asset-bytes";
import { getImageStylePreset, DEFAULT_IMAGE_STYLE_KEY } from "./image-styles";
import type { Menu } from "@/types/database";

export type StyleSource =
  | { type: "preset"; key: string }
  | { type: "custom"; id: string }
  | { type: "prompt"; text: string };

interface ResolvedStyle {
  promptFragment: string;
  label: string;
  styleKey?: string;
}

async function resolveStyleSource(supabase: SupabaseClient, restaurantId: string, source: StyleSource): Promise<ResolvedStyle> {
  if (source.type === "preset") {
    const preset = getImageStylePreset(source.key);
    return { promptFragment: preset.promptFragment, label: preset.label, styleKey: preset.key };
  }
  if (source.type === "custom") {
    const { data, error } = await supabase
      .from("custom_image_styles")
      .select("name, prompt_fragment")
      .eq("id", source.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ProviderError("Saved style not found.", "invalid_response");
    return { promptFragment: data.prompt_fragment, label: data.name };
  }
  return { promptFragment: source.text, label: "Custom prompt" };
}

const BUCKET = "site-media";

const BASE_PROMPT =
  "You are redrawing a photo of a handwritten restaurant menu into a clean, polished, print-ready menu graphic. " +
  "This photo has many separate pieces of text — every section, every line item, every price, AND any smaller " +
  "call-out boxes, side-dish lists, or secondary sections — treat all of them as equally important, not just the " +
  "largest or most prominent text. Preserve every section name, item name, description, and price EXACTLY as " +
  "written in the photo, character for character and digit for digit — do not invent, omit, merge, reword, or " +
  "change any menu content or prices, including in dense or small-print areas. Do not drop any line item. Render " +
  "all text in a single, plain, highly legible typeface — legibility and word-for-word accuracy of every price and " +
  "name is more important than decorative lettering. Only the background, colors, borders, and overall visual " +
  "style should change, never the words or numbers. Style: ";

export interface GenerateSpecialImageResult {
  menuId: string;
  imagePath: string;
  imageUrl: string;
  promptFragment: string;
  styleLabel: string;
}

async function deletePriorImage(supabase: SupabaseClient, path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Photo → AI-generated styled menu image — the Daily Specials pipeline as
 * of 2026-07-15 (replaced OCR-to-structured-text; docs/05, docs/03's "Main
 * Menu vs. Daily Specials" note). Regenerating (passing the same menu_id
 * with a different style) replaces the previous image rather than
 * accumulating orphaned files — same "replace" pattern as the hero photo in
 * src/lib/site-media/service.ts. Stored in the public `site-media` bucket
 * (not the private `assets` bucket menu photos use) since anonymous site
 * visitors need to view it with no signed-URL churn.
 */
export async function generateSpecialImage(
  supabase: SupabaseClient,
  input: { asset_id: string; styleSource?: StyleSource; menu_id?: string }
): Promise<GenerateSpecialImageResult> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { bytes, mimeType } = await downloadAssetBytes(supabase, input.asset_id);
  const styleSource: StyleSource = input.styleSource ?? { type: "preset", key: DEFAULT_IMAGE_STYLE_KEY };
  const style = await resolveStyleSource(supabase, restaurantId, styleSource);

  const { adapter, model } = await resolveTask(restaurantId, "image_gen");
  if (!adapter.imageGen) {
    throw new ProviderError(`${adapter.id} doesn't support image generation.`, "transient");
  }

  const { image, usage } = await adapter.imageGen.generate({
    model,
    prompt: `${BASE_PROMPT}${style.promptFragment}.`,
    inputImages: [{ bytes, mimeType }],
    // "auto" lets the model choose an output canvas that fits the source
    // photo's own proportions — a forced square output for a portrait
    // source photo left the model laying out content for a taller canvas
    // than it actually got, cropping the bottom (docs/08).
    size: "auto",
  });

  await recordUsage(restaurantId, adapter.id, model, "image_gen", usage);

  const path = `${restaurantId}/daily-special/${randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, image.bytes, { contentType: image.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const parseMeta = {
    provider: adapter.id,
    model,
    style_key: style.styleKey,
    prompt_fragment: style.promptFragment,
    style_label: style.label,
  };
  let menuId = input.menu_id;

  if (menuId) {
    const { data: existing } = await supabase
      .from("menus")
      .select("generated_image_path")
      .eq("id", menuId)
      .maybeSingle();
    await deletePriorImage(supabase, (existing as Pick<Menu, "generated_image_path"> | null)?.generated_image_path);

    const { error: updateError } = await supabase
      .from("menus")
      .update({ generated_image_path: path, source_asset_id: input.asset_id, parse_meta: parseMeta })
      .eq("id", menuId);
    if (updateError) throw updateError;
  } else {
    const { data: created, error: createError } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurantId,
        source_asset_id: input.asset_id,
        status: "draft",
        generated_image_path: path,
        parse_meta: parseMeta,
      })
      .select("id")
      .single();
    if (createError) throw createError;
    menuId = created.id as string;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    menuId,
    imagePath: path,
    imageUrl: urlData.publicUrl,
    promptFragment: style.promptFragment,
    styleLabel: style.label,
  };
}
