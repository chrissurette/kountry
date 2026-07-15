import { z } from "zod";

export const createSiteMediaSchema = z.object({
  kind: z.enum(["hero", "gallery"]),
  ext: z.enum(["jpg", "jpeg", "png", "webp"]),
});

export type CreateSiteMediaInput = z.infer<typeof createSiteMediaSchema>;

export const updateSiteMediaSchema = z.object({
  caption: z.string().max(200).nullable(),
});

export type UpdateSiteMediaInput = z.infer<typeof updateSiteMediaSchema>;
