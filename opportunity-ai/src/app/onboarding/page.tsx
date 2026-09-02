"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAREER_GOALS, OPPORTUNITY_TYPES } from "@/lib/data";
import { parseProfile } from "@/lib/profile-parser";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { OpportunityType, StudentProfile } from "@/lib/types";
import { Badge, Button, ProgressBar, cn } from "@/components/ui";

const EXAMPLE =
  "I'm a second-year CSE student in Bangalore. I know Java and C, I'm learning Python and SQL, I'm interested in AI and data science, and I want to become a machine learning engineer. I prefer hackathons and workshops.";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, completeOnboarding } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<StudentProfile>(profile);
  const [interestInput, setInterestInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const runExtraction = () => {
    setParsing(true);
    // Simulates the `POST /api/profile/parse` LLM round-trip.
    setTimeout(() => {
      setDraft(parseProfile(text || EXAMPLE, profile));
      setParsing(false);
      setStep(2);
    }, 900);
  };

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <div className="mesh min-h-screen px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="font-display text-sm font-bold text-ink-600 hover:text-ink-900"
        >
          ← OpportunityAI
        </Link>

        <div className="mt-6 flex items-center gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full font-display text-sm font-bold",
                  step >= n
                    ? "bg-linear-to-br from-brand-600 to-accent-500 text-white"
                    : "bg-white text-ink-400 ring-1 ring-ink-200",
                )}
              >
                {n}
              </span>
              <span className="text-sm font-semibold text-ink-600">
                {n === 1 ? "Describe yourself" : "Confirm your DNA"}
              </span>
            </div>
          ))}
        </div>

        {step === 1 ? (
          <section className="card animate-in mt-6 p-7">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Tell us about yourself
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              Write it the way you would say it. The AI profile builder extracts your
              department, year, skills, interests and career goal — you can edit
              everything on the next step.
            </p>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              placeholder={EXAMPLE}
              className="mt-5 w-full resize-none rounded-2xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-400">Try:</span>
              <button
                onClick={() => setText(EXAMPLE)}
                className="cursor-pointer rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-brand-50 hover:text-brand-700"
              >
                Second-year CSE, learning Python, wants to be an ML engineer
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={runExtraction} disabled={parsing} className="px-6 py-3">
                {parsing ? "Analysing…" : "Build my Opportunity DNA"}
              </Button>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-ink-600 hover:text-ink-900"
              >
                Skip with demo profile
              </Link>
            </div>
          </section>
        ) : (
          <section className="card animate-in mt-6 p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
                  Confirm your Opportunity DNA
                </h1>
                <p className="mt-2 text-sm text-ink-600">
                  Extracted from your description. Adjust anything that looks wrong.
                </p>
              </div>
              <Badge tone="mint">AI extracted</Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Type your name"
                  className={inputClass}
                />
              </Field>
              <Field label="Department">
                <input
                  value={draft.department}
                  onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Year">
                <select
                  value={draft.year}
                  onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
                  className={inputClass}
                >
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <input
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Career goal" className="sm:col-span-2">
                <select
                  value={draft.careerGoal}
                  onChange={(e) =>
                    setDraft({ ...draft, careerGoal: e.target.value })
                  }
                  className={inputClass}
                >
                  {CAREER_GOALS.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Interests
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.interests.map((interest) => (
                  <span key={interest} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                    {interest}
                    <button onClick={() => setDraft({ ...draft, interests: draft.interests.filter((i) => i !== interest) })} className="ml-1 text-brand-400 hover:text-rose-500">✕</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && interestInput.trim()) {
                      e.preventDefault();
                      const val = interestInput.trim();
                      if (!draft.interests.includes(val)) setDraft({ ...draft, interests: [...draft.interests, val] });
                      setInterestInput("");
                    }
                  }}
                  placeholder="Type an interest and press Enter"
                  className={inputClass}
                />
                <Button variant="secondary" onClick={() => {
                  const val = interestInput.trim();
                  if (val && !draft.interests.includes(val)) setDraft({ ...draft, interests: [...draft.interests, val] });
                  setInterestInput("");
                }}>Add</Button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Preferred opportunity types
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {OPPORTUNITY_TYPES.map((type) => {
                  const active = draft.preferredTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          preferredTypes: toggle(
                            draft.preferredTypes,
                            type,
                          ) as OpportunityType[],
                        })
                      }
                      className={chipClass(active)}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Skill proficiency
              </p>
              <div className="mt-3 space-y-4">
                {draft.skills.map((skill, index) => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-800">{skill.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-brand-700">{skill.level}%</span>
                        <button onClick={() => setDraft({ ...draft, skills: draft.skills.filter((s) => s.name !== skill.name) })} className="text-xs text-ink-400 hover:text-rose-500">✕</button>
                      </div>
                    </div>
                    <input
                      type="range" min={0} max={100} value={skill.level}
                      onChange={(e) => {
                        const skills = [...draft.skills];
                        skills[index] = { ...skill, level: Number(e.target.value) };
                        setDraft({ ...draft, skills });
                      }}
                      className="mt-2 w-full accent-brand-600"
                    />
                    <ProgressBar value={skill.level} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && skillInput.trim()) {
                      e.preventDefault();
                      const val = skillInput.trim();
                      if (!draft.skills.some((s) => s.name === val)) setDraft({ ...draft, skills: [...draft.skills, { name: val, level: 50 }] });
                      setSkillInput("");
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className={inputClass}
                />
                <Button variant="secondary" onClick={() => {
                  const val = skillInput.trim();
                  if (val && !draft.skills.some((s) => s.name === val)) setDraft({ ...draft, skills: [...draft.skills, { name: val, level: 50 }] });
                  setSkillInput("");
                }}>Add</Button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
                Travel radius — {draft.travelRadiusKm} km
              </p>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={draft.travelRadiusKm}
                onChange={(e) =>
                  setDraft({ ...draft, travelRadiusKm: Number(e.target.value) })
                }
                className="mt-3 w-full accent-brand-600"
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={async () => {
                  setSaving(true);
                  setSaveError("");
                  const payload = {
                    name: draft.name,
                    department: draft.department,
                    year: draft.year,
                    location: draft.location,
                    career_goal: draft.careerGoal,
                    raw_intro: `${draft.name} - ${draft.department} year ${draft.year} - ${draft.careerGoal}`,
                    skills: draft.skills.map((s) => ({ name: s.name, proficiency: s.level })),
                    interests: draft.interests.map((i) => ({ name: i, weight: 50 })),
                  };
                  try {
                    // Check if profile exists first, then create or update accordingly
                    let exists = false;
                    try { await api.getProfile(); exists = true; } catch { exists = false; }
                    if (exists) {
                      await api.updateProfile(payload);
                    } else {
                      await api.createProfile(payload);
                    }
                    completeOnboarding(draft);
                    router.push("/dashboard");
                  } catch (err: unknown) {
                    setSaveError(err instanceof Error ? err.message : "Failed to save profile");
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-6 py-3"
              >
                {saving ? "Saving…" : "Save & see my feed"}
              </Button>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              {saveError && <p className="w-full text-sm text-rose-600">{saveError}</p>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

const chipClass = (active: boolean) =>
  cn(
    "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "bg-linear-to-r from-brand-600 to-accent-500 text-white"
      : "bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700",
  );

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      {children}
    </label>
  );
}
