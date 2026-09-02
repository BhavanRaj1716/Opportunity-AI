"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { daysUntil, formatDate } from "@/lib/recommend";
import type { Recommendation } from "@/lib/types";
import { Badge, Button, MatchRing, cn } from "./ui";

export function OpportunityCard({
  recommendation,
  compact = false,
}: {
  recommendation: Recommendation;
  compact?: boolean;
}) {
  const { opportunity, score, reasons } = recommendation;
  const { track, isSaved, isRegistered } = useStore();
  const saved = isSaved(opportunity.id);
  const registered = isRegistered(opportunity.id);
  const left = daysUntil(opportunity.registrationDeadline);

  return (
    <article className="card animate-in group overflow-hidden transition-transform duration-200 hover:-translate-y-1">
      <div
        className={cn(
          "relative h-2 w-full bg-linear-to-r",
          opportunity.image,
        )}
      />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{opportunity.type}</Badge>
              {left >= 0 && left <= 5 && (
                <Badge tone="rose">Closes in {left}d</Badge>
              )}
              {opportunity.isOnline && <Badge tone="mint">Online</Badge>}
              {opportunity.prize && <Badge tone="amber">{opportunity.prize}</Badge>}
            </div>
            <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink-900">
              <Link
                href={`/opportunities/${opportunity.id}`}
                onClick={() => track(opportunity.id, "CLICK")}
                className="transition-colors hover:text-brand-700"
              >
                {opportunity.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-ink-600">
              {opportunity.organizer} · {formatDate(opportunity.startDate)} ·{" "}
              {opportunity.isOnline
                ? "Online"
                : `${opportunity.location} (${opportunity.distanceKm} km)`}
            </p>
          </div>
          <MatchRing score={score} size={compact ? 60 : 72} />
        </div>

        {!compact && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink-600">
            {opportunity.description}
          </p>
        )}

        <div className="mt-4 rounded-xl bg-ink-50 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
            Why this?
          </p>
          <ul className="mt-2 space-y-1.5">
            {reasons.slice(0, compact ? 2 : 3).map((reason) => (
              <li key={reason} className="flex gap-2 text-sm text-ink-800">
                <span className="text-emerald-500">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => track(opportunity.id, "REGISTER")}
            variant={registered ? "secondary" : "primary"}
            className="flex-1"
          >
            {registered ? "Registered ✓" : "Register"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => track(opportunity.id, "SAVE")}
            aria-pressed={saved}
          >
            {saved ? "★ Saved" : "☆ Save"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => track(opportunity.id, "DISMISS")}
            title="Not interested"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </article>
  );
}
