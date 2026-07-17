/**
 * Hand-written types mirroring supabase/migrations/*.sql (docs/03-data-model.md).
 * Once a live Supabase project exists, regenerate with:
 *   supabase gen types typescript --project-id <id> > src/types/database.generated.ts
 * and reconcile — this file exists so app code has types before that project exists.
 */

export type ProviderId = "gemini" | "openai" | "xai";
export type ProviderTask = "ocr_parse" | "copywriting" | "image_gen" | "translate_menu";
export type MenuStatus = "draft" | "scheduled" | "published" | "archived";
export type AssetKind = "menu_photo" | "logo" | "style_ref" | "export";
export type ScheduleStatus = "pending" | "done" | "canceled";
export type CredentialStatus = "active" | "invalid";

export interface RestaurantHours {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string; // "HH:MM", 24h
  close: string;
}

export interface RestaurantSocial {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

export interface BrandConfig {
  logoAssetId?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
}

export interface MenuDefaults {
  currency: string; // ISO 4217, e.g. "USD"
  taxNote?: string;
  disclaimer?: string;
  sectionOrder?: string[];
  /** IANA timezone (e.g. "America/New_York") used to decide when "midnight" is for auto-clearing the daily special. Defaults to America/New_York. */
  timezone?: string;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hours: RestaurantHours[];
  social: RestaurantSocial;
  brand: BrandConfig;
  menu_defaults: MenuDefaults;
  live_snapshot_id: string | null;
  /** When the current live special was flipped live — used to auto-clear it at the next local midnight (see cron promote-schedules). Null when nothing is live. */
  live_since: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "owner" | "employee";

export interface RestaurantMember {
  user_id: string;
  restaurant_id: string;
  /** "owner" = full admin; "employee" = Daily Special generator only (gated in src/lib/supabase/middleware.ts). */
  role: MemberRole;
  /** Optional alternate login identifier — sign in with this or the account email. Stored lowercased, globally unique (see the member_username migration). */
  username: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  restaurant_id: string;
  kind: AssetKind;
  storage_path: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  content_hash: string | null;
  created_at: string;
}

export interface Theme {
  id: string;
  key: string;
  name: string;
  preview_image_path: string | null;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  title: string | null;
  service_date: string | null; // date, ISO
  status: MenuStatus;
  source_asset_id: string | null;
  parse_meta: {
    provider?: ProviderId;
    model?: string;
    confidence?: number;
    raw_response_ref?: string;
    style_key?: string;
    /** The actual prompt fragment used for this generation, regardless of whether it came from a built-in preset, a saved custom style, or an ad-hoc custom prompt — what "Save this style" on the Review screen persists. */
    prompt_fragment?: string;
    /** Display label for the style actually used (preset label, saved style name, or "Custom prompt"). */
    style_label?: string;
  };
  theme_id: string | null;
  style_overrides: Partial<BrandConfig>;
  /** Storage path (site-media bucket) of the rendered Daily Special artifact — an `.svg` from the deterministic renderer since the 2026-07-16 refactor, or a legacy gpt-image-1 `.png` on older drafts. Null until first render. */
  generated_image_path: string | null;
  /** Structured, owner-editable Daily Special data + chosen theme (2026-07-16 refactor). Null on legacy image-gen drafts. `menu` shape is `DailySpecialMenu` (src/lib/menu/special-menu-schema.ts); kept as a loose record here to avoid a type import cycle. */
  special_data: { menu: unknown; themeId: string } | null;
  /** Owner-reviewed Spanish translation of special_data.menu (2026-07-15, docs/08) — a plain `DailySpecialMenu`, no themeId wrapper since the theme is shared with the English render. Null until translated. */
  special_data_es: unknown | null;
  /** Storage path (site-media bucket) of the Spanish-rendered `.svg`, same renderer/theme as generated_image_path fed different (translated) text. Null until the owner translates and saves. */
  generated_image_path_es: string | null;
  /** Storage path of the natural-ratio JPEG for Facebook crossposting (2026-07-16, docs/10) — composed in the browser at render time, since Meta can't consume our SVG. Null on renders predating the feature. */
  social_image_path: string | null;
  /** Storage path of the 4:5 (1080x1350) padded JPEG for Instagram, whose API rejects anything outside a 4:5–1.91:1 ratio (docs/10). */
  social_image_ig_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuSection {
  id: string;
  menu_id: string;
  name: string;
  sort_order: number;
}

/** A user-saved named image-gen prompt, alongside the hardcoded IMAGE_STYLE_PRESETS (src/lib/menu/image-styles.ts). */
export interface CustomImageStyle {
  id: string;
  restaurant_id: string;
  name: string;
  prompt_fragment: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  section_id: string | null;
  name: string;
  description: string | null;
  price_cents: number | null;
  price_note: string | null;
  sort_order: number;
  confidence: number | null;
  library_item_id: string | null;
}

export type SiteMediaKind = "hero" | "gallery";

export interface SiteMedia {
  id: string;
  restaurant_id: string;
  kind: SiteMediaKind;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export type SubscriberSource = "homepage" | "manual";

export interface Subscriber {
  id: string;
  restaurant_id: string;
  email: string | null;
  phone: string | null;
  source: SubscriberSource;
  /** The capability in an unsubscribe link — 32 random bytes as hex, unique per row. Never expose this in any admin/public response body; it belongs only in the link itself and the CSV export the owner mails from. */
  unsubscribe_token: string;
  /** Null = subscribed. Set = suppressed: kept as a record of the opt-out (so a later re-add can't silently re-subscribe them) but excluded from the email export. */
  unsubscribed_at: string | null;
  created_at: string;
}

export type MainMenuCategory = "breakfast" | "lunch_dinner" | "beverages";

export interface MainMenuSection {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  name_es: string | null;
  description_es: string | null;
  category: MainMenuCategory;
  sort_order: number;
}

export interface MainMenuItem {
  id: string;
  restaurant_id: string;
  section_id: string;
  name: string;
  description: string | null;
  name_es: string | null;
  description_es: string | null;
  price_cents: number | null;
  price_note: string | null;
  image_path: string | null;
  sort_order: number;
}

export interface ItemLibraryEntry {
  id: string;
  restaurant_id: string;
  canonical_name: string;
  aliases: string[];
  last_price_cents: number | null;
  price_history: Array<{ price_cents: number; seen_at: string }>;
  default_description: string | null;
  section_hint: string | null;
  times_seen: number;
  last_seen_at: string | null;
}

export interface PublishedSnapshot {
  id: string;
  restaurant_id: string;
  menu_id: string | null;
  payload: MenuSnapshotPayload;
  theme_id: string | null;
  published_at: string;
  published_by: string | null;
}

/** The fully-resolved, self-contained document written into published_snapshots.payload. */
export interface MenuSnapshotPayload {
  restaurant: Pick<
    Restaurant,
    "slug" | "name" | "address" | "phone" | "email" | "hours" | "social" | "brand" | "menu_defaults"
  >;
  menu: {
    title: string | null;
    service_date: string | null;
    sections: Array<{
      name: string;
      items: Array<Pick<MenuItem, "name" | "description" | "price_cents" | "price_note">>;
    }>;
    /** Public URL of the AI-generated Daily Special image, when this snapshot is image-based (the default going forward — see docs/05). Every renderer should prefer this over `sections` when present. */
    imageUrl?: string | null;
    /** Public URL of the Spanish-rendered Daily Special image (2026-07-15, docs/08), when the owner translated and rendered one. Consumers should fall back to `imageUrl` when this is null/absent. */
    imageUrlEs?: string | null;
    /** Natural-ratio JPEG for Facebook crossposting (2026-07-16, docs/10). Frozen into the snapshot so a *scheduled* publish posts exactly what was approved, not a re-render at fire time. Null on menus rendered before this feature — the hook skips rather than posts the SVG, which Meta rejects. */
    socialImageUrl?: string | null;
    /** 4:5 (1080x1350) padded JPEG for Instagram, whose API accepts JPEG only within a 4:5–1.91:1 ratio — our natural board is often taller (docs/10). */
    socialImageIgUrl?: string | null;
  };
  theme: {
    key: string;
    config: Record<string, unknown>;
  };
  styleOverrides: Partial<BrandConfig>;
}

export interface PublishSchedule {
  id: string;
  restaurant_id: string;
  snapshot_id: string;
  fire_at: string;
  status: ScheduleStatus;
  fired_at: string | null;
  created_at: string;
}

export interface ProviderCredential {
  id: string;
  restaurant_id: string;
  provider: ProviderId;
  // encrypted_key is intentionally omitted from this type: it must never be
  // read into an API response body. Server code that truly needs the
  // ciphertext queries the column explicitly and keeps it out of shared types.
  key_last4: string | null;
  status: CredentialStatus;
  created_at: string;
}

export interface ProviderTaskConfig {
  restaurant_id: string;
  task: ProviderTask;
  provider: ProviderId;
  model: string;
}

export interface ProviderUsage {
  id: string;
  restaurant_id: string;
  provider: ProviderId;
  model: string;
  task: ProviderTask;
  input_tokens: number;
  output_tokens: number;
  image_count: number;
  est_cost_usd: number;
  created_at: string;
}
