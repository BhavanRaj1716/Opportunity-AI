import { ALL_INTERESTS, CAREER_GOALS, CAREER_SKILL_MAP } from "./data";
import type { OpportunityType, SkillLevel, StudentProfile } from "./types";

const SKILL_ALIASES: Record<string, string[]> = {
  Python: ["python"],
  SQL: ["sql", "postgres", "mysql", "database"],
  DSA: ["dsa", "data structures", "algorithms", "competitive programming"],
  "Machine Learning": ["machine learning", " ml ", "ml.", "ml,", "scikit"],
  Statistics: ["statistics", "stats", "probability"],
  "Deep Learning": ["deep learning", "neural network", "pytorch", "tensorflow"],
  JavaScript: ["javascript", " js ", "typescript"],
  React: ["react", "next.js", "nextjs"],
  "Node.js": ["node", "express"],
  "UI/UX": ["ui/ux", "ui ", "ux", "design"],
  Figma: ["figma"],
  Linux: ["linux", "ubuntu", "bash"],
  Docker: ["docker", "container"],
  Kubernetes: ["kubernetes", "k8s"],
  AWS: ["aws", "azure", "gcp", "cloud"],
  "CI/CD": ["ci/cd", "jenkins", "github actions"],
  Networking: ["networking", "tcp", "network"],
  Cryptography: ["cryptography", "crypto", "encryption"],
  "Data Visualization": ["visualization", "tableau", "power bi", "charts"],
  Excel: ["excel", "spreadsheet"],
  "User Research": ["user research", "interviews"],
  "Design Systems": ["design system"],
  "Cloud Security": ["cloud security"],
  "Web Development": ["web development", "frontend", "html", "css"],
};

const INTEREST_ALIASES: Record<string, string[]> = {
  "Artificial Intelligence": ["ai", "artificial intelligence", "genai", "llm"],
  "Machine Learning": ["machine learning", "ml"],
  "Data Science": ["data science", "data analytics", "analytics"],
  "Web Development": ["web", "frontend", "full stack", "fullstack"],
  "Mobile Development": ["android", "ios", "flutter", "mobile"],
  Cybersecurity: ["security", "cyber", "hacking", "ctf"],
  "Cloud Computing": ["cloud", "devops", "aws", "kubernetes"],
  Robotics: ["robotics", "robot", "autonomous", "drone"],
  "UI/UX Design": ["ui/ux", "design", "figma"],
  "Product Management": ["product management", "product manager"],
  Blockchain: ["blockchain", "web3", "solidity"],
  IoT: ["iot", "embedded", "arduino", "raspberry"],
};

const GOAL_ALIASES: Record<string, string[]> = {
  "Machine Learning Engineer": ["ml engineer", "machine learning engineer", "ai engineer", "data scientist"],
  "Full Stack Developer": ["full stack", "fullstack", "web developer", "software developer"],
  "Data Analyst": ["data analyst", "business analyst", "analytics"],
  "Cybersecurity Analyst": ["security analyst", "cybersecurity", "penetration tester"],
  "Product Designer": ["product designer", "ux designer", "ui designer"],
  "Cloud / DevOps Engineer": ["devops", "cloud engineer", "sre", "site reliability"],
};

const DEPARTMENTS: Record<string, string[]> = {
  CSE: ["cse", "computer science"],
  ISE: ["ise", "information science"],
  AIML: ["aiml", "ai & ml", "ai and ml"],
  ECE: ["ece", "electronics"],
  EEE: ["eee", "electrical"],
  MECH: ["mech", "mechanical"],
  CIVIL: ["civil"],
  MBA: ["mba", "management"],
  DESIGN: ["design"],
  MATH: ["mathematics", "maths"],
};

const YEAR_WORDS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  final: 4,
};

const LOCATIONS = [
  "Bangalore",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
];

const TYPE_ALIASES: Record<OpportunityType, string[]> = {
  Hackathon: ["hackathon"],
  Workshop: ["workshop"],
  Competition: ["competition", "contest", "challenge"],
  Internship: ["internship", "intern"],
  Seminar: ["seminar", "talk"],
  Bootcamp: ["bootcamp"],
};

const matches = (haystack: string, needles: string[]) =>
  needles.some((needle) => haystack.includes(needle));

/**
 * Local stand-in for the LLM profile extraction endpoint
 * (`POST /api/profile/parse`) described in the project spec.
 */
export function parseProfile(
  text: string,
  fallback: StudentProfile,
): StudentProfile {
  const raw = ` ${text.toLowerCase()} `;

  const department =
    Object.entries(DEPARTMENTS).find(([, aliases]) => matches(raw, aliases))?.[0] ??
    fallback.department;

  let year = fallback.year;
  for (const [word, value] of Object.entries(YEAR_WORDS)) {
    if (raw.includes(`${word} year`) || raw.includes(`${word}-year`)) year = value;
  }

  const location =
    LOCATIONS.find((city) => raw.includes(city.toLowerCase())) ?? fallback.location;

  const careerGoal =
    Object.entries(GOAL_ALIASES).find(([, aliases]) => matches(raw, aliases))?.[0] ??
    fallback.careerGoal;

  const learning = /learning ([a-z+#.]+)/.exec(raw)?.[1];

  const detected: SkillLevel[] = [];
  for (const [skill, aliases] of Object.entries(SKILL_ALIASES)) {
    if (!matches(raw, aliases)) continue;
    const isLearning = learning
      ? aliases.some((alias) => alias.trim() === learning.trim())
      : false;
    const previous = fallback.skills.find((s) => s.name === skill)?.level;
    detected.push({
      name: skill,
      level: isLearning ? 35 : (previous ?? 60),
    });
  }

  // Always surface the skills that matter for the chosen career goal.
  for (const skill of Object.keys(CAREER_SKILL_MAP[careerGoal] ?? {})) {
    if (detected.some((s) => s.name === skill)) continue;
    detected.push({
      name: skill,
      level: fallback.skills.find((s) => s.name === skill)?.level ?? 15,
    });
  }

  const interests = ALL_INTERESTS.filter((interest) =>
    matches(raw, INTEREST_ALIASES[interest] ?? [interest.toLowerCase()]),
  );

  const preferredTypes = (
    Object.entries(TYPE_ALIASES) as [OpportunityType, string[]][]
  )
    .filter(([, aliases]) => matches(raw, aliases))
    .map(([type]) => type);

  return {
    ...fallback,
    department,
    year,
    location,
    careerGoal,
    skills: detected.sort((a, b) => b.level - a.level),
    interests: interests.length ? interests : fallback.interests,
    preferredTypes: preferredTypes.length ? preferredTypes : fallback.preferredTypes,
    summary: text.trim() || fallback.summary,
  };
}

export const SUGGESTED_GOALS = CAREER_GOALS;
