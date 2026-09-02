"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import {
  Badge,
  ButtonLink,
  ProgressBar,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import {
  buildOpportunityDna,
  daysUntil,
  getRecommendations,
  getSkillGaps,
} from "@/lib/recommend";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  const { profile, activities } = useStore();

  const recommendations = useMemo(
    () => getRecommendations(profile, activities),
    [profile, activities],
  );
  const dna = useMemo(
    () => buildOpportunityDna(profile, activities),
    [profile, activities],
  );
  const gaps = useMemo(() => getSkillGaps(profile), [profile]);

  const closingSoon = recommendations.filter(
    (r) =>
      daysUntil(r.opportunity.registrationDeadline) >= 0 &&
      daysUntil(r.opportunity.registrationDeadline) <= 7,
  );
  const saved = activities.filter((a) => a.action === "SAVE").length;
  const registered = activities.filter((a) => a.action === "REGISTER").length;

  return (
    <div className="space-y-8">
      <section className="mesh card animate-in overflow-hidden p-7">
        <Badge tone="brand">Your AI opportunity feed</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-900">
          {recommendations[0]?.score ?? 0}% best match today
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Ranked for <strong>{profile.careerGoal}</strong> using nine signals —
          career relevance, skills, interests, department, behaviour, location,
          preference, deadline and semantic similarity.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Matched"
            value={`${recommendations.length}`}
            hint="opportunities ranked"
            icon="❖"
          />
          <StatCard
            label="Closing soon"
            value={`${closingSoon.length}`}
            hint="deadline within 7 days"
            icon="⏱"
          />
          <StatCard label="Saved" value={`${saved}`} hint="in your shortlist" icon="★" />
          <StatCard
            label="Registered"
            value={`${registered}`}
            hint="feeding your DNA"
            icon="✓"
          />
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
        <section>
          <SectionTitle
            title="Top recommendations"
            subtitle="Every card explains why it was ranked for you."
            action={
              <ButtonLink href="/opportunities" variant="secondary">
                Browse all
              </ButtonLink>
            }
          />
          <div className="space-y-5">
            {recommendations.slice(0, 4).map((recommendation) => (
              <OpportunityCard
                key={recommendation.opportunity.id}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-7">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink-900">
                Opportunity DNA
              </h2>
              <Badge tone="mint">live</Badge>
            </div>
            <div className="mt-4 space-y-3.5">
              {dna.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{item.name}</span>
                    <span className="font-display text-xs font-bold text-ink-600">
                      {item.level}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={item.level} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-400">
              Updates automatically as you view, save, register and dismiss.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              Your skill gaps
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Against {profile.careerGoal}
            </p>
            <div className="mt-4 space-y-3.5">
              {gaps.slice(0, 4).map((gap) => (
                <div key={gap.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{gap.name}</span>
                    <span className="font-display text-xs font-bold text-ink-600">
                      {gap.current}% / {gap.required}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar
                      value={gap.current}
                      target={gap.required}
                      tone={gap.gap > 40 ? "amber" : "mint"}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/skill-gaps"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-500"
            >
              See gap-closing opportunities →
            </Link>
          </section>

          <section className="card bg-ink-900 p-6 text-white">
            <h2 className="font-display text-base font-bold">Ask the Copilot</h2>
            <p className="mt-2 text-sm text-ink-400">
              “What should I do in the next 3 months to become a{" "}
              {profile.careerGoal}?”
            </p>
            <ButtonLink href="/copilot" className="mt-4">
              Open AI Copilot
            </ButtonLink>
          </section>
        </aside>
      </div>
    </div>
  );
}
