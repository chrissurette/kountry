import { z } from "zod";

const dayEnum = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM");

export const hoursSchema = z.array(
  z.object({
    day: dayEnum,
    open: timeString,
    close: timeString,
  })
);

export const socialSchema = z.record(z.string(), z.string()).default({});

export const brandColorsSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  })
  .partial();

export const brandFontsSchema = z
  .object({
    heading: z.string().optional(),
    body: z.string().optional(),
  })
  .partial();

export const brandSchema = z
  .object({
    logoAssetId: z.string().uuid().optional(),
    colors: brandColorsSchema.optional(),
    fonts: brandFontsSchema.optional(),
  })
  .partial();

export const menuDefaultsSchema = z.object({
  currency: z.string().length(3, "Use a 3-letter ISO currency code, e.g. USD"),
  taxNote: z.string().optional(),
  disclaimer: z.string().optional(),
  sectionOrder: z.array(z.string()).optional(),
});

/** Partial update payload for PATCH /api/restaurant — every field optional. */
export const restaurantPatchSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only")
      .optional(),
    name: z.string().min(1).optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    hours: hoursSchema.optional(),
    social: socialSchema.optional(),
    brand: brandSchema.optional(),
    menu_defaults: menuDefaultsSchema.optional(),
  })
  .strict();

export type RestaurantPatchInput = z.infer<typeof restaurantPatchSchema>;
