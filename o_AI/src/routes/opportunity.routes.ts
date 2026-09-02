import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { opportunityInputSchema } from '../schemas/opportunity.schema.js';
import { generateEmbedding } from '../lib/openai.js';
import { findOrCreateSkill } from '../lib/db-helpers.js';

const router = Router();

/**
 * POST /api/opportunities
 * Adds a new opportunity. This is the 3rd of the 3 places that call a paid
 * API (1 embedding call — no LLM extraction needed here, since whoever adds
 * an opportunity — likely an admin — enters structured fields directly
 * instead of free text).
 *
 * NOTE: no role check yet — right now any authenticated user can add an
 * opportunity. If you want this admin-only, add a check here using
 * supabase.rpc('has_role', { _user_id: req.userId, _role: 'admin' })
 * before proceeding. Flagging it rather than assuming, since your schema
 * clearly sets up user_roles/has_role for exactly this purpose.
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = opportunityInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const input = parsed.data;

  try {
    // Embed title + description together for a richer semantic vector
    // than title alone — matches how a student's raw_intro is embedded as
    // one block of meaningful text.
    const embeddingInput = [input.title, input.description].filter(Boolean).join('\n\n');
    const embedding = await generateEmbedding(embeddingInput);

    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .insert({
        title: input.title,
        description: input.description,
        type: input.type,
        location: input.location,
        is_online: input.is_online,
        start_date: input.start_date,
        end_date: input.end_date,
        registration_deadline: input.registration_deadline,
        organizer: input.organizer,
        url: input.url,
        embedding,
      })
      .select('*')
      .single();

    if (error) throw error;

    if (input.skills.length > 0) {
      const rows = await Promise.all(
        input.skills.map(async (s) => ({
          opportunity_id: opportunity.id,
          skill_id: await findOrCreateSkill(s.name),
          importance: s.importance,
        }))
      );
      const { error: skillsError } = await supabase.from('opportunity_skills').insert(rows);
      if (skillsError) throw skillsError;
    }

    return res.status(201).json({ opportunity, skills: input.skills });
  } catch (err) {
    console.error('Opportunity creation failed:', err);
    return res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

/**
 * GET /api/opportunities
 * Plain list/browse — no API calls, no scoring. Full recommendation scoring
 * (pgvector + weighted formula) is a separate route coming later; this is
 * just a simple browsable list, e.g. for an admin view or unfiltered feed.
 */
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      opportunity_skills ( importance, skills ( id, name, category ) )
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch opportunities' });
  return res.status(200).json({ opportunities });
});

export default router;
