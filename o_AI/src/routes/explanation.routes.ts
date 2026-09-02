import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { generateExplanation } from '../lib/openai.js';

const router = Router();

/**
 * GET /api/explanations/:opportunityId
 * Returns cached "why this?" bullets if they exist and are newer than the
 * profile's last edit. Only calls the LLM on a cache miss or when the
 * profile has changed since the cached explanation was generated — this is
 * the ONE place in the whole backend where caching directly saves API cost,
 * per your context doc ("cached and only regenerated when the profile changes").
 */
router.get('/:opportunityId', requireAuth, async (req: Request, res: Response) => {
  const { opportunityId } = req.params;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, career_goal, updated_at,
        profile_skills ( proficiency, skills ( name ) ),
        profile_interests ( weight, interests ( name ) )
      `)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return res.status(404).json({ error: 'No profile found. Create one first.' });

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, title, description, type')
      .eq('id', opportunityId)
      .maybeSingle();

    if (oppError) throw oppError;
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });

    // 1. Check the cache first.
    const { data: cached, error: cacheError } = await supabase
      .from('match_explanations')
      .select('bullets, updated_at')
      .eq('profile_id', profile.id)
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    if (cacheError) throw cacheError;

    // Cache is valid only if it exists AND was written after the profile's
    // last edit — otherwise the bullets could reference stale skills/goals.
    if (cached && cached.updated_at >= profile.updated_at) {
      return res.status(200).json({ bullets: cached.bullets, cached: true });
    }

    // 2. Cache miss or stale — build summaries and call the LLM (the 1 API call this route makes).
    const skillsList = profile.profile_skills.map((s: any) => `${s.skills.name} (${s.proficiency}/100)`).join(', ');
    const interestsList = profile.profile_interests.map((i: any) => i.interests.name).join(', ');
    const profileSummary = `Career goal: ${profile.career_goal ?? 'unspecified'}\nSkills: ${skillsList || 'none listed'}\nInterests: ${interestsList || 'none listed'}`;
    const opportunitySummary = `${opportunity.title} (${opportunity.type})\n${opportunity.description ?? ''}`;

    const bullets = generateExplanation(profileSummary, opportunitySummary);

    // 3. Upsert into the cache (unique on profile_id + opportunity_id per setup.sql).
    const { error: upsertError } = await supabase
      .from('match_explanations')
      .upsert(
        { profile_id: profile.id, opportunity_id: opportunityId, bullets },
        { onConflict: 'profile_id,opportunity_id' }
      );
    if (upsertError) throw upsertError;

    return res.status(200).json({ bullets, cached: false });
  } catch (err) {
    console.error('Explanation generation failed:', err);
    return res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

export default router;
