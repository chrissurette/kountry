import { z } from "zod";

export const createUploadSchema = z.object({
  kind: z.enum(["menu_photo", "logo", "style_ref", "export"]),
  ext: z.enum(["jpg", "jpeg", "png", "webp"]),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
