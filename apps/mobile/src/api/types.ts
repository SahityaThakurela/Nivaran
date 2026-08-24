export type SafeUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  cityId: string | null;
  universityId: string | null;
};

export type ReportStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "DUPLICATE";

export type ChallengeDomain =
  | "EDUCATION"
  | "HEALTHCARE"
  | "AGRICULTURE"
  | "WATER_RESOURCES"
  | "ENVIRONMENT"
  | "ENERGY"
  | "URBAN_DEVELOPMENT"
  | "ACCESSIBILITY"
  | "PUBLIC_ADMINISTRATION"
  | "RURAL_LIVELIHOODS"
  | "OTHER";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Authority = {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
};

export type Report = {
  id: string;
  description: string;
  photoUrls: string[];
  address: string | null;
  latitude: number;
  longitude: number;
  domain: ChallengeDomain | null;
  severity: Severity | null;
  aiSummary: string | null;
  aiConfidence: number | null;
  priorityScore: number;
  status: ReportStatus;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  resolutionEvidenceUrls?: string[];
  feedbackRating?: number | null;
  feedbackComment?: string | null;
  cityId: string;
  reportedById: string;
  universityId: string | null;
  facultyMentor?: string | null;
  teamNote?: string | null;
  industryPartnerId?: string | null;
  assignedAuthorityId?: string | null;
  assignedAuthority?: Authority | null;
  assignedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
