import { z } from "zod";

const mainMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  name_es: z.string().nullable().optional(),
  description_es: z.string().nullable().optional(),
  price_cents: z.number().int().nullable().optional(),
  price_note: z.string().nullable().optional(),
  image_path: z.string().nullable().optional(),
});

const mainMenuSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  name_es: z.string().nullable().optional(),
  description_es: z.string().nullable().optional(),
  category: z.enum(["breakfast", "lunch_dinner", "beverages"]),
  items: z.array(mainMenuItemSchema).default([]),
});

export const mainMenuPatchSchema = z.object({
  sections: z.array(mainMenuSectionSchema),
});

export type MainMenuPatchInput = z.infer<typeof mainMenuPatchSchema>;

export const menuItemImageUploadSchema = z.object({
  ext: z.enum(["jpg", "jpeg", "png", "webp"]),
});

export type MenuItemImageUploadInput = z.infer<typeof menuItemImageUploadSchema>;
