"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import { Badge, ProgressBar, SectionTitle } from "@/components/ui";
import { getRecommendations, getSkillGaps } from "@/lib/recommend";
import { useStore } from "@/lib/store";

export default function SkillGapsPage() {
  const { profile, activities } = useStore();
  const gaps = useMemo(() => getSkillGaps(profile), [profile]);
  const priority = gaps.filter((g) => g.gap > 0).slice(0, 3);
  const priorityNames = priority.map((g) => g.name);

  const closers = useMemo(
    () =>
      getRecommendations(profile, activities)
        .filter((r) => r.opportunity.skills.some((s) => priorityNames.includes(s)))
        .slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, activities],
  );

  const readiness = Math.round(
    (gaps.reduce((sum, g) => sum + Math.min(g.current / g.required, 1), 0) /
      Math.max(1, gaps.length)) *
      100,
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Skill gap intelligence"
        subtitle={`Where you stand against ${profile.careerGoal}, and what closes the gap fastest.`}
      />

      <section className="card mesh p-7">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <Badge tone="brand">Career readiness</Badge>
            <p className="mt-3 font-display text-4xl font-extrabold text-ink-900">
              {readiness}%
            </p>
            <p className="mt-1 text-sm text-ink-600">
              towards {profile.careerGoal}
            </p>
          </div>
          <div className="w-full max-w-md">
            <ProgressBar value={readiness} />
            <p className="mt-3 text-xs text-ink-600">
              Priority order:{" "}
              <strong className="text-ink-900">
                {priorityNames.join(" → ") || "you are on track"}
              </strong>
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">
          Current profile vs target role
        </h2>
        <div className="mt-5 space-y-5">
          {gaps.map((gap) => (
            <div key={gap.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-800">
                  {gap.name}
                  {priorityNames.includes(gap.name) && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      priority
                    </span>
                  )}
                </span>
                <span className="font-display text-xs font-bold text-ink-600">
                  {gap.current}% · target {gap.required}%
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={gap.current}
                  target={gap.required}
                  tone={gap.gap > 40 ? "amber" : gap.gap > 0 ? "brand" : "mint"}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Opportunities that close these gaps"
          subtitle="Ranked by how directly they target your weakest skills."
          action={
            <Link
              href="/roadmap"
              className="text-sm font-semibold text-brand-700 hover:text-brand-500"
            >
              See full roadmap →
            </Link>
          }
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {closers.map((recommendation) => (
            <OpportunityCard
              key={recommendation.opportunity.id}
              recommendation={recommendation}
              compact
            />
          ))}
        </div>
      </section>
    </div>
  );
}
