import { z } from "zod";

export const createCustomStyleSchema = z.object({
  name: z.string().min(1).max(60),
  prompt_fragment: z.string().min(1).max(2000),
});

export type CreateCustomStyleInput = z.infer<typeof createCustomStyleSchema>;
