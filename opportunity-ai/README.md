# OpportunityAI — Frontend (Next.js)

AI-powered personalized event & career opportunity discovery for students.
This repository contains the **web frontend** described in the OpportunityAI
spec: Opportunity DNA, an explainable hybrid recommendation feed, skill-gap
intelligence, a career roadmap and the AI Opportunity Copilot.

Everything runs **fully offline with mock data** — no backend, database or API
key is required — so you can open it in VS Code and run it immediately.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

Requirements: Node.js 18.18+ (Node 20 recommended).

## Screens

| Route | What it shows |
| --- | --- |
| `/` | Landing page — value proposition, features, comparison table |
| `/onboarding` | AI Profile Builder: natural language → structured Opportunity DNA (editable) |
| `/dashboard` | Personalized feed with match scores, DNA panel, skill gaps, stats |
| `/opportunities` | All opportunities with search, type filters, online/nearby filters, sorting |
| `/opportunities/[id]` | Detail page with "Why this?" and the full 100-point score breakdown |
| `/skill-gaps` | Current skills vs target role + gap-closing opportunities |
| `/roadmap` | Learn → Practice → Build → Prove career roadmap |
| `/copilot` | AI Opportunity Copilot chat |
| `/saved` | Saved / registered / dismissed items and the raw activity feed |
| `/profile` | Edit every signal the recommendation engine uses |

## Project structure

```
src/
  app/
    page.tsx                     landing page
    onboarding/page.tsx          AI profile builder
    (app)/                       authenticated app shell (sidebar + header)
      dashboard/                 personalized feed
      opportunities/             list + [id] detail
      skill-gaps/  roadmap/  copilot/  saved/  profile/
  components/
    app-shell.tsx                sidebar + top bar layout
    opportunity-card.tsx         match ring, "Why this?", feedback actions
    ui.tsx                       buttons, badges, progress bars, match ring, stats
  lib/
    data.ts                      mock opportunities, skills, career→skill map
    recommend.ts                 hybrid scoring engine, DNA, skill gaps, roadmap
    profile-parser.ts            natural-language → structured profile extraction
    copilot.ts                   copilot answer generation
    store.tsx                    React context state, persisted to localStorage
    types.ts                     shared types
```

## How the recommendation score works

`src/lib/recommend.ts` implements the hybrid model from the spec, out of 100:

| Signal | Weight |
| --- | --- |
| Career goal relevance | 25 |
| Skill match | 20 |
| Interest match | 15 |
| Department relevance | 10 |
| Previous activity (behaviour) | 10 |
| Location | 5 |
| Event preference | 5 |
| Deadline urgency | 5 |
| Semantic similarity | 5 |

Semantic similarity uses a bag-of-words cosine as a stand-in for embeddings.
Behaviour weights come from `VIEW / CLICK / SAVE / REGISTER / ATTEND / DISMISS`
events, so the feed re-ranks as you interact with it.

## Connecting a real backend

The mock layer is deliberately isolated so it can be swapped for the REST API in
the spec:

| Spec endpoint | Replace this |
| --- | --- |
| `POST /api/profile/parse` | `parseProfile()` in `src/lib/profile-parser.ts` |
| `GET /api/recommendations` | `getRecommendations()` in `src/lib/recommend.ts` |
| `GET /api/opportunities` | `OPPORTUNITIES` in `src/lib/data.ts` |
| `GET /api/skill-gaps` | `getSkillGaps()` in `src/lib/recommend.ts` |
| `POST /api/activity` | `track()` in `src/lib/store.tsx` |
| `POST /api/copilot` | `askCopilot()` in `src/lib/copilot.ts` |

## Design

- Fonts: **Plus Jakarta Sans** (display) + **Inter** (body) via `next/font`.
- Palette: indigo → violet brand gradient, emerald accents, `ink` neutral scale
  (defined as Tailwind v4 theme tokens in `src/app/globals.css`).
- Fully responsive: the sidebar collapses to a drawer below `lg`.

## Demo flow (2–3 minutes)

1. `/onboarding` → paste the sample description → **Build my Opportunity DNA**.
2. Confirm the extracted profile → **Save & see my feed**.
3. `/dashboard` → top match with "Why this?" reasons.
4. Open the top card → full score breakdown.
5. `/skill-gaps` → gaps vs target role and gap-closing events.
6. `/copilot` → "What should I do in the next 3 months?".
7. Save / register on a card → `/saved` shows the recorded activity and the feed re-ranks.

State is stored in `localStorage`; **Reset demo data** on `/saved` clears it.
