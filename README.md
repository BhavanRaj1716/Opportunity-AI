# Opportunity AI

An AI-powered platform that helps students discover and match with opportunities (hackathons, workshops, competitions, internships) based on their profile, skills, and career goals.

## Live Demo

- **Frontend:** https://opportunity-ai-1.onrender.com
- **Backend:** https://opportunity-ai-13yb.onrender.com

## Tech Stack

### Frontend
- Next.js 15 (React 19)
- Tailwind CSS
- Supabase JS (auth)

### Backend
- Node.js + Express 5
- TypeScript
- `@xenova/transformers` — local embeddings (all-MiniLM-L6-v2)
- Zod — request validation

### Database
- Supabase (PostgreSQL)
- pgvector — vector similarity search

### Hosting
- Render (backend + frontend)

## Features

- **Authentication** — Supabase Auth (email/password)
- **Profile Creation** — free-text intro with auto skill + interest extraction
- **Semantic Embeddings** — 384-dim vectors generated locally using `all-MiniLM-L6-v2`
- **AI Recommendations** — pgvector cosine similarity + weighted scoring (skills, interests, career goal, location, deadline, activity history)
- **Skill Gap Analysis** — compares your skills against career track requirements
- **Why This?** — explanation bullets for each recommended opportunity
- **Activity Tracking** — viewed, saved, applied, dismissed
- **Copilot** — rule-based career assistant for roadmaps, skill gaps, deadlines and nearby events
- **Roadmap** — learn → practice → build path towards your career goal

## Project Structure

```
oppurtunity-parent/
├── o_AI/                  # Express backend
│   ├── src/
│   │   ├── config/        # Supabase client
│   │   ├── lib/           # Embeddings, scoring, db helpers
│   │   ├── middleware/    # Auth
│   │   ├── routes/        # API routes
│   │   └── schemas/       # Zod schemas
│   └── setup.sql          # Full database schema
└── opportunity-ai/        # Next.js frontend
    └── src/
        ├── app/           # Pages
        ├── components/    # UI components
        └── lib/           # API client, store, types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/profile` | Create profile |
| PUT | `/api/profile` | Update profile |
| GET | `/api/profile` | Get profile |
| POST | `/api/opportunities` | Create opportunity |
| GET | `/api/opportunities` | List opportunities |
| GET | `/api/recommendations` | Get recommendations |
| GET | `/api/skill-gap` | Get skill gap analysis |
| GET | `/api/explanations/:id` | Get match explanation |

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with pgvector enabled

### Setup

1. Clone the repo
```bash
git clone https://github.com/BhavanRaj1716/Opportunity-AI
cd Opportunity-AI
```

2. Install dependencies
```bash
cd o_AI && npm install
cd ../opportunity-ai && npm install
```

3. Set up environment variables

`o_AI/.env`
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=4000
```

`opportunity-ai/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

4. Run the database schema in your Supabase SQL editor
```
o_AI/setup.sql
```

5. Start both servers
```bash
cd ..
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
