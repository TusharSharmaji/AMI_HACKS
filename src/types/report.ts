export type IssueType =
  | 'pothole'
  | 'garbage'
  | 'broken_streetlight'
  | 'water_leakage'
  | 'sewage'
  | 'damaged_road'
  | 'fallen_tree'
  | 'flooding'
  | 'traffic_signal'
  | 'illegal_dumping'
  | 'other';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';

export type InfrastructureCategory =
  | 'Road'
  | 'Electrical'
  | 'Water'
  | 'Sewerage'
  | 'Parks'
  | 'Traffic'
  | 'Sanitation'
  | 'General';

export interface AiAnalysisResult {
  issueType: IssueType;
  severity: IssueSeverity;
  infrastructure: InfrastructureCategory;
  description: string;
  confidence: number; // 0–1
  department: string;
  recommendedAction: string;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/** Full report as submitted — includes the base64 image for in-session display. */
export interface CivicReport {
  id: string;
  status: ReportStatus;
  issueType: IssueType;
  severity: IssueSeverity;
  infrastructure: InfrastructureCategory;
  description: string;
  department: string;
  recommendedAction: string;
  aiConfidence: number;
  location: ReportLocation;
  imageDataUrl: string; // base64 data URL — NOT stored in localStorage
  submittedAt: string;  // ISO string
  updatedAt: string;    // ISO string
  notes?: string;
}

/** Persisted report — everything except the large base64 image. */
export type CivicReportMeta = Omit<CivicReport, 'imageDataUrl'>;

// Department mapping matching prompt requirements exactly
export const ISSUE_DEPARTMENTS: Record<IssueType, string> = {
  pothole: 'Roads/Public Works',
  damaged_road: 'Roads/Public Works',
  garbage: 'Sanitation',
  illegal_dumping: 'Sanitation',
  broken_streetlight: 'Electrical',
  water_leakage: 'Water/Sewerage',
  sewage: 'Water/Sewerage',
  flooding: 'Water/Sewerage',
  fallen_tree: 'Parks/Emergency',
  traffic_signal: 'Traffic',
  other: 'General Civic Services',
};

// Human-readable labels
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  broken_streetlight: 'Broken Streetlight',
  water_leakage: 'Water Leakage',
  sewage: 'Sewage',
  damaged_road: 'Damaged Road',
  fallen_tree: 'Fallen Tree',
  flooding: 'Flooding',
  traffic_signal: 'Traffic Signal',
  illegal_dumping: 'Illegal Dumping',
  other: 'Other Civic Issue',
};

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  Low: '#10b981',       // Green
  Medium: '#eab308',    // Yellow
  High: '#f97316',      // Orange
  Critical: '#ef4444',  // Red
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
};

export const WORKFLOW_STAGES: ReportStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
