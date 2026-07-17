import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRestaurantIdOrThrow } from "@/lib/auth/restaurant-id";
import { dailySpecialMenuSchema, hasMeaningfulContent, type DailySpecialMenu } from "./special-menu-schema";
import { getMenuTheme } from "./special-menu-themes";
import { renderSpecialMenuSvg } from "./render-special-menu-svg";
import { ProviderError } from "@/lib/providers/types";
import type { Menu } from "@/types/database";

const BUCKET = "site-media";

export interface RenderSpecialResult {
  imagePath: string;
  imageUrl: string;
  imagePathEs?: string;
  imageUrlEs?: string;
}

async function uploadSvg(supabase: SupabaseClient, restaurantId: string, svg: string, suffix: string): Promise<string> {
  const path = `${restaurantId}/daily-special/${randomUUID()}${suffix}.svg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([svg], { type: "image/svg+xml" }), { contentType: "image/svg+xml", upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Deterministic render + persist: takes the owner's (edited) structured menu
 * and chosen theme, renders SVG in app code (no AI), uploads it to the public
 * site-media bucket, and points the draft `menus` row at it. This is what the
 * "Save & Render" / publish path calls — the readable menu text is real SVG,
 * so prices and names are exactly what's in `special_data`, never generated
 * pixels (docs/08). Replaces any prior rendered artifact for the same menu.
 *
 * `menuEs` is optional (docs/08's Spanish translation design): when present,
 * a second SVG is rendered from the translated data with the *same* theme
 * and stored alongside the English one. When omitted (the owner hasn't
 * translated this draft, or this call is an English-only re-render), any
 * previously-saved Spanish render is left untouched — only an explicit
 * `menuEs` ever updates or clears the Spanish columns.
 */
export async function renderAndStoreSpecial(
  supabase: SupabaseClient,
  input: {
    menu_id: string;
    menu: DailySpecialMenu;
    themeId: string;
    menuEs?: DailySpecialMenu | null;
    /**
     * Storage paths of the social JPEGs the browser composed and uploaded for
     * this render (docs/10) — Facebook (natural ratio) and Instagram (4:5).
     * Optional: a browser that couldn't compose them, or a render predating
     * the feature, just leaves the columns alone; the crosspost hook skips
     * targets with no image rather than posting the SVG, which Meta rejects.
     */
    socialImagePath?: string | null;
    socialImageIgPath?: string | null;
  }
): Promise<RenderSpecialResult> {
  const restaurantId = await getRestaurantIdOrThrow(supabase);

  const parsed = dailySpecialMenuSchema.safeParse(input.menu);
  if (!parsed.success) {
    throw new ProviderError(`Menu data is invalid: ${parsed.error.message}`, "invalid_response");
  }
  const menu = parsed.data;
  if (!hasMeaningfulContent(menu)) {
    throw new ProviderError("There's no menu content to publish yet — add at least one item.", "invalid_response");
  }
  if (!menu.title.trim()) menu.title = "Daily Specials";

  // Standardized letterhead (2026-07-15, owner's call): name/address/phone
  // always come from the restaurant profile at render time — never from the
  // photo or from edits — identical on the English and Spanish artifacts.
  // Same overwrite happens at parse time (parse-special-menu-service.ts);
  // doing it here too covers drafts extracted before this rule existed.
  const { data: profile } = await supabase
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", restaurantId)
    .maybeSingle();

  const standardize = (m: DailySpecialMenu) => {
    if (!profile) return;
    m.restaurantName = profile.name;
    m.address = profile.address;
    m.phone = profile.phone;
  };
  standardize(menu);

  const theme = getMenuTheme(input.themeId);

  let menuEs: DailySpecialMenu | undefined;
  if (input.menuEs) {
    const parsedEs = dailySpecialMenuSchema.safeParse(input.menuEs);
    if (!parsedEs.success) {
      throw new ProviderError(`Spanish menu data is invalid: ${parsedEs.error.message}`, "invalid_response");
    }
    menuEs = parsedEs.data;
    if (!menuEs.title.trim()) menuEs.title = menu.title;
    standardize(menuEs);
  }

  const svg = renderSpecialMenuSvg(menu, theme, "en");
  const path = await uploadSvg(supabase, restaurantId, svg, "");

  let pathEs: string | undefined;
  if (menuEs) {
    pathEs = await uploadSvg(supabase, restaurantId, renderSpecialMenuSvg(menuEs, theme, "es"), "-es");
  }

  const { data: existing } = await supabase
    .from("menus")
    .select("generated_image_path, generated_image_path_es, social_image_path, social_image_ig_path")
    .eq("id", input.menu_id)
    .maybeSingle();
  const priorPath = (existing as Pick<Menu, "generated_image_path"> | null)?.generated_image_path;
  if (priorPath) await supabase.storage.from(BUCKET).remove([priorPath]);
  if (pathEs) {
    const priorPathEs = (existing as Pick<Menu, "generated_image_path_es"> | null)?.generated_image_path_es;
    if (priorPathEs) await supabase.storage.from(BUCKET).remove([priorPathEs]);
  }

  const update: Record<string, unknown> = { generated_image_path: path, special_data: { menu, themeId: theme.id } };
  if (pathEs) {
    update.generated_image_path_es = pathEs;
    update.special_data_es = menuEs;
  }
  // Social JPEGs: only touched when this render actually produced new ones —
  // an English-only re-render from a browser that composed them replaces them;
  // a render without them leaves whatever was there. Prior files are removed
  // so re-rendering doesn't orphan storage objects (the same discipline as
  // the SVGs above).
  if (input.socialImagePath) {
    const prior = (existing as Pick<Menu, "social_image_path"> | null)?.social_image_path;
    if (prior) await supabase.storage.from(BUCKET).remove([prior]);
    update.social_image_path = input.socialImagePath;
  }
  if (input.socialImageIgPath) {
    const priorIg = (existing as Pick<Menu, "social_image_ig_path"> | null)?.social_image_ig_path;
    if (priorIg) await supabase.storage.from(BUCKET).remove([priorIg]);
    update.social_image_ig_path = input.socialImageIgPath;
  }

  const { error: updateError } = await supabase.from("menus").update(update).eq("id", input.menu_id);
  if (updateError) throw updateError;

  const result: RenderSpecialResult = {
    imagePath: path,
    imageUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
  };
  if (pathEs) {
    result.imagePathEs = pathEs;
    result.imageUrlEs = supabase.storage.from(BUCKET).getPublicUrl(pathEs).data.publicUrl;
  }
  return result;
}
