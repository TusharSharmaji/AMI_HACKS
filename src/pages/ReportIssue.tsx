import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Upload, MapPin, Cpu, ClipboardCheck, CheckCircle2,
  AlertTriangle, Loader2, X, ChevronRight, ChevronLeft,
  RotateCcw, Navigation, Edit3, Wifi, Shield, Map as MapIcon
} from 'lucide-react';
import type { AiAnalysisResult, ReportLocation, IssueType, IssueSeverity, InfrastructureCategory } from '../types/report';
import {
  ISSUE_TYPE_LABELS, SEVERITY_COLORS, ISSUE_DEPARTMENTS,
  STATUS_LABELS
} from '../types/report';
import { analyzeIssueImage } from '../services/geminiService';
import { saveReport } from '../services/reportService';
import { useLocation } from '../hooks/useLocation';
import { MapLocationPicker } from '../components/report/MapLocationPicker';

// ─── Step Definition ──────────────────────────────────────────────────────────
type Step = 'photo' | 'location' | 'analysis' | 'review' | 'submitted';
const STEPS: Step[] = ['photo', 'location', 'analysis', 'review', 'submitted'];

const STEP_META: Record<Step, { label: string; icon: React.ReactNode }> = {
  photo:     { label: 'Photo',    icon: <Camera className="w-4 h-4" /> },
  location:  { label: 'Location', icon: <MapPin className="w-4 h-4" /> },
  analysis:  { label: 'AI Review',icon: <Cpu className="w-4 h-4" /> },
  review:    { label: 'Review',   icon: <ClipboardCheck className="w-4 h-4" /> },
  submitted: { label: 'Done',     icon: <CheckCircle2 className="w-4 h-4" /> },
};

const ISSUE_TYPE_OPTIONS: IssueType[] = [
  'pothole', 'damaged_road', 'garbage', 'illegal_dumping',
  'broken_streetlight', 'water_leakage', 'sewage', 'fallen_tree',
  'flooding', 'traffic_signal', 'other',
];

const SEVERITY_OPTIONS: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

