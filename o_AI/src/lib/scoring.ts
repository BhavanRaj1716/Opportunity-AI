// Pure logic only — no API calls in this file. All inputs come from rows
// already fetched from Supabase in the recommendations route.

export interface SkillRow {
  skill_id: string;
  value: number; // proficiency (profile) or importance (opportunity/track), 0-100
}

export interface OpportunityForScoring {
  id: string;
  type: string;
  location: string | null;
  is_online: boolean;
  registration_deadline: string | null; // 'YYYY-MM-DD'
  title: string;
  description: string | null;
  skills: SkillRow[]; // opportunity_skills
  semanticSimilarity: number; // from match_opportunities() pgvector call, 0-1
}

export interface ProfileForScoring {
  department: string | null;
  location: string | null;
  career_goal: string | null;
  skills: SkillRow[]; // profile_skills
  interests: { name: string; weight: number }[];
}

export interface ActivityContext {
  // opportunity_id -> action, for this profile's history
  actionsByOpportunity: Map<string, 'viewed' | 'saved' | 'applied' | 'dismissed'>;
  // type -> count of saved/applied actions, for inferring type preference
  typeAffinityCounts: Map<string, number>;
  totalTypedActions: number;
}

const WEIGHTS = {
  careerGoal: 0.25,
  skillMatch: 0.2,
  interestMatch: 0.15,
  departmentMatch: 0.1,
  previousActivity: 0.1,
  location: 0.05,
  deadlineUrgency: 0.05,
  eventTypePreference: 0.05,
  semanticSimilarity: 0.05,
};

/**
 * Weighted overlap between two skill-id-keyed lists (0-100 scale each).
 * Used for both "skill match" (profile vs opportunity) and "career goal
 * relevance" (career_track_skills vs opportunity_skills) — same math,
 * different inputs.
 */
function weightedSkillOverlap(a: SkillRow[], b: SkillRow[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const bMap = new Map(b.map((s) => [s.skill_id, s.value]));
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const skill of a) {
    totalWeight += skill.value;
    const bValue = bMap.get(skill.skill_id);
    if (bValue !== undefined) {
      matchedWeight += Math.min(skill.value, bValue);
    }
  }

  return totalWeight === 0 ? 0 : matchedWeight / totalWeight; // 0-1
}

/**
 * Keyword-based fallback for interest matching, since opportunities have no
 * dedicated interest tags in the schema. Checks whether each interest name
 * appears in the opportunity's title/description, weighted by interest weight.
 */
function interestKeywordMatch(
  interests: { name: string; weight: number }[],
  opportunityText: string
): number {
  if (interests.length === 0) return 0;

  const lowerText = opportunityText.toLowerCase();
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const interest of interests) {
    totalWeight += interest.weight;
    if (lowerText.includes(interest.name.toLowerCase())) {
      matchedWeight += interest.weight;
    }
  }

  return totalWeight === 0 ? 0 : matchedWeight / totalWeight; // 0-1
}

function locationMatch(profileLocation: string | null, opp: OpportunityForScoring): number {
  if (opp.is_online) return 1; // online opportunities fit everyone
  if (!profileLocation || !opp.location) return 0.5; // unknown, stay neutral
  return profileLocation.toLowerCase().trim() === opp.location.toLowerCase().trim() ? 1 : 0;
}

/**
 * Nearer (but not passed) deadlines score higher, up to a 30-day horizon.
 * Already-expired deadlines should be filtered out before scoring (see route).
 */
function deadlineUrgency(deadline: string | null): number {
  if (!deadline) return 0.5; // no deadline = neutral, not urgent but not irrelevant
  const daysLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 0;
  return Math.max(0, 1 - daysLeft / 30);
}

function eventTypePreference(type: string, activity: ActivityContext): number {
  if (activity.totalTypedActions === 0) return 0.5; // no history yet, stay neutral
  const count = activity.typeAffinityCounts.get(type) ?? 0;
  return count / activity.totalTypedActions;
}

/**
 * "Previous activity" component — reflects the student's history with THIS
 * specific opportunity, not general type preference (that's handled above).
 * Already-dismissed items should really be filtered out before scoring, but
 * this is a fallback score in case that filter is ever skipped.
 */
function previousActivityScore(oppId: string, activity: ActivityContext): number {
  const action = activity.actionsByOpportunity.get(oppId);
  if (action === 'dismissed') return 0;
  if (action === 'applied') return 1;
  if (action === 'saved') return 0.75;
  if (action === 'viewed') return 0.4;
  return 0.5; // no interaction yet
}

export interface ScoreBreakdown {
  total: number; // 0-1, higher is better
  careerGoal: number;
  skillMatch: number;
  interestMatch: number;
  departmentMatch: number;
  previousActivity: number;
  location: number;
  deadlineUrgency: number;
  eventTypePreference: number;
  semanticSimilarity: number;
}

export function scoreOpportunity(
  profile: ProfileForScoring,
  careerTrackSkills: SkillRow[], // skills needed for the profile's career_goal track, [] if no matching track found
  opportunity: OpportunityForScoring,
  activity: ActivityContext
): ScoreBreakdown {
  const careerGoal = weightedSkillOverlap(careerTrackSkills, opportunity.skills);
  const skillMatch = weightedSkillOverlap(profile.skills, opportunity.skills);
  const interestMatch = interestKeywordMatch(
    profile.interests,
    `${opportunity.title} ${opportunity.description ?? ''}`
  );
  const department = 0.5;
  const prevActivity = previousActivityScore(opportunity.id, activity);
  const location = locationMatch(profile.location, opportunity);
  const urgency = deadlineUrgency(opportunity.registration_deadline);
  const typePref = eventTypePreference(opportunity.type, activity);
  const similarity = opportunity.semanticSimilarity;

  const total =
    careerGoal * WEIGHTS.careerGoal +
    skillMatch * WEIGHTS.skillMatch +
    interestMatch * WEIGHTS.interestMatch +
    department * WEIGHTS.departmentMatch +
    prevActivity * WEIGHTS.previousActivity +
    location * WEIGHTS.location +
    urgency * WEIGHTS.deadlineUrgency +
    typePref * WEIGHTS.eventTypePreference +
    similarity * WEIGHTS.semanticSimilarity;

  return {
    total,
    careerGoal,
    skillMatch,
    interestMatch,
    departmentMatch: department,
    previousActivity: prevActivity,
    location,
    deadlineUrgency: urgency,
    eventTypePreference: typePref,
    semanticSimilarity: similarity,
  };
}
