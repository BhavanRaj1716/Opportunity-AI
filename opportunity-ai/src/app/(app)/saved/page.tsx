"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OpportunityCard } from "@/components/opportunity-card";
import { Badge, Button, EmptyState, SectionTitle } from "@/components/ui";
import { getOpportunity } from "@/lib/data";
import { getRecommendations } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import type { ActivityAction } from "@/lib/types";

const TONE: Record<ActivityAction, "neutral" | "brand" | "mint" | "amber" | "rose"> = {
  VIEW: "neutral",
  CLICK: "neutral",
  SAVE: "amber",
  REGISTER: "mint",
  ATTEND: "mint",
  DISMISS: "rose",
};

export default function SavedPage() {
  const { profile, activities, track, reset } = useStore();
  const all = useMemo(
    () => getRecommendations(profile, activities, { includeDismissed: true }),
    [profile, activities],
  );

  const savedIds = new Set(
    activities.filter((a) => a.action === "SAVE").map((a) => a.opportunityId),
  );
  const registeredIds = new Set(
    activities.filter((a) => a.action === "REGISTER").map((a) => a.opportunityId),
  );
  const dismissedIds = new Set(
    activities.filter((a) => a.action === "DISMISS").map((a) => a.opportunityId),
  );

  const saved = all.filter((r) => savedIds.has(r.opportunity.id));
  const registered = all.filter((r) => registeredIds.has(r.opportunity.id));

  return (
    <div className="space-y-9">
      <SectionTitle
        title="Saved & activity"
        subtitle="Every interaction feeds the behavioural layer of your Opportunity DNA."
        action={
          activities.length ? (
            <Button variant="danger" onClick={reset}>
              Reset demo data
            </Button>
          ) : undefined
        }
      />

      <section>
        <h2 className="mb-4 font-display text-base font-bold text-ink-900">
          Registered ({registered.length})
        </h2>
        {registered.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {registered.map((r) => (
              <OpportunityCard key={r.opportunity.id} recommendation={r} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-600">
            Nothing yet —{" "}
            <Link href="/dashboard" className="font-semibold text-brand-700">
              register from your feed
            </Link>
            .
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-base font-bold text-ink-900">
          Saved ({saved.length})
        </h2>
        {saved.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {saved.map((r) => (
              <OpportunityCard key={r.opportunity.id} recommendation={r} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-600">No saved opportunities yet.</p>
        )}
      </section>

      {dismissedIds.size > 0 && (
        <section>
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">
            Dismissed ({dismissedIds.size})
          </h2>
          <div className="card divide-y divide-ink-200">
            {[...dismissedIds].map((id) => {
              const opportunity = getOpportunity(id);
              if (!opportunity) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <span className="text-sm font-semibold text-ink-600 line-through">
                    {opportunity.title}
                  </span>
                  <Button variant="secondary" onClick={() => track(id, "DISMISS")}>
                    Undo
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-display text-base font-bold text-ink-900">
          Activity feed
        </h2>
        {activities.length ? (
          <div className="card divide-y divide-ink-200">
            {activities.slice(0, 25).map((activity) => {
              const opportunity = getOpportunity(activity.opportunityId);
              return (
                <div
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Badge tone={TONE[activity.action]}>{activity.action}</Badge>
                    <span className="text-sm font-medium text-ink-800">
                      {opportunity?.title ?? activity.opportunityId}
                    </span>
                  </div>
                  <span className="text-xs text-ink-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No activity recorded yet"
            description="View, save, register or dismiss opportunities and they will show up here — and start re-ranking your feed."
          />
        )}
      </section>
    </div>
  );
}
