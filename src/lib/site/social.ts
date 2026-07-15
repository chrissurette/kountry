import type { RestaurantSocial } from "@/types/database";

export type SocialKey = "instagram" | "facebook" | "twitter" | "tiktok";

const PLATFORMS: { key: SocialKey; label: string; base: string }[] = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
  { key: "twitter", label: "X", base: "https://x.com/" },
  { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@" },
];

export interface SocialLink {
  key: SocialKey;
  label: string;
  url: string;
}

/**
 * Normalizes the profile's social map into ready-to-render links. A value may
 * be a full URL or a bare handle (with or without a leading @) — both resolve
 * to a usable link.
 */
export function socialLinks(social: RestaurantSocial | null | undefined): SocialLink[] {
  if (!social) return [];
  const out: SocialLink[] = [];
  for (const p of PLATFORMS) {
    const raw = social[p.key];
    if (!raw || !raw.trim()) continue;
    const value = raw.trim();
    const url = /^https?:\/\//i.test(value) ? value : p.base + value.replace(/^@/, "");
    out.push({ key: p.key, label: p.label, url });
  }
  return out;
}

/** Google Maps directions/search link for an address string. */
export function directionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
