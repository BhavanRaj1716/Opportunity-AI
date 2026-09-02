"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-r from-brand-600 to-accent-500 text-white shadow-lg shadow-brand-600/25 hover:brightness-110",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:border-brand-300 hover:text-brand-700",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cn(base, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cn(base, buttonStyles[variant], className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "mint" | "amber" | "rose";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    mint: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  target,
  tone = "brand",
}: {
  value: number;
  target?: number;
  tone?: "brand" | "mint" | "amber";
}) {
  const tones = {
    brand: "from-brand-500 to-accent-500",
    mint: "from-emerald-500 to-teal-400",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={cn(
          "h-full rounded-full bg-linear-to-r transition-all duration-700",
          tones[tone],
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {target !== undefined && (
        <span
          className="absolute top-0 h-full w-0.5 bg-ink-400/70"
          style={{ left: `${Math.min(100, target)}%` }}
          title={`Target ${target}%`}
        />
      )}
    </div>
  );
}

export function MatchRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, score) / 100);
  const stroke =
    score >= 85 ? "#6366f1" : score >= 70 ? "#a855f7" : score >= 55 ? "#f59e0b" : "#94a3b8";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`${score} percent match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e8eaf4"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold text-ink-900"
          style={{ fontSize: size / 4 }}
        >
          {score}%
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-400">
          match
        </span>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {label}
        </span>
        <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-2xl">
        ✨
      </div>
      <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
      <p className="max-w-sm text-sm text-ink-600">{description}</p>
      {action}
    </div>
  );
}
