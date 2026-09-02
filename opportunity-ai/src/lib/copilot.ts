import { buildRoadmap, daysUntil, formatDate, getRecommendations, getSkillGaps } from "./recommend";
import type { Activity, StudentProfile } from "./types";

export const COPILOT_PROMPTS = [
  "What should I do in the next 3 months to reach my goal?",
  "Show opportunities near me",
  "Which events can close my skill gaps?",
  "I only have weekends available",
  "Why did you recommend the top event?",
];

/**
 * Deterministic, offline stand-in for `POST /api/copilot`. Swap this out for
 * a real LLM call when the backend is available.
 */
export function askCopilot(
  question: string,
  profile: StudentProfile,
  activities: Activity[],
): string {
  const q = question.toLowerCase();
  const recommendations = getRecommendations(profile, activities);
  const gaps = getSkillGaps(profile).filter((g) => g.gap > 0);
  const top = recommendations[0];

  if (!top) return "I could not find any opportunities to recommend yet.";

  const line = (index: number) => {
    const r = recommendations[index];
    return `${index + 1}. ${r.opportunity.title} — ${r.score}% match\n   ${r.reasons[0] ?? r.opportunity.type}`;
  };

  if (/(3 months|three months|next month|roadmap|plan|sequence|become)/.test(q)) {
    const roadmap = buildRoadmap(profile, activities);
    return [
      `Here is a Learn → Practice → Build path towards ${profile.careerGoal}:`,
      "",
      ...roadmap.map(
        (stage, index) =>
          `${index + 1}. ${stage.phase}: ${stage.opportunity!.title}\n   ${stage.caption} · ${formatDate(stage.opportunity!.startDate)}`,
      ),
      "",
      `Priority skill gaps to attack in order: ${gaps
        .slice(0, 3)
        .map((g) => g.name)
        .join(", ")}.`,
    ].join("\n");
  }

  if (/(near me|nearby|location|offline|travel|campus)/.test(q)) {
    const near = recommendations
      .filter(
        (r) =>
          !r.opportunity.isOnline &&
          r.opportunity.distanceKm <= profile.travelRadiusKm,
      )
      .slice(0, 3);
    if (!near.length)
      return `Nothing offline within ${profile.travelRadiusKm} km right now, but ${top.opportunity.title} is online and matches you at ${top.score}%.`;
    return [
      `Opportunities within ${profile.travelRadiusKm} km of ${profile.location}:`,
      "",
      ...near.map(
        (r, i) =>
          `${i + 1}. ${r.opportunity.title} — ${r.opportunity.distanceKm} km · ${r.score}% match`,
      ),
    ].join("\n");
  }

  if (/(skill gap|gaps|weak|improve|learn)/.test(q)) {
    const gapNames = gaps.slice(0, 3).map((g) => g.name);
    const helpful = recommendations
      .filter((r) => r.opportunity.skills.some((s) => gapNames.includes(s)))
      .slice(0, 3);
    return [
      `Your biggest gaps for ${profile.careerGoal} are ${gapNames.join(", ")}.`,
      "",
      "These opportunities target them directly:",
      ...helpful.map(
        (r, i) =>
          `${i + 1}. ${r.opportunity.title} — covers ${r.opportunity.skills
            .filter((s) => gapNames.includes(s))
            .join(", ")}`,
      ),
    ].join("\n");
  }

  if (/(weekend|free time|busy|time|short)/.test(q)) {
    const short = recommendations
      .filter((r) =>
        ["Workshop", "Seminar", "Hackathon", "Competition"].includes(
          r.opportunity.type,
        ),
      )
      .slice(0, 3);
    return [
      "Weekend-friendly picks that still move you forward:",
      "",
      ...short.map(
        (r, i) =>
          `${i + 1}. ${r.opportunity.title} (${r.opportunity.type}) · starts ${formatDate(r.opportunity.startDate)}`,
      ),
    ].join("\n");
  }

  if (/(why|explain|reason)/.test(q)) {
    return [
      `${top.opportunity.title} — ${top.score}% match`,
      "",
      ...top.reasons.map((reason) => `✓ ${reason}`),
      "",
      `Score breakdown: ${top.breakdown
        .filter((b) => b.score > 0)
        .map((b) => `${b.label} ${b.score}/${b.max}`)
        .join(" · ")}`,
    ].join("\n");
  }

  if (/(deadline|urgent|closing|soon)/.test(q)) {
    const urgent = recommendations
      .filter((r) => daysUntil(r.opportunity.registrationDeadline) <= 7)
      .slice(0, 4);
    if (!urgent.length) return "Nothing is closing in the next 7 days.";
    return [
      "Closing soon:",
      "",
      ...urgent.map(
        (r) =>
          `• ${r.opportunity.title} — ${daysUntil(r.opportunity.registrationDeadline)} days left`,
      ),
    ].join("\n");
  }

  const keyword = q
    .split(/\s+/)
    .find((word) =>
      recommendations.some((r) =>
        [...r.opportunity.tags, ...r.opportunity.skills]
          .join(" ")
          .toLowerCase()
          .includes(word),
      ),
    );

  if (keyword && keyword.length > 2) {
    const filtered = recommendations
      .filter((r) =>
        [...r.opportunity.tags, ...r.opportunity.skills]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 3);
    return [
      `Opportunities related to "${keyword}":`,
      "",
      ...filtered.map(
        (r, i) => `${i + 1}. ${r.opportunity.title} — ${r.score}% match`,
      ),
    ].join("\n");
  }

  return [
    `Based on your Opportunity DNA (${profile.careerGoal}, year ${profile.year} ${profile.department}), here is what I would do next:`,
    "",
    line(0),
    line(1),
    line(2),
    "",
    "Ask me about skill gaps, deadlines, nearby events or a 3-month plan.",
  ].join("\n");
}
