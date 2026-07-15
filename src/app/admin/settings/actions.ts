"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateRestaurantProfile } from "@/lib/restaurant/service";
import { restaurantPatchSchema, type RestaurantPatchInput } from "@/lib/restaurant/schema";
import { revalidateMarketingSite } from "@/lib/site/revalidate";
import type { RestaurantHours } from "@/types/database";

export interface UpdateSettingsState {
  status: "idle" | "success" | "error";
  message?: string;
}

const DAYS: RestaurantHours["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function buildPatch(formData: FormData): RestaurantPatchInput {
  const hours: RestaurantHours[] = [];
  for (const day of DAYS) {
    const closed = formData.get(`hours[${day}][closed]`) === "on";
    const open = str(formData, `hours[${day}][open]`);
    const close = str(formData, `hours[${day}][close]`);
    if (!closed && open && close) {
      hours.push({ day, open, close });
    }
  }

  const social: Record<string, string> = {};
  for (const key of ["instagram", "facebook", "twitter", "tiktok"]) {
    const value = str(formData, `social[${key}]`);
    if (value) social[key] = value;
  }

  const colors: Record<string, string> = {};
  for (const key of ["primary", "secondary", "accent", "background", "text"]) {
    const value = str(formData, `brand[colors][${key}]`);
    if (value) colors[key] = value;
  }

  const fonts: Record<string, string> = {};
  for (const key of ["heading", "body"]) {
    const value = str(formData, `brand[fonts][${key}]`);
    if (value) fonts[key] = value;
  }

  const sectionOrderRaw = str(formData, "menu_defaults[sectionOrder]");
  const sectionOrder = sectionOrderRaw
    ? sectionOrderRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  return {
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    address: str(formData, "address") ?? null,
    phone: str(formData, "phone") ?? null,
    email: str(formData, "email") ?? null,
    hours,
    social,
    brand: { colors, fonts },
    menu_defaults: {
      currency: str(formData, "menu_defaults[currency]") ?? "USD",
      taxNote: str(formData, "menu_defaults[taxNote]"),
      disclaimer: str(formData, "menu_defaults[disclaimer]"),
      sectionOrder,
    },
  };
}

export async function updateSettings(
  _prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  const patch = buildPatch(formData);
  const parsed = restaurantPatchSchema.safeParse(patch);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const supabase = await createClient();
  try {
    await updateRestaurantProfile(supabase, parsed.data);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to save settings.",
    };
  }

  revalidatePath("/admin/settings");
  revalidateMarketingSite();
  return { status: "success", message: "Settings saved." };
}
