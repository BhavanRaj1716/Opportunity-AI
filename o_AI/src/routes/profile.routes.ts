import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { profileInputSchema } from '../schemas/profile.schema.js';
import { extractProfile, generateEmbedding } from '../lib/openai.js';
import { syncProfileSkills, syncProfileInterests } from '../lib/db-helpers.js';

const router = Router();

/**
 * POST /api/profile
 * Creates a new profile for the logged-in user.
 * This is one of the 3 places that call a paid API (extraction + embedding = 2 calls).
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const input = parsed.data;

  // A user should only have one profile — check first to avoid duplicates.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (existingProfile) {
    return res.status(409).json({ error: 'Profile already exists. Use PUT /api/profile to edit it.' });
  }

  try {
    const extracted = await extractProfile(input.raw_intro ?? `${input.name} ${input.career_goal ?? ''}`);
    const embedding = await generateEmbedding(input.raw_intro ?? `${input.name} ${input.career_goal ?? ''}`);

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: req.userId,
        name: input.name,
        department: input.department,
        year: input.year,
        location: input.location,
        career_goal: input.career_goal ?? extracted.career_goal,
        raw_intro: input.raw_intro,
        profile_embedding: JSON.stringify(embedding),
      })
      .select('*')
      .single();

    if (error) throw error;

    const skills = input.skills?.length ? input.skills : extracted.skills;
    const interests = input.interests?.length ? input.interests : extracted.interests;
    await syncProfileSkills(profile.id, skills);
    await syncProfileInterests(profile.id, interests);

    return res.status(201).json({ profile, skills, interests });
  } catch (err: any) {
    console.error('Profile creation failed:', err);
    return res.status(500).json({ error: 'Failed to create profile', detail: err?.message ?? String(err) });
  }
});

/**
 * PUT /api/profile
 * Edits the logged-in user's existing profile. Same 2-API-call pipeline as
 * create, since a changed raw_intro means the extraction and embedding are
 * both stale and need regenerating. This is also the trigger that should
 * invalidate any cached match_explanations for this profile (handled in the
 * explanation route by comparing updated_at — not duplicated here).
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const input = parsed.data;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (!existingProfile) {
    return res.status(404).json({ error: 'No profile found. Use POST /api/profile to create one.' });
  }

  try {
    const extracted = await extractProfile(input.raw_intro ?? `${input.name} ${input.career_goal ?? ''}`);
    const embedding = await generateEmbedding(input.raw_intro ?? `${input.name} ${input.career_goal ?? ''}`);

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        name: input.name,
        department: input.department,
        year: input.year,
        location: input.location,
        career_goal: input.career_goal ?? extracted.career_goal,
        raw_intro: input.raw_intro,
        profile_embedding: JSON.stringify(embedding),
      })
      .eq('id', existingProfile.id)
      .select('*')
      .single();

    if (error) throw error;

    const skills = input.skills?.length ? input.skills : extracted.skills;
    const interests = input.interests?.length ? input.interests : extracted.interests;
    await syncProfileSkills(profile.id, skills);
    await syncProfileInterests(profile.id, interests);

    return res.status(200).json({ profile, skills, interests });
  } catch (err: any) {
    console.error('Profile update failed:', err);
    return res.status(500).json({ error: 'Failed to update profile', detail: err?.message ?? String(err) });
  }
});

/**
 * GET /api/profile
 * Fetches the logged-in user's own profile + skills + interests.
 * No API calls — pure DB read.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      profile_skills ( proficiency, skills ( id, name, category ) ),
      profile_interests ( weight, interests ( id, name ) )
    `)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to fetch profile' });
  if (!profile) return res.status(404).json({ error: 'No profile found' });

  return res.status(200).json({ profile });
});

export default router;
