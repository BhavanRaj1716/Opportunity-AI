"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Badge, Button, EmptyState, MatchRing, ProgressBar, cn } from "@/components/ui";
import { getOpportunity } from "@/lib/data";
import { daysUntil, formatDate, getRecommendations, scoreOpportunity } from "@/lib/recommend";
import { useStore } from "@/lib/store";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { profile, activities, track, isSaved, isRegistered } = useStore();
  const opportunity = getOpportunity(id);

  useEffect(() => {
    if (opportunity) track(opportunity.id, "VIEW");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const recommendation = useMemo(
    () => (opportunity ? scoreOpportunity(profile, opportunity, activities) : null),
    [opportunity, profile, activities],
  );

  const similar = useMemo(
    () =>
      opportunity
        ? getRecommendations(profile, activities)
            .filter(
              (r) =>
                r.opportunity.id !== opportunity.id &&
                r.opportunity.skills.some((s) => opportunity.skills.includes(s)),
            )
            .slice(0, 3)
        : [],
    [opportunity, profile, activities],
  );

  if (!opportunity || !recommendation) {
    return (
      <EmptyState
        title="Opportunity not found"
        description="This opportunity may have been removed."
        action={
          <Link
            href="/opportunities"
            className="text-sm font-semibold text-brand-700"
          >
            Back to all opportunities →
          </Link>
        }
      />
    );
  }

  const left = daysUntil(opportunity.registrationDeadline);
  const saved = isSaved(opportunity.id);
  const registered = isRegistered(opportunity.id);

  return (
    <div className="space-y-7">
      <Link
        href="/opportunities"
        className="text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        ← All opportunities
      </Link>

      <header className="card animate-in overflow-hidden">
        <div className={cn("h-32 w-full bg-linear-to-r", opportunity.image)} />
        <div className="flex flex-wrap items-start justify-between gap-6 p-7">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{opportunity.type}</Badge>
              {opportunity.isOnline && <Badge tone="mint">Online</Badge>}
              {opportunity.prize && <Badge tone="amber">{opportunity.prize}</Badge>}
              {left >= 0 && left <= 7 && (
                <Badge tone="rose">Registration closes in {left} days</Badge>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900">
              {opportunity.title}
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              Organised by {opportunity.organizer}
            </p>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink-600">
              {opportunity.description}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <Meta label="Starts" value={formatDate(opportunity.startDate)} />
              <Meta
                label="Deadline"
                value={formatDate(opportunity.registrationDeadline)}
              />
              <Meta
                label="Where"
                value={
                  opportunity.isOnline
                    ? "Online"
                    : `${opportunity.location} · ${opportunity.distanceKm} km`
                }
              />
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {opportunity.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={() => track(opportunity.id, "REGISTER")}
                variant={registered ? "secondary" : "primary"}
                className="px-6 py-3"
              >
                {registered ? "Registered ✓" : "Register now"}
              </Button>
              <Button variant="secondary" onClick={() => track(opportunity.id, "SAVE")}>
                {saved ? "★ Saved" : "☆ Save"}
              </Button>
              <Button variant="danger" onClick={() => track(opportunity.id, "DISMISS")}>
                Not interested
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-4 rounded-2xl bg-ink-50 p-6 sm:w-64">
            <MatchRing score={recommendation.score} size={116} />
            <p className="text-center text-xs font-semibold text-ink-600">
              Personalized match for
              <span className="block font-display text-sm font-bold text-ink-900">
                {profile.careerGoal}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">
            Why this was recommended
          </h2>
          <ul className="mt-4 space-y-2.5">
            {recommendation.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-sm text-ink-800">
                <span className="text-emerald-500">✓</span>
                {reason}
              </li>
            ))}
          </ul>

          <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-ink-400">
            Score breakdown
          </h3>
          <div className="mt-4 space-y-3">
            {recommendation.breakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{item.label}</span>
                  <span className="font-display text-xs font-bold text-ink-900">
                    {item.score} / {item.max}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={(item.score / item.max) * 100} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-ink-50 p-4 text-sm font-semibold text-ink-900">
            Final score {recommendation.score} / 100
          </p>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">
            Skills you will practise
          </h2>
          <div className="mt-4 space-y-3.5">
            {opportunity.skills.map((skill) => {
              const level = profile.skills.find((s) => s.name === skill)?.level ?? 0;
              return (
                <div key={skill}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{skill}</span>
                    <span className="font-display text-xs font-bold text-ink-600">
                      you: {level}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={level} tone={level < 40 ? "amber" : "mint"} />
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-7 font-display text-lg font-bold text-ink-900">
            Similar opportunities
          </h2>
          <div className="mt-3 space-y-2.5">
            {similar.map((r) => (
              <Link
                key={r.opportunity.id}
                href={`/opportunities/${r.opportunity.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="min-w-0 text-sm font-semibold text-ink-900">
                  {r.opportunity.title}
                </span>
                <span className="font-display text-xs font-bold text-brand-700">
                  {r.score}%
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-ink-400">
        {label}
      </dt>
      <dd className="mt-1 font-display text-sm font-bold text-ink-900">{value}</dd>
    </div>
  );
}