const INFRASTRUCTURE_OPTIONS: InfrastructureCategory[] = [
  'Road', 'Electrical', 'Water', 'Sewerage', 'Parks', 'Traffic', 'Sanitation', 'General',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function severityBadge(s: IssueSeverity) {
  const color = SEVERITY_COLORS[s];
  const bg = {
    Low: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    Medium: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    High: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    Critical: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  }[s];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${bg}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {s}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ReportIssue: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLocation, moveToCoordinates } = useLocation();

  const [step, setStep] = useState<Step>('photo');

  // Photo state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location state
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<'map' | 'gps' | 'manual'>('map');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // AI Analysis state
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<AiAnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Submission state
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Camera ──────────────────────────────────────────────────────────────────

  // Attach stream to <video> element once it is in the DOM.
  // React renders the <video> only when cameraActive=true, so we cannot set
  // srcObject inside startCamera (the ref is null at that point).
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      // Ensure playback starts (some browsers need an explicit play() call)
      videoRef.current.play().catch(() => {
        // autoPlay attribute handles most cases; ignore the play() rejection
      });
    }
  }, [cameraActive]);

  // Stop camera tracks whenever we leave the photo step
  useEffect(() => {
    if (step !== 'photo' && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  }, [step]);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPhotoError('Camera API is not supported in this browser. Please use photo upload instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      // cameraActive=true triggers the useEffect above which wires srcObject
      setCameraActive(true);
      setPhotoError(null);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      const msg = err instanceof Error ? err.message : String(err);
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.toLowerCase().includes('denied')) {
        setPhotoError('Camera permission denied. Please allow camera access in your browser settings, then try again. You can also upload a photo instead.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPhotoError('No camera found on this device. Please upload a photo instead.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setPhotoError('Camera is already in use by another application. Please close it and try again.');
      } else {
        setPhotoError('Could not start camera: ' + msg + '. Please upload a photo instead.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImageDataUrl(dataUrl);
    stopCamera();
    setPhotoError(null);
  }, [stopCamera]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Invalid image format. Please upload a JPEG or PNG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image is too large (maximum 10MB). Please choose a smaller photo.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      setPhotoError(null);
      stopCamera();
    } catch {
      setPhotoError('Failed to read image file. Please try another image.');
    }
  }, [stopCamera]);

  // ── Location ────────────────────────────────────────────────────────────────
  const getGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        setManualLat(coords.latitude.toFixed(6));
        setManualLng(coords.longitude.toFixed(6));
        setLocationLoading(false);
        setLocationError(null);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) {
          setLocationError('GPS permission denied. Please allow location access or pick on the map below.');
        } else if (err.code === 2) {
          setLocationError('Position unavailable. Please pick location on the map below.');
        } else {
          setLocationError('GPS request timed out. Please try again or pick on the map.');
        }
      },
      { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }, []);

  const handleManualApply = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setLocationError('Invalid latitude. Must be between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setLocationError('Invalid longitude. Must be between -180 and 180.');
      return;
    }
    setLocation({ latitude: lat, longitude: lng });
    setLocationError(null);
  }, [manualLat, manualLng]);

  // ── AI Analysis ─────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!imageDataUrl) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setEditedAnalysis(null);
    setIsEditing(false);
    try {
      const result = await analyzeIssueImage(imageDataUrl);
      setAnalysis(result);
      setEditedAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI analysis failed.';
      setAnalysisError(msg);
    } finally {
      setAnalysisLoading(false);
    }
  }, [imageDataUrl]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const finalData = editedAnalysis || analysis;
    if (!finalData || !location || !imageDataUrl) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const report = saveReport({
        issueType: finalData.issueType,
        severity: finalData.severity,
        infrastructure: finalData.infrastructure,
        description: finalData.description,
        department: finalData.department,
        recommendedAction: finalData.recommendedAction,
        aiConfidence: finalData.confidence,
        location,
        imageDataUrl,
      });
      setSubmittedId(report.id);
      setStep('submitted');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save report.');
    } finally {
      setSubmitting(false);
    }
  }, [editedAnalysis, analysis, location, imageDataUrl]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      const next = STEPS[idx + 1];
      if (next === 'analysis' && imageDataUrl && !analysis) {
        setStep('analysis');
        setTimeout(runAnalysis, 50);
        return;
      }
      setStep(next);
    }
  }, [step, imageDataUrl, analysis, runAnalysis]);

  const goBack = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }, [step]);

  const resetAll = useCallback(() => {
    setStep('photo');
    setImageDataUrl(null);
    setPhotoError(null);
    stopCamera();
    setLocation(null);
    setLocationError(null);
    setManualLat('');
    setManualLng('');
    setAnalysis(null);
    setEditedAnalysis(null);
    setAnalysisError(null);
    setIsEditing(false);
    setSubmittedId(null);
    setSubmitError(null);
  }, [stopCamera]);

  const handleViewOnMap = useCallback(() => {
    if (location) {
      moveToCoordinates(location.latitude, location.longitude, 15);
    }
    navigate('/');
  }, [location, moveToCoordinates, navigate]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full overflow-y-auto bg-[#07090e] font-mono text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-hud">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Citizen Report Issue</h1>
              <p className="text-xs text-slate-400 font-sans">AI Vision Analysis · Geotagged · Municipal-Ready Workflow</p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 text-[11px] text-amber-300 font-sans">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Internal Civic Reporting: Reports are saved securely in your browser session and plotted on the CityPulse map. Official municipal dispatch integration is in staging.
            </span>
          </div>
        </div>

        {/* ── Step Progress Indicator ── */}
        {step !== 'submitted' && (
          <div className="flex items-center mb-8 px-1">
            {STEPS.filter((s) => s !== 'submitted').map((s, i) => {
              const isActive = s === step;
              const isDone = STEPS.indexOf(step) > i;
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs
                      ${isDone
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : isActive
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-hud'
                        : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : STEP_META[s].icon}
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider
                      ${isDone ? 'text-emerald-400' : isActive ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}
                    >
                      {STEP_META[s].label}
                    </span>
                  </div>
                  {i < STEPS.filter((st) => st !== 'submitted').length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 -mt-4 transition-all
                      ${isDone ? 'bg-emerald-500/40' : 'bg-white/10'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 1 — PHOTO
        ════════════════════════════════════════════════════════════ */}
        {step === 'photo' && (
          <StepCard title="Step 1: Upload or Capture Photo" icon={<Camera className="w-5 h-5 text-cyan-400" />}>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Provide a clear image of the issue (pothole, garbage, streetlight, water leak, etc.). Gemini AI will analyze the infrastructure failure.
            </p>

            {/* Photo preview */}
            {imageDataUrl && !cameraActive && (
              <div className="relative mb-4 rounded-xl overflow-hidden border border-cyan-500/30 shadow-panel">
                <img src={imageDataUrl} alt="Captured issue" className="w-full max-h-72 object-cover" />
                <button
                  onClick={() => { setImageDataUrl(null); setPhotoError(null); }}
                  className="absolute top-2.5 right-2.5 bg-black/75 hover:bg-black text-white p-2 rounded-full backdrop-blur-md transition-colors"
                  title="Remove and retake"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[10px] text-cyan-300">
                  Ready for AI analysis
                </div>
              </div>
            )}

            {/* Live Camera Viewfinder */}
            {cameraActive && (
              <div className="relative mb-4 rounded-xl overflow-hidden border border-cyan-500/50 bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-72 object-cover bg-black" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                  <button
                    onClick={capturePhoto}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Camera className="w-4 h-4" /> Snap Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs border border-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons if no photo */}
            {!imageDataUrl && !cameraActive && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-2.5 py-6 px-4 rounded-xl border border-white/10 hover:border-cyan-500/50 bg-white/3 hover:bg-cyan-500/10 transition-all text-slate-300 hover:text-cyan-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Camera className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-xs font-semibold">Take Photo</span>
                  <span className="text-[10px] text-slate-500">Device Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 py-6 px-4 rounded-xl border border-white/10 hover:border-violet-500/50 bg-white/3 hover:bg-violet-500/10 transition-all text-slate-300 hover:text-violet-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-violet-400" />
                  </div>
                  <span className="text-xs font-semibold">Upload Photo</span>
                  <span className="text-[10px] text-slate-500">JPEG, PNG, WebP</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {photoError && <ErrorBox message={photoError} />}

            <NavButtons
              onNext={goNext}
              nextDisabled={!imageDataUrl}
              showBack={false}
              nextLabel="Continue to Location →"
            />
          </StepCard>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 2 — LOCATION
        ════════════════════════════════════════════════════════════ */}
        {step === 'location' && (
          <StepCard title="Step 2: Georeference Location" icon={<MapPin className="w-5 h-5 text-emerald-400" />}>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Set the exact geographic coordinates. Use your current device GPS, pick on the interactive map, or enter manually.
            </p>

            {/* Mode Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLocationMode('map')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  locationMode === 'map'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-hud'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Pick on Map
              </button>

              <button
                onClick={() => {
                  setLocationMode('gps');
                  getGpsLocation();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  locationMode === 'gps'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-hud'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" /> Use My GPS
              </button>

              <button
                onClick={() => setLocationMode('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  locationMode === 'manual'
                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-hud'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Manual
              </button>
            </div>

            {/* Map Picker View */}
            {locationMode === 'map' && (
              <div className="space-y-3 mb-4">
                <MapLocationPicker
                  location={location}
                  onSelectLocation={(loc) => {
                    setLocation(loc);
                    setManualLat(loc.latitude.toFixed(6));
                    setManualLng(loc.longitude.toFixed(6));
                    setLocationError(null);
                  }}
                  defaultCenter={[selectedLocation.longitude, selectedLocation.latitude]}
                />
              </div>
            )}

            {/* GPS Trigger View */}
            {locationMode === 'gps' && (
              <div className="space-y-3 mb-4">
                <button
                  onClick={getGpsLocation}
                  disabled={locationLoading}
                  className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      Acquiring GPS fix (high accuracy)…
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      Re-acquire Current GPS Coordinates
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Manual Lat/Lng Inputs */}
            {locationMode === 'manual' && (
              <div className="space-y-3 mb-4 bg-white/3 border border-white/10 rounded-xl p-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Latitude (-90 to 90)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 26.912433"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Longitude (-180 to 180)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 75.787270"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleManualApply}
                  disabled={!manualLat || !manualLng}
                  className="w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all disabled:opacity-40"
                >
                  Apply Coordinates
                </button>
              </div>
            )}

            {/* Coordinates Display Badge */}
            {location && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Selected Coordinates</div>
                    <div className="text-xs font-bold text-emerald-300 tracking-wider">
                      LAT: {location.latitude.toFixed(6)} | LNG: {location.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-sans">Geotagged</span>
              </div>
            )}

            {locationError && <ErrorBox message={locationError} />}

            <NavButtons
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!location}
              nextLabel="Run AI Analysis →"
            />
          </StepCard>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 3 — AI ANALYSIS
        ════════════════════════════════════════════════════════════ */}
        {step === 'analysis' && (
          <StepCard title="Step 3: AI Vision Analysis" icon={<Cpu className="w-5 h-5 text-violet-400" />}>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Gemini Vision classifies the urban infrastructure issue. Review the structured output and edit any field before submission.
            </p>

            {analysisLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white/2 rounded-xl border border-white/5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                  <Cpu className="w-5 h-5 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-violet-300">Analyzing Photo with Gemini Vision…</p>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Detecting issue taxonomy, severity, and civic department</p>
                </div>
              </div>
            )}

            {analysisError && !analysisLoading && (
              <div className="space-y-4">
                <ErrorBox message={analysisError} />
                <div className="flex gap-2">
                  <button
                    onClick={runAnalysis}
                    className="flex-1 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Gemini Analysis
                  </button>
                  <button
                    onClick={() => {
                      setEditedAnalysis({
                        issueType: 'other',
                        severity: 'Medium',
                        infrastructure: 'General',
                        description: '',
                        confidence: 0,
                        department: ISSUE_DEPARTMENTS['other'],
                        recommendedAction: '',
                      });
                      setIsEditing(true);
                      setAnalysisError(null);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Fill Manually
                  </button>
                </div>
              </div>
            )}

            {editedAnalysis && !analysisLoading && (
              <div className="space-y-4">
                <div className="bg-violet-950/20 border border-violet-500/30 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-violet-400 uppercase font-bold tracking-wider">AI Analysis</span>
                      <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                        {Math.round(editedAnalysis.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isEditing ? 'Done Editing' : 'Edit Analysis'}
                    </button>
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Issue Type</span>
                        <span className="font-bold text-white uppercase">{ISSUE_TYPE_LABELS[editedAnalysis.issueType]}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Severity</span>
                        {severityBadge(editedAnalysis.severity)}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Infrastructure</span>
                        <span className="font-semibold text-slate-300">{editedAnalysis.infrastructure}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Responsible Department</span>
                        <span className="font-semibold text-cyan-300 text-right">{editedAnalysis.department}</span>
                      </div>

                      <div className="pt-1 border-t border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase block mb-1">Description</span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans bg-black/30 p-2.5 rounded-lg border border-white/5">
                          {editedAnalysis.description || 'No description provided.'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block mb-1">Recommended Action</span>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans bg-black/30 p-2.5 rounded-lg border border-white/5">
                          {editedAnalysis.recommendedAction || 'Inspection and routine dispatch.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <EditAnalysisForm value={editedAnalysis} onChange={setEditedAnalysis} />
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans">
                  <Wifi className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  Structured output verified. You may adjust classifications before proceeding to review.
                </div>
              </div>
            )}

            {!analysisLoading && !analysis && !analysisError && (
              <button
                onClick={runAnalysis}
                className="w-full py-3 rounded-xl bg-violet-600/30 hover:bg-violet-600/40 border border-violet-500/50 text-violet-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Cpu className="w-4 h-4 text-violet-400" /> Start AI Vision Classification
              </button>
            )}

            <NavButtons
              onBack={goBack}
              onNext={goNext}
              nextDisabled={!editedAnalysis || analysisLoading}
              nextLabel="Review & Submit →"
            />
          </StepCard>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 4 — REVIEW
        ════════════════════════════════════════════════════════════ */}
        {step === 'review' && editedAnalysis && location && (
          <StepCard title="Step 4: Review Civic Incident" icon={<ClipboardCheck className="w-5 h-5 text-amber-400" />}>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Verify all report attributes. Submitting will register the report with initial status <strong>NEW</strong> and plot a georeferenced marker on the CityPulse map.
            </p>

            {imageDataUrl && (
              <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 max-h-48">
                <img src={imageDataUrl} alt="Report review" className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2">
                  {severityBadge(editedAnalysis.severity)}
                </div>
              </div>
            )}

            <div className="bg-white/3 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs mb-4">
              <ReviewRow label="Issue Type" value={ISSUE_TYPE_LABELS[editedAnalysis.issueType]} />
              <ReviewRow label="Severity" value={severityBadge(editedAnalysis.severity)} />
              <ReviewRow label="Department" value={editedAnalysis.department} />
              <ReviewRow label="Infrastructure" value={editedAnalysis.infrastructure} />
              <ReviewRow
                label="Coordinates"
                value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
              />
              <ReviewRow
                label="Initial Status"
                value={<span className="text-emerald-400 font-bold bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px]">NEW</span>}
              />
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Description</span>
                <p className="text-slate-200 font-sans text-xs leading-relaxed">{editedAnalysis.description}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Recommended Action</span>
                <p className="text-slate-200 font-sans text-xs leading-relaxed">{editedAnalysis.recommendedAction}</p>
              </div>
            </div>

            {submitError && <ErrorBox message={submitError} />}

            <div className="flex gap-3 mt-6">
              <button
                onClick={goBack}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-hud transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering Report…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Submit Report
                  </>
                )}
              </button>
            </div>
          </StepCard>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 5 — SUBMITTED
        ════════════════════════════════════════════════════════════ */}
        {step === 'submitted' && submittedId && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-hud">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Report Successfully Registered</h2>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Your civic incident has been logged, geotagged, and stored locally.
              </p>
            </div>

            {/* Ticket Card */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-5 text-left space-y-3.5 shadow-panel">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Report ID</span>
                  <div className="text-base font-bold text-cyan-400 font-mono tracking-wider">{submittedId}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Status</span>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full mt-0.5">
                    {STATUS_LABELS['NEW']}
                  </div>
                </div>
              </div>

              {editedAnalysis && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Issue</span>
                    <span className="font-semibold text-white">{ISSUE_TYPE_LABELS[editedAnalysis.issueType]}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Severity</span>
                    {severityBadge(editedAnalysis.severity)}
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase block">Department</span>
                    <span className="font-semibold text-cyan-300">{editedAnalysis.department}</span>
                  </div>
                </div>
              )}

              {location && (
                <div className="pt-2 border-t border-white/5 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block">Coordinates</span>
                  <span className="font-mono text-slate-300">
                    LAT {location.latitude.toFixed(6)}, LNG {location.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              {/* Workflow Pipeline */}
              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block mb-1.5 font-mono">Internal Workflow Pipeline</span>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50">NEW</span>
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500">ASSIGNED</span>
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500">IN_PROGRESS</span>
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500">RESOLVED</span>
                </div>
              </div>
            </div>

            {/* Map Notification */}
            <div className="flex items-start gap-2.5 bg-cyan-500/10 border border-cyan-500/25 rounded-xl px-4 py-3 text-xs text-cyan-300 text-left font-sans">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <span>
                A severity-colored marker has been placed at your coordinates on the main CityPulse map. Clicking the marker opens its live dispatch card.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleViewOnMap}
                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-hud transition-all"
              >
                <MapPin className="w-4 h-4" /> View Marker on City Map
              </button>

              <button
                onClick={resetAll}
                className="flex-1 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Report Another Incident
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title, icon, children,
}) => (
  <div className="bg-command-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-panel backdrop-blur-md">
    <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
      {icon}
      <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
    </div>
    {children}
  </div>
);

const NavButtons: React.FC<{
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  showBack?: boolean;
  nextLabel?: string;
}> = ({ onBack, onNext, nextDisabled, showBack = true, nextLabel = 'Continue →' }) => (
  <div className={`flex gap-3 mt-6 ${showBack ? '' : 'justify-end'}`}>
    {showBack && onBack && (
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
    )}
    {onNext && (
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-hud transition-all"
      >
        {nextLabel} <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 mt-3">
    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
    <p className="text-xs text-rose-300 font-sans leading-relaxed">{message}</p>
  </div>
);

const ReviewRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
    <span className="text-[10px] text-slate-500 uppercase">{label}</span>
    <span className="text-slate-200 text-right font-medium">{value}</span>
  </div>
);

const EditAnalysisForm: React.FC<{
  value: AiAnalysisResult;
  onChange: (v: AiAnalysisResult) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="space-y-3 pt-2 text-xs">
      <div>
        <label className="block text-[10px] text-slate-400 uppercase mb-1">Issue Type</label>
        <select
          value={value.issueType}
          onChange={(e) => {
            const nextType = e.target.value as IssueType;
            onChange({
              ...value,
              issueType: nextType,
              department: ISSUE_DEPARTMENTS[nextType] || value.department,
            });
          }}
          className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
        >
          {ISSUE_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t} className="bg-slate-900">
              {ISSUE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">Severity</label>
          <select
            value={value.severity}
            onChange={(e) => onChange({ ...value, severity: e.target.value as IssueSeverity })}
            className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 uppercase mb-1">Infrastructure</label>
          <select
            value={value.infrastructure}
            onChange={(e) => onChange({ ...value, infrastructure: e.target.value as InfrastructureCategory })}
            className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
          >
            {INFRASTRUCTURE_OPTIONS.map((inf) => (
              <option key={inf} value={inf} className="bg-slate-900">
                {inf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 uppercase mb-1">Department</label>
        <input
          type="text"
          value={value.department}
          onChange={(e) => onChange({ ...value, department: e.target.value })}
          className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 uppercase mb-1">Description</label>
        <textarea
          rows={2}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none font-sans"
        />
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 uppercase mb-1">Recommended Action</label>
        <textarea
          rows={2}
          value={value.recommendedAction}
          onChange={(e) => onChange({ ...value, recommendedAction: e.target.value })}
          className="w-full bg-[#0d131f] border border-white/15 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none font-sans"
        />
      </div>
    </div>
  );
};
