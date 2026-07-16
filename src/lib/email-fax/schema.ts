import { z } from "zod";

/**
 * The /email-fax-list form — a native replication of the owner's Microsoft
 * Form ("Fax and Email Preference For Daily Special"), whose six questions
 * map 1:1 onto these fields. The MS original marked nothing required; here
 * name + method are required and each named channel requires its contact —
 * an entry with no way to reach the sender is just noise in the owner's list.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DELIVERY_METHODS = ["fax", "email", "both"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

const emailField = z.string().trim().toLowerCase().email().max(320);
// Same shape as the subscribe form's phone rule — fax numbers are dialed
// phone numbers.
const faxField = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9()\-.\s]+$/, "Enter a valid fax number.");

export const emailFaxRequestSchema = z
  .object({
    businessName: z.string().trim().min(1).max(200),
    method: z.enum(DELIVERY_METHODS),
    fax: faxField.optional().nullable(),
    email: emailField.optional().nullable(),
    days: z.array(z.enum(DAY_KEYS)).max(7).default([]),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((d) => d.method === "email" || !!d.fax, {
    message: "Enter a fax number.",
    path: ["fax"],
  })
  .refine((d) => d.method === "fax" || !!d.email, {
    message: "Enter an email address.",
    path: ["email"],
  });
export type EmailFaxRequestInput = z.infer<typeof emailFaxRequestSchema>;

export const deleteEmailFaxRequestsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
