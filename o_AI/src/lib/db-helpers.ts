import { supabase } from '../config/supabase.js';

/**
 * Skills/interests are shared reference tables (public.skills, public.interests).
 * The LLM extracts free-text names like "React" or "machine learning" — this
 * finds a matching row by name, or creates one if it doesn't exist yet, so we
 * never end up with duplicate "React" / "react" / "React.js" rows by accident
 * (basic case-insensitive match; not fuzzy matching).
 */
export async function findOrCreateSkill(name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from('skills')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('skills')
    .insert({ name: trimmed })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

export async function findOrCreateInterest(name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from('interests')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('interests')
    .insert({ name: trimmed })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

/**
 * Replaces a profile's skills entirely with the new list — deletes old rows
 * first. Simpler and safer than diffing old vs new on every edit, and this
 * only runs on profile create/edit (not a hot path), so the extra delete is cheap.
 */
export async function syncProfileSkills(
  profileId: string,
  skills: { name: string; proficiency: number }[]
) {
  await supabase.from('profile_skills').delete().eq('profile_id', profileId);

  if (skills.length === 0) return;

  const rows = await Promise.all(
    skills.map(async (s) => ({
      profile_id: profileId,
      skill_id: await findOrCreateSkill(s.name),
      proficiency: s.proficiency,
    }))
  );

  const { error } = await supabase.from('profile_skills').insert(rows);
  if (error) throw error;
}

export async function syncProfileInterests(
  profileId: string,
  interests: { name: string; weight: number }[]
) {
  await supabase.from('profile_interests').delete().eq('profile_id', profileId);

  if (interests.length === 0) return;

  const rows = await Promise.all(
    interests.map(async (i) => ({
      profile_id: profileId,
      interest_id: await findOrCreateInterest(i.name),
      weight: i.weight,
    }))
  );

  const { error } = await supabase.from('profile_interests').insert(rows);
  if (error) throw error;
}
