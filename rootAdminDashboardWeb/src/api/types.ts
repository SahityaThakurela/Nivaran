// ── Shared TypeScript types mirroring the backend Prisma schema ──────────────

export type UserRole =
  | 'CITIZEN'
  | 'FIELD_WORKER'
  | 'DEPARTMENT_OPERATOR'
  | 'MUNICIPAL_ADMIN'
  | 'SUPER_ADMIN';

export type ReportStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE';

export type ReportCategory =
  | 'ROADS'
  | 'SANITATION'
  | 'WATER_SUPPLY'
  | 'ELECTRICITY'
  | 'DRAINAGE'
  | 'STREETLIGHT'
  | 'PUBLIC_SAFETY'
  | 'PARKS_AND_TREES'
  | 'STRAY_ANIMALS'
  | 'OTHER';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafeUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  cityId: string | null;
  departmentId: string | null;
}

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface Department {
  id: string;
  name: string;
  category: ReportCategory;
  cityId: string;
}

export interface Report {
  id: string;
  description: string;
  photoUrls: string[];
  address: string | null;
  latitude: number;
  longitude: number;
  category: ReportCategory | null;
  severity: Severity | null;
  aiSummary: string | null;
  aiConfidence: number | null;
  priorityScore: number;
  status: ReportStatus;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  duplicates?: Report[];
  resolutionEvidenceUrls: string[];
  feedbackRating: number | null;
  feedbackComment: string | null;
  cityId: string;
  departmentId: string | null;
  reportedById: string;
  reportedBy?: SafeUser;
  assignedToId: string | null;
  assignedTo?: SafeUser;
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
  byStatus: Record<ReportStatus, number>;
  byCategory: Record<ReportCategory, number>;
  bySeverity: Record<Severity, number>;
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
