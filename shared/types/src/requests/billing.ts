import { z } from 'zod';

export const BillingOfferSchema = z.enum([
  'metered_monthly',
  'enterprise_quarterly',
]);
export type BillingOffer = z.infer<typeof BillingOfferSchema>;

export const CreateCheckoutSessionRequestSchema = z.object({
  organizationId: z.string().optional(),
  offer: BillingOfferSchema.default('metered_monthly'),
  seats: z.coerce.number().int().positive().max(10000).optional(),
});
export type CreateCheckoutSessionRequest = z.infer<
  typeof CreateCheckoutSessionRequestSchema
>;

export const CreatePortalSessionRequestSchema = z.object({
  organizationId: z.string().optional(),
});
export type CreatePortalSessionRequest = z.infer<
  typeof CreatePortalSessionRequestSchema
>;

export const GetBillingSummaryRequestSchema = z.object({
  organizationId: z.string().optional(),
});
export type GetBillingSummaryRequest = z.infer<
  typeof GetBillingSummaryRequestSchema
>;
