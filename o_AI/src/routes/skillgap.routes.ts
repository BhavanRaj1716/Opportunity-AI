import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = Router();

/**
 * GET /api/skill-gap
 * Compares the student's current skill proficiency against the skills
 * needed for their career_goal (via career_tracks / career_track_skills).
 * Pure DB reads + comparison logic — no API calls, matches your context doc.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, career_goal,
        profile_skills ( skill_id, proficiency, skills ( name ) )
      `)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return res.status(404).json({ error: 'No profile found. Create one first.' });
    if (!profile.career_goal) {
      return res.status(400).json({ error: 'Profile has no career_goal set yet.' });
    }

    // Find the career track matching this profile's goal (case-insensitive).
    const { data: track } = await supabase
      .from('career_tracks')
      .select('id, name, description')
      .ilike('name', profile.career_goal)
      .maybeSingle();

    if (!track) {
      // Flagged rather than guessed: the LLM's free-text career_goal didn't
      // match any row in career_tracks.name. Nothing to compare against.
      return res.status(200).json({
        career_goal: profile.career_goal,
        matched_track: null,
        gaps: [],
        message: 'No matching career track found for this career goal. Skill-gap comparison needs a career_tracks row with a matching name.',
      });
    }

    const { data: trackSkills, error: trackSkillsError } = await supabase
      .from('career_track_skills')
      .select('skill_id, importance, skills ( name )')
      .eq('track_id', track.id);

    if (trackSkillsError) throw trackSkillsError;

    const proficiencyBySkillId = new Map<string, number>(
      profile.profile_skills.map((s: any) => [s.skill_id, s.proficiency])
    );

    const gaps = (trackSkills ?? [])
      .map((needed: any) => {
        const currentProficiency = proficiencyBySkillId.get(needed.skill_id) ?? 0;
        return {
          skill_id: needed.skill_id,
          skill_name: needed.skills.name,
          importance: needed.importance,      // how much this track needs it (0-100)
          current_proficiency: currentProficiency, // student's actual level (0-100)
          gap: Math.max(0, needed.importance - currentProficiency), // positive = needs work
        };
      })
      .sort((a, b) => b.gap - a.gap); // biggest gaps first

    return res.status(200).json({
      career_goal: profile.career_goal,
      matched_track: { id: track.id, name: track.name, description: track.description },
      gaps,
    });
  } catch (err) {
    console.error('Skill-gap lookup failed:', err);
    return res.status(500).json({ error: 'Failed to compute skill gap' });
  }
});

export default router;
