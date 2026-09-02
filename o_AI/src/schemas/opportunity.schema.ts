import { z } from 'zod';

// Mirrors the public.opportunity_type enum in setup.sql — keep these in sync.
export const opportunityTypeSchema = z.enum([
  'hackathon',
  'workshop',
  'competition',
  'internship',
]);

export const opportunityInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: opportunityTypeSchema,
  location: z.string().max(100).optional(),
  is_online: z.boolean().default(false),
  start_date: z.string().date().optional(),        // 'YYYY-MM-DD'
  end_date: z.string().date().optional(),
  registration_deadline: z.string().date().optional(),
  organizer: z.string().max(200).optional(),
  url: z.string().url().optional(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        importance: z.number().int().min(0).max(100).default(70),
      })
    )
    .default([]),
});

export type OpportunityInput = z.infer<typeof opportunityInputSchema>;
