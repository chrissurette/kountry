import { z } from "zod";

export const addCredentialSchema = z.object({
  provider: z.enum(["gemini", "openai", "xai"]),
  apiKey: z.string().min(8, "That doesn't look like a valid API key."),
});

export const taskConfigSchema = z.object({
  task: z.enum(["ocr_parse", "copywriting", "image_gen"]),
  provider: z.enum(["gemini", "openai", "xai"]),
  model: z.string().min(1),
});

export type AddCredentialInput = z.infer<typeof addCredentialSchema>;
export type TaskConfigInput = z.infer<typeof taskConfigSchema>;
