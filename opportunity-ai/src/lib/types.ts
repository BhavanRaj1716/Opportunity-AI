export type OpportunityType =
  | "Hackathon"
  | "Workshop"
  | "Competition"
  | "Internship"
  | "Seminar"
  | "Bootcamp";

export type ActivityAction =
  | "VIEW"
  | "CLICK"
  | "SAVE"
  | "REGISTER"
  | "ATTEND"
  | "DISMISS";

export interface Opportunity {
  id: string;
  title: string;
  organizer: string;
  description: string;
  type: OpportunityType;
  location: string;
  isOnline: boolean;
  distanceKm: number;
  startDate: string;
  registrationDeadline: string;
  tags: string[];
  skills: string[];
  careerTracks: string[];
  departments: string[];
  image: string;
  prize?: string;
  seats?: number;
}

export interface SkillLevel {
  name: string;
  level: number;
}

export interface StudentProfile {
  name: string;
  department: string;
  year: number;
  location: string;
  careerGoal: string;
  skills: SkillLevel[];
  interests: string[];
  preferredTypes: OpportunityType[];
  travelRadiusKm: number;
  summary: string;
}

export interface Activity {
  id: string;
  opportunityId: string;
  action: ActivityAction;
  timestamp: number;
}

export interface ScoreBreakdown {
  label: string;
  score: number;
  max: number;
}

export interface Recommendation {
  opportunity: Opportunity;
  score: number;
  breakdown: ScoreBreakdown[];
  reasons: string[];
}

export interface SkillGap {
  name: string;
  current: number;
  required: number;
  gap: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}
