import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { scoreOpportunity, SkillRow, ActivityContext, OpportunityForScoring, ProfileForScoring } from '../lib/scoring.js';

const router = Router();

// How many candidates to pull from pgvector before re-ranking.
// Wider net than the final feed size, so the weighted formula has enough
// to work with rather than just re-sorting an already-narrow shortlist.
const CANDIDATE_POOL_SIZE = 50;
const FEED_SIZE = 20;

/**
 * GET /api/recommendations
 * Pure logic + DB reads only — no API calls. Retrieves candidates via
 * pgvector cosine similarity (match_opportunities RPC), then re-ranks them
 * using the weighted formula in scoring.ts.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // 1. Load the requesting student's profile + skills + interests
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, department, location, career_goal, profile_embedding,
        profile_skills ( skill_id, proficiency ),
        profile_interests ( weight, interests ( name ) )
      `)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profileRow) return res.status(404).json({ error: 'No profile found. Create one first.' });
    if (!profileRow.profile_embedding) {
      return res.status(400).json({ error: 'Profile has no embedding yet — this should not happen for a fully created profile.' });
    }

    const profile: ProfileForScoring = {
      department: profileRow.department,
      location: profileRow.location,
      career_goal: profileRow.career_goal,
      skills: profileRow.profile_skills.map((s: any) => ({ skill_id: s.skill_id, value: s.proficiency })),
      interests: profileRow.profile_interests.map((i: any) => ({ name: i.interests.name, weight: i.weight })),
    };

    // 2. pgvector candidate retrieval (the ONE semantic-similarity lookup)
    const { data: candidates, error: rpcError } = await supabase.rpc('match_opportunities', {
      query_embedding: profileRow.profile_embedding,
      match_count: CANDIDATE_POOL_SIZE,
    });
    if (rpcError) throw rpcError;
    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ recommendations: [] });
    }

    const candidateIds: string[] = candidates.map((c: any) => c.id);
    const similarityById = new Map<string, number>(candidates.map((c: any) => [c.id, c.similarity]));

    // 3. Full opportunity rows + their skills, for the candidate set only
    const { data: opportunityRows, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        id, title, description, type, location, is_online, registration_deadline,
        opportunity_skills ( skill_id, importance )
      `)
      .in('id', candidateIds);
    if (oppError) throw oppError;

    // Filter out expired deadlines before scoring — no point ranking something unregisterable.
    const today = new Date().toISOString().slice(0, 10);
    const activeOpportunities = (opportunityRows ?? []).filter(
      (o) => !o.registration_deadline || o.registration_deadline >= today
    );

    // 4. Career track skills for this profile's career_goal, if a matching track exists.
    // Case-insensitive match against career_tracks.name — if the LLM's extracted
    // career_goal doesn't line up with a track name, this comes back empty and
    // careerGoal scoring falls back to 0 for every opportunity (flagged, not hidden).
    let careerTrackSkills: SkillRow[] = [];
    if (profile.career_goal) {
      const { data: track } = await supabase
        .from('career_tracks')
        .select('id')
        .ilike('name', profile.career_goal)
        .maybeSingle();

      if (track) {
        const { data: trackSkills } = await supabase
          .from('career_track_skills')
          .select('skill_id, importance')
          .eq('track_id', track.id);
        careerTrackSkills = (trackSkills ?? []).map((s) => ({ skill_id: s.skill_id, value: s.importance }));
      }
    }

    // 5. This profile's activity history, for "previous activity" + "event-type preference"
    const { data: activityRows } = await supabase
      .from('user_activity')
      .select('opportunity_id, action, opportunities ( type )')
      .eq('profile_id', profileRow.id);

    const actionsByOpportunity = new Map<string, any>();
    const typeAffinityCounts = new Map<string, number>();
    let totalTypedActions = 0;

    for (const row of activityRows ?? []) {
      actionsByOpportunity.set(row.opportunity_id, row.action);
      const type = (row as any).opportunities?.type;
      if (type && (row.action === 'saved' || row.action === 'applied')) {
        typeAffinityCounts.set(type, (typeAffinityCounts.get(type) ?? 0) + 1);
        totalTypedActions += 1;
      }
    }

    // Drop anything the student already explicitly dismissed — don't recommend it again.
    const dismissedIds = new Set(
      (activityRows ?? []).filter((r) => r.action === 'dismissed').map((r) => r.opportunity_id)
    );

    const activity: ActivityContext = { actionsByOpportunity, typeAffinityCounts, totalTypedActions };

    // 6. Score every remaining candidate
    const scored = activeOpportunities
      .filter((o) => !dismissedIds.has(o.id))
      .map((o) => {
        const oppForScoring: OpportunityForScoring = {
          id: o.id,
          type: o.type,
          location: o.location,
          is_online: o.is_online,
          registration_deadline: o.registration_deadline,
          title: o.title,
          description: o.description,
          skills: o.opportunity_skills.map((s: any) => ({ skill_id: s.skill_id, value: s.importance })),
          semanticSimilarity: similarityById.get(o.id) ?? 0,
        };
        const breakdown = scoreOpportunity(profile, careerTrackSkills, oppForScoring, activity);
        return { opportunity: o, score: breakdown };
      })
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, FEED_SIZE);

    return res.status(200).json({ recommendations: scored });
  } catch (err) {
    console.error('Recommendation feed failed:', err);
    return res.status(500).json({ error: 'Failed to build recommendation feed' });
  }
});

export default router;
