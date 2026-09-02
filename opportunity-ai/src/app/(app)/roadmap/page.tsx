"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, SectionTitle } from "@/components/ui";
import { buildRoadmap, formatDate, getSkillGaps } from "@/lib/recommend";
import { useStore } from "@/lib/store";

export default function RoadmapPage() {
  const { profile, activities } = useStore();
  const roadmap = useMemo(
    () => buildRoadmap(profile, activities),
    [profile, activities],
  );
  const gaps = useMemo(
    () => getSkillGaps(profile).filter((g) => g.gap > 0).slice(0, 3),
    [profile],
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Career opportunity roadmap"
        subtitle={`A Learn → Practice → Build → Prove sequence generated from your profile, gaps and the live opportunity pool.`}
      />

      <section className="card mesh p-7">
        <Badge tone="brand">Target role</Badge>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
          {profile.careerGoal}
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Starting point: Year {profile.year} {profile.department} student in{" "}
          {profile.location}. Focus skills:{" "}
          {gaps.map((g) => g.name).join(", ") || "maintain your current strengths"}.
        </p>
      </section>

      <ol className="relative space-y-5 border-l-2 border-dashed border-ink-200 pl-7">
        {roadmap.map((stage, index) => (
          <li key={stage.phase} className="relative">
            <span className="absolute -left-[38px] grid size-7 place-items-center rounded-full bg-linear-to-br from-brand-600 to-accent-500 font-display text-xs font-bold text-white">
              {index + 1}
            </span>
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-lg font-bold text-ink-900">
                  {stage.phase}
                </span>
                <Badge tone="neutral">{stage.opportunity!.type}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-600">{stage.caption}</p>
              <Link
                href={`/opportunities/${stage.opportunity!.id}`}
                className="mt-4 block rounded-xl border border-ink-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <p className="font-display text-sm font-bold text-ink-900">
                  {stage.opportunity!.title}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  {stage.opportunity!.organizer} ·{" "}
                  {formatDate(stage.opportunity!.startDate)} ·{" "}
                  {stage.opportunity!.isOnline
                    ? "Online"
                    : stage.opportunity!.location}
                </p>
              </Link>
            </div>
          </li>
        ))}
        <li className="relative">
          <span className="absolute -left-[38px] grid size-7 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ★
          </span>
          <div className="card bg-ink-900 p-6 text-white">
            <p className="font-display text-lg font-bold">{profile.careerGoal}</p>
            <p className="mt-1 text-sm text-ink-400">
              Portfolio project + competition record + internship experience.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
