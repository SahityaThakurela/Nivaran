export type SafeUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  cityId: string | null;
  departmentId: string | null;
};

export type ReportStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "DUPLICATE";

export type ReportCategory =
  | "ROADS"
  | "SANITATION"
  | "WATER_SUPPLY"
  | "ELECTRICITY"
  | "DRAINAGE"
  | "STREETLIGHT"
  | "PUBLIC_SAFETY"
  | "PARKS_AND_TREES"
  | "STRAY_ANIMALS"
  | "OTHER";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Report = {
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
  cityId: string;
  reportedById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
};
