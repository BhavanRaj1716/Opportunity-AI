// @ts-ignore — no types for @xenova/transformers
import { pipeline } from '@xenova/transformers';
import { ExtractedProfile } from '../schemas/profile.schema.js';

// Singleton — model loads once on first call (~25 MB download, cached after)
let embedder: any = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

// Outputs 384-dim vector — DB column must be vector(384)
export async function generateEmbedding(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

// Rule-based extraction — parses the raw_intro text directly, no LLM needed
export async function extractProfile(rawIntro: string): Promise<ExtractedProfile> {
  const lower = rawIntro.toLowerCase();

  // Career goal: pick first matching keyword
  const goalMap: Record<string, string> = {
    'machine learning': 'Machine Learning Engineer',
    'data science': 'Data Scientist',
    'full stack': 'Full Stack Developer',
    'frontend': 'Frontend Developer',
    'backend': 'Backend Developer',
    'devops': 'DevOps Engineer',
    'cloud': 'Cloud Engineer',
    'cybersecurity': 'Cybersecurity Analyst',
    'product manager': 'Product Manager',
    'software engineer': 'Software Engineer',
    'web developer': 'Web Developer',
    'android': 'Android Developer',
    'ios': 'iOS Developer',
    'ai': 'AI Engineer',
  };
  let career_goal = 'Software Engineer';
  for (const [kw, goal] of Object.entries(goalMap)) {
    if (lower.includes(kw)) { career_goal = goal; break; }
  }

  // Skills: scan for known tech keywords
  const knownSkills = [
    'python','javascript','typescript','java','c++','c#','go','rust','kotlin','swift',
    'react','next.js','vue','angular','node.js','express','django','flask','fastapi',
    'sql','postgresql','mysql','mongodb','redis','firebase','supabase',
    'aws','gcp','azure','docker','kubernetes','git','linux',
    'machine learning','deep learning','tensorflow','pytorch','scikit-learn',
    'html','css','tailwind','figma','excel','r',
  ];
  const skills = knownSkills
    .filter((s) => lower.includes(s))
    .slice(0, 8)
    .map((name) => ({ name, proficiency: 60 }));

  // Interests: scan for domain keywords
  const knownInterests = [
    'ai','machine learning','data science','web development','mobile development',
    'cloud computing','cybersecurity','open source','competitive programming',
    'hackathons','research','entrepreneurship','design','gaming','robotics',
  ];
  const interests = knownInterests
    .filter((i) => lower.includes(i))
    .slice(0, 5)
    .map((name) => ({ name, weight: 70 }));

  return {
    career_goal,
    skills: skills.length ? skills : [{ name: 'Programming', proficiency: 50 }],
    interests: interests.length ? interests : [{ name: 'Technology', weight: 50 }],
  };
}

export function generateExplanation(
  profileSummary: string,
  opportunitySummary: string,
): string[] {
  return [
    `This opportunity aligns with your career goal based on your profile.`,
    `Your skills match the requirements of this opportunity.`,
    `This is a great chance to grow in your area of interest.`,
  ];
}
