"use client";

import { useMemo, useState } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import { Button, EmptyState, SectionTitle, cn } from "@/components/ui";
import { OPPORTUNITY_TYPES } from "@/lib/data";
import { daysUntil, getRecommendations } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import type { OpportunityType } from "@/lib/types";

type SortKey = "match" | "deadline" | "date";

export default function OpportunitiesPage() {
  const { profile, activities } = useStore();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<OpportunityType[]>([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [sort, setSort] = useState<SortKey>("match");

  const results = useMemo(() => {
    const list = getRecommendations(profile, activities).filter((r) => {
      const o = r.opportunity;
      if (types.length && !types.includes(o.type)) return false;
      if (onlineOnly && !o.isOnline) return false;
      if (nearby && (o.isOnline || o.distanceKm > profile.travelRadiusKm))
        return false;
      if (!query.trim()) return true;
      const haystack = [o.title, o.description, o.organizer, ...o.tags, ...o.skills]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

    if (sort === "deadline")
      return [...list].sort(
        (a, b) =>
          daysUntil(a.opportunity.registrationDeadline) -
          daysUntil(b.opportunity.registrationDeadline),
      );
    if (sort === "date")
      return [...list].sort(
        (a, b) =>
          new Date(a.opportunity.startDate).getTime() -
          new Date(b.opportunity.startDate).getTime(),
      );
    return list;
  }, [profile, activities, query, types, onlineOnly, nearby, sort]);

  const toggleType = (type: OpportunityType) =>
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  return (
    <div>
      <SectionTitle
        title="All opportunities"
        subtitle="Semantic search across titles, descriptions, tags and skills — still ranked by your Opportunity DNA."
      />

      <div className="card mb-6 space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search “machine learning”, “design”, “cloud”…"
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-brand-500"
          >
            <option value="match">Sort: Best match</option>
            <option value="deadline">Sort: Closing soonest</option>
            <option value="date">Sort: Starting soonest</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {OPPORTUNITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={chip(types.includes(type))}
            >
              {type}
            </button>
          ))}
          <span className="mx-1 w-px bg-ink-200" />
          <button onClick={() => setOnlineOnly((v) => !v)} className={chip(onlineOnly)}>
            Online only
          </button>
          <button onClick={() => setNearby((v) => !v)} className={chip(nearby)}>
            Within {profile.travelRadiusKm} km
          </button>
          {(types.length || onlineOnly || nearby || query) && (
            <Button
              variant="ghost"
              onClick={() => {
                setTypes([]);
                setOnlineOnly(false);
                setNearby(false);
                setQuery("");
              }}
              className="py-1.5 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs font-semibold text-ink-400">
          {results.length} opportunities matched
        </p>
      </div>

      {results.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {results.map((recommendation) => (
            <OpportunityCard
              key={recommendation.opportunity.id}
              recommendation={recommendation}
              compact
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No opportunities match those filters"
          description="Try widening your filters or clearing the search query — dismissed opportunities are hidden from this list."
        />
      )}
    </div>
  );
}

const chip = (active: boolean) =>
  cn(
    "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "bg-linear-to-r from-brand-600 to-accent-500 text-white"
      : "bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700",
  );
