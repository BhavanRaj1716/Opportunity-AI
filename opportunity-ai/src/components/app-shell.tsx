"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◎" },
  { href: "/opportunities", label: "Opportunities", icon: "❖" },
  { href: "/skill-gaps", label: "Skill Gaps", icon: "▲" },
  { href: "/roadmap", label: "Career Roadmap", icon: "⇢" },
  { href: "/copilot", label: "AI Copilot", icon: "✦" },
  { href: "/saved", label: "Saved & Activity", icon: "★" },
  { href: "/profile", label: "Profile", icon: "☺" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useStore();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
    );
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-ink-900 text-ink-100 transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link href="/" className="flex items-center gap-3 px-6 py-6">
          <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-accent-500 font-display text-lg font-extrabold text-white">
            O
          </span>
          <span>
            <span className="block font-display text-lg font-extrabold tracking-tight text-white">
              OpportunityAI
            </span>
            <span className="block text-[11px] font-medium text-ink-400">
              Career-aware discovery
            </span>
          </span>
        </Link>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-ink-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-lg text-xs",
                    active
                      ? "bg-linear-to-br from-brand-500 to-accent-500 text-white"
                      : "bg-white/5",
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Career goal
          </p>
          <p className="mt-1 font-display text-sm font-bold text-white">
            {profile.careerGoal}
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-block text-xs font-semibold text-brand-300 hover:text-white"
          >
            Rebuild Opportunity DNA →
          </Link>
          <button
            onClick={handleLogout}
            className="mt-2 inline-block text-xs font-semibold text-rose-400 hover:text-white"
          >
            Log out →
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
        />
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white/85 px-5 py-3.5 backdrop-blur-md">
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-lg border border-ink-200 text-ink-600 lg:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink-900">
              {greeting}{profile.name ? `, ${profile.name}` : ""} 👋
            </p>
            <p className="truncate text-xs text-ink-600">
              Year {profile.year} · {profile.department} · {profile.location}
            </p>
          </div>
          <Link
            href="/profile"
            className="grid size-9 place-items-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 font-display text-sm font-bold text-white"
          >
            {profile.name ? profile.name.slice(0, 1).toUpperCase() : "?"}
          </Link>
          <button
            onClick={handleLogout}
            className="hidden rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 lg:block"
          >
            Log out
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7">{children}</main>
      </div>
    </div>
  );
}
