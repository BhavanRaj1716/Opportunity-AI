import { CAREER_SKILL_MAP, OPPORTUNITIES } from "./data";
import type {
  Activity,
  Opportunity,
  Recommendation,
  ScoreBreakdown,
  SkillGap,
  StudentProfile,
} from "./types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

export const daysUntil = (date: string) =>
  Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#/ ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

/**
 * Stand-in for embedding similarity: bag-of-words cosine between the
 * student's profile text and the opportunity text.
 */
function semanticSimilarity(profile: StudentProfile, opportunity: Opportunity) {
  const profileText = [
    profile.summary,
    profile.careerGoal,
    profile.department,
    ...profile.interests,
    ...profile.skills.map((s) => s.name),
  ].join(" ");
  const opportunityText = [
    opportunity.title,
    opportunity.description,
    opportunity.type,
    ...opportunity.tags,
    ...opportunity.skills,
    ...opportunity.careerTracks,
  ].join(" ");

  const a = tokenize(profileText);
  const b = new Set(tokenize(opportunityText));
  if (!a.length || !b.size) return 0;
  const overlap = a.filter((token) => b.has(token)).length;
  // Normalise by the geometric mean of both token counts for a true cosine proxy
  return clamp(overlap / Math.sqrt(a.length * b.size) * 2);
}

export function getSkillGaps(profile: StudentProfile): SkillGap[] {
  const required = CAREER_SKILL_MAP[profile.careerGoal] ?? {};
  return Object.entries(required)
    .map(([name, target]) => {
      const current = profile.skills.find((s) => s.name === name)?.level ?? 0;
      return { name, current, required: target, gap: Math.max(0, target - current) };
    })
    .sort((a, b) => b.gap - a.gap);
}

function behaviourWeights(activities: Activity[]) {
  const weights = new Map<string, number>();
  const points: Record<Activity["action"], number> = {
    VIEW: 0.5,
    CLICK: 1,
    SAVE: 2.5,
    REGISTER: 4,
    ATTEND: 4,
    DISMISS: -4,
  };
  for (const activity of activities) {
    const opportunity = OPPORTUNITIES.find(
      (o) => o.id === activity.opportunityId,
    );
    if (!opportunity) continue;
    for (const tag of [...opportunity.tags, opportunity.type, ...opportunity.skills]) {
      weights.set(tag, (weights.get(tag) ?? 0) + points[activity.action]);
    }
  }
  return weights;
}

