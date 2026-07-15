import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { resolveTask } from "@/lib/providers/registry";
import { recordUsage } from "@/lib/providers/usage";
import { ProviderError } from "@/lib/providers/types";
import { downloadAssetBytes } from "./asset-bytes";
import {
  dailySpecialMenuSchema,
  SPECIAL_MENU_JSON_SCHEMA,
  SPECIAL_MENU_EXTRACTION_PROMPT,
  type DailySpecialMenu,
} from "./special-menu-schema";
import { DEFAULT_MENU_THEME_ID } from "./special-menu-themes";

export interface ParseSpecialResult {
  menuId: string;
  menu: DailySpecialMenu;
  themeId: string;
}

/**
 * Vision extraction step of the Daily Specials pipeline (2026-07-16 refactor,
 * docs/08): send the uploaded photo to a vision model, get back structured,
 * owner-editable menu data — NOT a rendered image. The app renders the final
 * menu deterministically from this data (render-special-menu-svg.ts), so
 * readable text is never AI-painted. Creates (or updates, when re-extracting)
 * a draft `menus` row holding the parsed data in `special_data`.
 */
export async function parseSpecialMenu(
  supabase: SupabaseClient,
  input: { asset_id: string; menu_id?: string }
): Promise<ParseSpecialResult> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);
  const { bytes, mimeType } = await downloadAssetBytes(supabase, input.asset_id);

  const { adapter, model } = await resolveTask(restaurantId, "ocr_parse");
  if (!adapter.vision?.extractJson) {
    throw new ProviderError(`${adapter.id} doesn't support structured menu extraction.`, "transient");
  }

  const { data, usage } = await adapter.vision.extractJson(
    { bytes, mimeType },
    { model, prompt: SPECIAL_MENU_EXTRACTION_PROMPT, jsonSchema: SPECIAL_MENU_JSON_SCHEMA }
  );

  await recordUsage(restaurantId, adapter.id, model, "ocr_parse", usage);

  const parsed = dailySpecialMenuSchema.safeParse(data);
  if (!parsed.success) {
    throw new ProviderError(`Extracted menu didn't match the expected shape: ${parsed.error.message}`, "invalid_response");
  }
  const menu = parsed.data;
  if (!menu.title.trim()) menu.title = "Daily Specials";

  // Standardized letterhead (2026-07-15, owner's call): the photo's printed
  // name/address/phone block is never used — the extraction prompt returns
  // null for those fields, and they're filled from the restaurant profile
  // here so every rendered special (English and Spanish alike) carries the
  // same correct contact block. Render enforces this again (belt+suspenders,
  // covers pre-existing drafts too) in render-special-service.ts.
  const { data: profile } = await supabase
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", restaurantId)
    .maybeSingle();
  if (profile) {
    menu.restaurantName = profile.name;
    menu.address = profile.address;
    menu.phone = profile.phone;
  }

  // Preserve the previously-chosen theme when re-extracting; default otherwise.
  let themeId = DEFAULT_MENU_THEME_ID;
  let menuId = input.menu_id;

  if (menuId) {
    const { data: existing } = await supabase.from("menus").select("special_data").eq("id", menuId).maybeSingle();
    const priorTheme = (existing?.special_data as { themeId?: string } | null)?.themeId;
    if (priorTheme) themeId = priorTheme;

    const { error } = await supabase
      .from("menus")
      .update({ source_asset_id: input.asset_id, special_data: { menu, themeId } })
      .eq("id", menuId);
    if (error) throw error;
  } else {
    const { data: created, error } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurantId,
        source_asset_id: input.asset_id,
        status: "draft",
        special_data: { menu, themeId },
      })
      .select("id")
      .single();
    if (error) throw error;
    menuId = created.id as string;
  }

  return { menuId, menu, themeId };
}
