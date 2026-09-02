"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, ProgressBar, SectionTitle, cn } from "@/components/ui";
import { CAREER_GOALS, OPPORTUNITY_TYPES } from "@/lib/data";
import { buildOpportunityDna } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { OpportunityType, StudentProfile } from "@/lib/types";

export default function ProfilePage() {
  const { profile, activities, setProfile } = useStore();
  const [draft, setDraft] = useState<StudentProfile>(profile);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => setDraft(profile), [profile]);

  const dna = buildOpportunityDna(profile, activities);

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const save = async () => {
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
      let exists = false;
      try { await api.getProfile(); exists = true; } catch { exists = false; }
      if (exists) {
        await api.updateProfile(payload);
      } else {
        await api.createProfile(payload);
      }
      setProfile(draft);
      setSavedAt(Date.now());
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-7">
      <SectionTitle
        title="Your profile"
        subtitle="Everything the recommendation engine uses. You stay in control of it."
        action={
          <Link
            href="/onboarding"
            className="text-sm font-semibold text-brand-700 hover:text-brand-500"
          >
            Rebuild with AI →
          </Link>
        }
      />

      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
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
                onChange={(e) => setDraft({ ...draft, careerGoal: e.target.value })}
                className={inputClass}
              >
                {CAREER_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="About you" className="sm:col-span-2">
              <textarea
                rows={3}
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                className={cn(inputClass, "resize-none leading-relaxed")}
              />
            </Field>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">
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

          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">
            Preferred formats
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPPORTUNITY_TYPES.map((type) => (
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
                className={chip(draft.preferredTypes.includes(type))}
              >
                {type}
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">
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

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving} className="px-6">
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(profile)}>
              Discard changes
            </Button>
            {savedAt && !saveError && (
              <span className="text-sm font-semibold text-emerald-600">
                Saved — your feed has been re-ranked.
              </span>
            )}
            {saveError && (
              <span className="text-sm font-semibold text-rose-600">{saveError}</span>
            )}
          </div>
        </section>

        <aside className="space-y-7">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink-900">
                Skill proficiency
              </h2>
              <Badge tone="brand">{draft.skills.length} skills</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {draft.skills.map((skill, index) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-800">{skill.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-brand-700">{skill.level}%</span>
                      <button
                        onClick={() => setDraft({ ...draft, skills: draft.skills.filter((s) => s.name !== skill.name) })}
                        className="cursor-pointer text-xs font-semibold text-ink-400 hover:text-rose-500"
                      >✕</button>
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
            <div className="mt-5 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && skillInput.trim()) {
                    e.preventDefault();
                    const val = skillInput.trim();
                    if (!draft.skills.some((s) => s.name === val)) setDraft({ ...draft, skills: [...draft.skills, { name: val, level: 30 }] });
                    setSkillInput("");
                  }
                }}
                placeholder="Type a skill and press Enter"
                className={inputClass}
              />
              <Button variant="secondary" onClick={() => {
                const val = skillInput.trim();
                if (val && !draft.skills.some((s) => s.name === val)) setDraft({ ...draft, skills: [...draft.skills, { name: val, level: 30 }] });
                setSkillInput("");
              }}>Add</Button>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              Opportunity DNA (saved profile)
            </h2>
            <div className="mt-4 space-y-3">
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
          </section>
        </aside>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

const chip = (active: boolean) =>
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
