import type { CivicReport, CivicReportMeta, ReportStatus } from '../types/report';

/**
 * Storage layout
 * ─────────────────────────────────────────────────────────────────
 * REPORTS_KEY  → JSON array of CivicReport objects WITHOUT imageDataUrl
 *                (the image is large base64 and blows the 5 MB quota)
 * IMAGE_PREFIX + reportId → individual image data-URLs, one key each
 *
 * This keeps the report metadata lean (~2 KB each) while still
 * allowing the image to be retrieved by ID when the user views a
 * specific report.
 * ─────────────────────────────────────────────────────────────────
 */
const REPORTS_KEY = 'citypulse_civic_reports_v1';
const IMAGE_PREFIX = 'citypulse_report_img_';

/** Custom event name for same-tab report changes. */
export const REPORT_SAVED_EVENT = 'citypulse:report-saved';

// ─── ID generator ────────────────────────────────────────────────
function generateReportId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CP-${ts}-${rnd}`;
}

// ─── Metadata storage (no images) ────────────────────────────────
function loadMetadata(): CivicReportMeta[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMetadata(reports: CivicReportMeta[]): boolean {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    return true;
  } catch {
    console.warn('[ReportService] Could not persist report metadata (quota?).');
    return false;
  }
}

// ─── Image storage (best-effort, never blocks save) ───────────────
function saveImage(reportId: string, dataUrl: string): void {
  try {
    localStorage.setItem(IMAGE_PREFIX + reportId, dataUrl);
  } catch {
    // Image is large; silently drop it if quota is exceeded.
    // The report metadata is already saved; markers will still render.
  }
}

export function getReportImage(reportId: string): string | null {
  try {
    return localStorage.getItem(IMAGE_PREFIX + reportId);
  } catch {
    return null;
  }
}

function deleteImage(reportId: string): void {
  try {
    localStorage.removeItem(IMAGE_PREFIX + reportId);
  } catch { /* ignore */ }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Returns all saved reports. The returned objects do NOT include
 * imageDataUrl — use getReportImage(id) to retrieve it separately.
 */
export function getReports(): CivicReportMeta[] {
  return loadMetadata();
}

export function getReportById(id: string): CivicReportMeta | undefined {
  return loadMetadata().find((r) => r.id === id);
}

/**
 * Saves a new report and dispatches REPORT_SAVED_EVENT so that any
 * mounted MapView can update immediately (same-tab).
 *
 * Returns the saved report metadata (without imageDataUrl).
 * The caller can still use imageDataUrl for in-session display.
 */
export function saveReport(
  report: Omit<CivicReport, 'id' | 'status' | 'submittedAt' | 'updatedAt'>,
): CivicReportMeta {
  const now = new Date().toISOString();
  const { imageDataUrl, ...metadata } = report as CivicReport;

  const newReport: CivicReportMeta = {
    ...metadata,
    id: generateReportId(),
    status: 'NEW',
    submittedAt: now,
    updatedAt: now,
  };

  // Persist metadata (always small — no image)
  const all = loadMetadata();
  all.unshift(newReport);
  saveMetadata(all);

  // Persist image separately (best-effort — large, may exceed quota)
  if (imageDataUrl) {
    saveImage(newReport.id, imageDataUrl);
  }

  // Notify same-tab listeners with the new report embedded in the event
  // so components can update immediately without re-reading localStorage.
  try {
    window.dispatchEvent(
      new CustomEvent<CivicReportMeta>(REPORT_SAVED_EVENT, { detail: newReport }),
    );
  } catch { /* non-browser env */ }

  return newReport;
}

export function updateReportStatus(id: string, status: ReportStatus): CivicReportMeta | null {
  const all = loadMetadata();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
  saveMetadata(all);
  return all[idx];
}

export function deleteReport(id: string): boolean {
  const all = loadMetadata();
  const filtered = all.filter((r) => r.id !== id);
  if (filtered.length === all.length) return false;
  saveMetadata(filtered);
  deleteImage(id);
  return true;
}
