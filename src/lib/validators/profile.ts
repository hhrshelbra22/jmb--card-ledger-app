import { z } from "zod";

// Extend this schema with the new personal info fields
export const UpdateProfileSchema = z.object({
  // ── Existing fields (keep as-is) ──
  role: z.enum(["free", "pro", "dealer", "admin"]).optional(),
  stripe_customer_id: z.string().nullable().optional(),
  stripe_subscription_id: z.string().nullable().optional(),
  subscription_status: z.enum(["active", "canceled", "past_due"]).nullable().optional(),
  current_period_end: z.string().nullable().optional(),

  // ── New personal info fields ──
  full_name: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address_line1: z.string().max(200).nullable().optional(),
  address_line2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
});

export type UpdateProfilePayload = z.infer<typeof UpdateProfileSchema>;