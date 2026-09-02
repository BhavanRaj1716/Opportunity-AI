import { z } from 'zod';

// What the frontend sends when a student creates/edits their profile.
// raw_intro is the free-text description that gets sent to the LLM for extraction.
export const profileInputSchema = z.object({
  name: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  year: z.number().int().min(1).max(10).optional(),
  location: z.string().max(100).optional(),
  career_goal: z.string().max(200).optional(),
  raw_intro: z.string().max(3000).optional(),
  skills: z.array(z.object({
    name: z.string(),
    proficiency: z.number().min(0).max(100),
  })).optional(),
  interests: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(100),
  })).optional(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export type ExtractedProfile = {
  career_goal: string;
  skills: { name: string; proficiency: number }[];
  interests: { name: string; weight: number }[];
};