export function scoreOpportunity(
  profile: StudentProfile,
  opportunity: Opportunity,
  activities: Activity[],
): Recommendation {
  const gaps = getSkillGaps(profile);
  const topGaps = gaps.slice(0, 3).map((g) => g.name);

  // 25% — career goal relevance
  const careerHit = opportunity.careerTracks.includes(profile.careerGoal);
  const careerAdjacent = opportunity.careerTracks.some((track) =>
    Object.keys(CAREER_SKILL_MAP[profile.careerGoal] ?? {}).some((skill) =>
      (CAREER_SKILL_MAP[track] ?? {})[skill] !== undefined,
    ),
  );
  const career = careerHit ? 25 : careerAdjacent ? 11 : 3;

  // 20% — skill match (skills the student already has + gap-closing skills)
  const known = new Set(
    profile.skills.filter((s) => s.level >= 40).map((s) => s.name),
  );
  const overlap = opportunity.skills.filter((s) => known.has(s)).length;
  const gapCovered = opportunity.skills.filter((s) => topGaps.includes(s)).length;
  const skill = clamp((overlap * 0.6 + gapCovered * 0.9) / 3) * 20;

  // 15% — interest match
  const interestText = profile.interests.join(" ").toLowerCase();
  const interestHits = [...opportunity.tags, ...opportunity.skills].filter((tag) =>
    interestText.includes(tag.toLowerCase().split(" ")[0]),
  ).length;
  const interest = clamp(interestHits / 2) * 15;

  // 10% — department match
  const department = opportunity.departments.includes(profile.department)
    ? 10
    : 4;

  // 10% — previous activity
  const weights = behaviourWeights(activities);
  const behaviourScore = [...opportunity.tags, opportunity.type].reduce(
    (sum, tag) => sum + (weights.get(tag) ?? 0),
    0,
  );
  // No free points for zero activity — only reward positive engagement
  const previous = activities.length === 0 ? 0 : clamp(behaviourScore / 8) * 10;

  // 5% — location
  const location = opportunity.isOnline
    ? 5
    : opportunity.distanceKm <= profile.travelRadiusKm
      ? 5 - (opportunity.distanceKm / profile.travelRadiusKm) * 1.5
      : clamp(1 - (opportunity.distanceKm - profile.travelRadiusKm) / 300) * 2.5;

  // 5% — preferred opportunity type
  const preference = profile.preferredTypes.includes(opportunity.type) ? 5 : 2;

  // 5% — deadline urgency
  const left = daysUntil(opportunity.registrationDeadline);
  const deadline = left < 0 ? 0 : left <= 5 ? 5 : left <= 12 ? 4 : 3;

  // 5% — semantic similarity
  const semantic = semanticSimilarity(profile, opportunity) * 5;

  const breakdown: ScoreBreakdown[] = [
    { label: "Career goal relevance", score: career, max: 25 },
    { label: "Skill match", score: skill, max: 20 },
    { label: "Interest match", score: interest, max: 15 },
    { label: "Department relevance", score: department, max: 10 },
    { label: "Previous activity", score: previous, max: 10 },
    { label: "Location", score: location, max: 5 },
    { label: "Event preference", score: preference, max: 5 },
    { label: "Deadline urgency", score: deadline, max: 5 },
    { label: "Semantic similarity", score: semantic, max: 5 },
  ].map((item) => ({ ...item, score: Math.round(item.score * 10) / 10 }));

  const score = Math.round(
    breakdown.reduce((sum, item) => sum + item.score, 0),
  );

  const reasons: string[] = [];
  if (careerHit) reasons.push(`Directly supports your ${profile.careerGoal} goal`);
  if (gapCovered)
    reasons.push(
      `Helps close your ${opportunity.skills
        .filter((s) => topGaps.includes(s))
        .slice(0, 2)
        .join(" and ")} skill gap`,
    );
  if (overlap)
    reasons.push(
      `Builds on skills you already have (${opportunity.skills
        .filter((s) => known.has(s))
        .slice(0, 2)
        .join(", ")})`,
    );
  if (interestHits) reasons.push(`Matches your ${profile.interests[0]} interest`);
  if (opportunity.isOnline) reasons.push("Fully online — no travel needed");
  else if (opportunity.distanceKm <= profile.travelRadiusKm)
    reasons.push(`Only ${opportunity.distanceKm} km from ${profile.location}`);
  if (behaviourScore > 2)
    reasons.push("Similar to opportunities you engaged with recently");
  if (left >= 0 && left <= 5)
    reasons.push(`Registration closes in ${left} day${left === 1 ? "" : "s"}`);
  if (profile.preferredTypes.includes(opportunity.type))
    reasons.push(`${opportunity.type}s are one of your preferred formats`);

  return { opportunity, score, breakdown, reasons: reasons.slice(0, 5) };
}

export function getRecommendations(
  profile: StudentProfile,
  activities: Activity[],
  options: { includeDismissed?: boolean } = {},
): Recommendation[] {
  const dismissed = new Set(
    activities.filter((a) => a.action === "DISMISS").map((a) => a.opportunityId),
  );
  return OPPORTUNITIES.filter(
    (o) => options.includeDismissed || !dismissed.has(o.id),
  )
    .map((o) => scoreOpportunity(profile, o, activities))
    .sort((a, b) => b.score - a.score);
}

export function buildOpportunityDna(
  profile: StudentProfile,
  activities: Activity[],
) {
  const weights = behaviourWeights(activities);
  const base = new Map<string, number>();
  for (const skill of profile.skills) base.set(skill.name, skill.level);
  for (const interest of profile.interests)
    base.set(interest, Math.max(base.get(interest) ?? 0, 70));

  for (const [tag, weight] of weights) {
    if (weight <= 0) continue;
    base.set(tag, Math.min(100, (base.get(tag) ?? 45) + weight * 3));
  }

  return [...base.entries()]
    .map(([name, level]) => ({ name, level: Math.round(level) }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 8);
}

export function buildRoadmap(profile: StudentProfile, activities: Activity[]) {
  const recommendations = getRecommendations(profile, activities);
  const pick = (type: Opportunity["type"]) =>
    recommendations.find((r) => r.opportunity.type === type)?.opportunity;

  const stages = [
    {
      phase: "Learn",
      caption: "Build the fundamentals you are missing",
      opportunity: pick("Workshop") ?? pick("Seminar"),
    },
    {
      phase: "Practice",
      caption: "Apply the theory on real data",
      opportunity: pick("Competition") ?? pick("Bootcamp"),
    },
    {
      phase: "Build",
      caption: "Turn practice into a portfolio project",
      opportunity: pick("Hackathon"),
    },
    {
      phase: "Prove",
      caption: "Convert your portfolio into experience",
      opportunity: pick("Internship"),
    },
  ];

  return stages.filter((stage) => stage.opportunity);
}
