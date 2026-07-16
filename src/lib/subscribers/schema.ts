import { z } from "zod";

const emailField = z.string().trim().toLowerCase().email().max(320);
const phoneField = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9()\-.\s]+$/, "Enter a valid phone number.");

const atLeastOne = (data: { email?: string | null; phone?: string | null }) => !!data.email || !!data.phone;

export const subscribeSchema = z
  .object({
    email: emailField.optional().nullable(),
    phone: phoneField.optional().nullable(),
  })
  .refine(atLeastOne, { message: "Enter an email or phone number.", path: ["email"] });
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const createSubscriberSchema = z
  .object({
    email: emailField.optional().nullable(),
    phone: phoneField.optional().nullable(),
  })
  .refine(atLeastOne, { message: "Enter an email or phone number.", path: ["email"] });
export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;

export const deleteSubscribersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type DeleteSubscribersInput = z.infer<typeof deleteSubscribersSchema>;
