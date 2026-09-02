// This file goes in the FRONTEND (Next.js) repo, e.g. at lib/api.ts
// It is NOT part of the backend project — hand this to your friend.
//
// Assumes the frontend already has a Supabase client set up (same project
// as the backend). Adjust the import path below to match where that lives.

import { supabase } from './supabaseClient'; // <-- adjust path to your actual client

const API_URL = process.env.NEXT_PUBLIC_API_URL; // set in .env.local, e.g. http://localhost:4000

async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not logged in — no Supabase session found.');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---- Convenience wrappers for each backend endpoint ----

export const api = {
  health: () => fetch(`${API_URL}/health`).then((r) => r.json()), // no auth needed

  getProfile: () => apiFetch('/api/profile'),
  createProfile: (data: {
    name: string;
    department?: string;
    year?: number;
    location?: string;
    career_goal?: string;
    raw_intro?: string;
    skills?: { name: string; proficiency: number }[];
    interests?: { name: string; weight: number }[];
  }) => apiFetch('/api/profile', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data: {
    name: string;
    department?: string;
    year?: number;
    location?: string;
    career_goal?: string;
    raw_intro?: string;
    skills?: { name: string; proficiency: number }[];
    interests?: { name: string; weight: number }[];
  }) => apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),

  listOpportunities: () => apiFetch('/api/opportunities'),
  createOpportunity: (data: Record<string, unknown>) =>
    apiFetch('/api/opportunities', { method: 'POST', body: JSON.stringify(data) }),

  getRecommendations: () => apiFetch('/api/recommendations'),

  getSkillGap: () => apiFetch('/api/skill-gap'),

  getExplanation: (opportunityId: string) =>
    apiFetch(`/api/explanations/${opportunityId}`),
};
