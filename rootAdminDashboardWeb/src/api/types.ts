// ── Shared TypeScript types mirroring the backend Prisma schema ──────────────

export type UserRole =
  | 'CITIZEN'
  | 'UNIVERSITY_ADMIN'
  | 'GOVERNMENT_ADMIN'
  | 'SUPER_ADMIN';

export type ReportStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE';

export type ChallengeDomain =
  | 'EDUCATION'
  | 'HEALTHCARE'
  | 'AGRICULTURE'
  | 'WATER_RESOURCES'
  | 'ENVIRONMENT'
  | 'ENERGY'
  | 'URBAN_DEVELOPMENT'
  | 'ACCESSIBILITY'
  | 'PUBLIC_ADMINISTRATION'
  | 'RURAL_LIVELIHOODS'
  | 'OTHER';

export type PartnerType = 'STARTUP' | 'MSME' | 'CORPORATE' | 'CSR' | 'RESEARCH_LAB';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafeUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  cityId: string | null;
  universityId: string | null;
}

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface University {
  id: string;
  name: string;
  type: string | null;
  specializations: ChallengeDomain[];
  cityId: string;
  city?: City;
}

export interface IndustryPartner {
  id: string;
  name: string;
  type: PartnerType;
  domains: ChallengeDomain[];
  contactEmail: string | null;
}

export interface Authority {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  domains: ChallengeDomain[];
  isActive: boolean;
  cityId: string | null;
  universityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
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
  duplicates?: Report[];
  facultyMentor: string | null;
  teamNote: string | null;
  industryPartnerId: string | null;
  assignedAuthorityId: string | null;
  assignedAuthority?: Authority | null;
  assignedAt: string | null;
  resolutionEvidenceUrls: string[];
  feedbackRating: number | null;
  feedbackComment: string | null;
  cityId: string;
  universityId: string | null;
  reportedById: string;
  reportedBy?: SafeUser;
  statusEvents?: ReportStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportStatusEvent {
  id: string;
  reportId: string;
  status: ReportStatus;
  note: string | null;
  changedById: string;
  changedBy?: SafeUser;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalReports: number;
  openReports: number;
  pendingClassification: number;
  averageResolutionHours: number | null;
  universitiesEngaged: number;
  industryEngagedCount: number;
  byStatus: Record<ReportStatus, number>;
  byDomain: Record<ChallengeDomain, number>;
  bySeverity: Record<Severity, number>;
  byUniversity: Array<{ universityId: string; universityName: string; count: number }>;
}

export interface AuditEvent {
  id: string;
  reportId: string;
  status: ReportStatus;
  note: string | null;
  changedById: string;
  changedBy?: SafeUser;
  report?: { id: string; description: string; domain: ChallengeDomain | null; status: ReportStatus };
  createdAt: string;
}

export interface DuplicateCandidate {
  id: string;
  description: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  createdAt: string;
  distanceMeters?: number;
  similarityScore?: number;
}
