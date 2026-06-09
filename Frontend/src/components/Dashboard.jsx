import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import cvscanLogo from '../assets/cvscan-logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

const acceptPdfOnly = (file) => file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');

const buildWelcomeMessage = (score, targetRole) => {
  const roleLabel = targetRole?.trim() || 'your target role';

  if (score >= 80) {
    return `Strong scan. You are already close to ${roleLabel}; I can help sharpen your positioning and interview story.`;
  }

  if (score >= 55) {
    return `You have a workable foundation for ${roleLabel}. I can help prioritize keyword gaps, bullet rewrites, and project positioning.`;
  }

  return `Your current resume needs focused improvement for ${roleLabel}. I can help build a step-by-step plan around skills, projects, and resume language.`;
};

const buildLocalCoachReply = (question, scanResult, targetRole) => {
  const normalizedQuestion = question.toLowerCase();
  const roleLabel = targetRole?.trim() || 'your target role';
  const missingKeywords = scanResult?.missing_keywords || [];
  const redFlags = scanResult?.red_flags || [];
  if (normalizedQuestion.includes('job') || normalizedQuestion.includes('linkedin') || normalizedQuestion.includes('opening')) {
    return `I don't have active live job search integrations connected right now, but I can help you align your resume to target roles so you stand out when applying.`;
  }

  if (normalizedQuestion.includes('gap') || normalizedQuestion.includes('missing') || normalizedQuestion.includes('skill')) {
    if (missingKeywords.length) {
      return `For ${roleLabel}, your main gaps are: ${missingKeywords.join(', ')}. Prioritize one project or resume bullet that proves each skill with tools, scope, and measurable output.`;
    }

    return `I do not see critical missing keywords from the scan. Improve evidence quality next: stronger project impact, clearer metrics, and tighter role alignment for ${roleLabel}.`;
  }

  if (normalizedQuestion.includes('score') || normalizedQuestion.includes('improve')) {
    return `Your current score is ${scanResult?.overall_score ?? 'not available'}. Improve fastest by fixing ATS red flags, adding missing role keywords, and rewriting weak bullets with quantified outcomes.`;
  }

  if (redFlags.length) {
    return `Start by fixing this scan concern: "${redFlags[0]}" Then align project bullets and keywords toward ${roleLabel}.`;
  }

  return `Based on this scan, focus on clearer role alignment, stronger project evidence, and measurable resume bullets for ${roleLabel}.`;
};

export default function Dashboard() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Load recent scans from localStorage
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = localStorage.getItem('recent_scans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const triggerToast = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const handleFiles = (files) => {
    const nextFile = files?.[0];

    if (!nextFile) {
      return;
    }

    if (!acceptPdfOnly(nextFile)) {
      setSelectedFile(null);
      setFileError('Only PDF resumes can be scanned.');
      triggerToast('Only PDF resumes are supported.');
      return;
    }

    if (nextFile.size > 5 * 1024 * 1024) {
      setSelectedFile(null);
      setFileError('File size too large. Please upload a resume under 5MB.');
      triggerToast('File size must be under 5MB.');
      return;
    }

    setSelectedFile(nextFile);
    setFileError('');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleScan = async () => {
    if (!selectedFile || isLoading) {
      return;
    }

    setIsLoading(true);
    setFileError('');

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('job_description', jobDescription);
      formData.append('target_role', targetRole);

      const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error([data.message, data.detail].filter(Boolean).join('\n') || 'Resume scan request failed.');
      }

      setScanResult(data);
      setIsOfflineMode(false);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'ai',
          text: buildWelcomeMessage(data.overall_score, targetRole),
        },
      ]);

      // Save to recent scans
      const newScan = {
        id: crypto.randomUUID(),
        target_role: targetRole,
        score: data.overall_score,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        result: data,
        selectedFileName: selectedFile?.name || 'Resume.pdf'
      };
      const updatedScans = [newScan, ...recentScans.filter(s => s.target_role !== targetRole).slice(0, 4)];
      setRecentScans(updatedScans);
      localStorage.setItem('recent_scans', JSON.stringify(updatedScans));

    } catch (error) {
      console.error('CvScan.ai scan failed:', error);
      setIsOfflineMode(true);
      triggerToast(error.message || 'Unable to connect to the CvScan.ai backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const nextMessage = chatInput.trim();

    if (!nextMessage || isSendingMessage) {
      return;
    }

    const nextMessages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: nextMessage,
      },
    ];

    setMessages(nextMessages);
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_history: nextMessages.map(({ role, text }) => ({ role, text })),
          resume_context: scanResult,
          target_role: targetRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Career coach API failed.');
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'ai',
          text: data.reply,
        },
      ]);
      setIsOfflineMode(false);
    } catch (error) {
      console.warn('Career coach API fallback used:', error);
      setIsOfflineMode(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'ai',
          text: buildLocalCoachReply(nextMessage, scanResult, targetRole),
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setMessages([]);
    setChatInput('');
    setSelectedFile(null);
    setFileError('');
  };

  const handleLoadScan = (scan) => {
    setScanResult(scan.result);
    setTargetRole(scan.target_role);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'ai',
        text: buildWelcomeMessage(scan.score, scan.target_role),
      },
    ]);
  };

  const score = scanResult?.overall_score ?? 0;
  const scoreTone =
    score >= 80
      ? 'from-emerald-600 to-teal-600 text-white'
      : score >= 55
        ? 'from-amber-600 to-orange-600 text-white'
        : 'from-rose-600 to-red-600 text-white';

  return (
    <main className="min-h-screen bg-app-bg text-app-text-primary antialiased transition-colors duration-500 relative overflow-hidden">
      {/* Ambient glowing background circles to organically fill side margins */}
      <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-app-accent/[0.04] blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[15%] -right-[10%] w-[600px] h-[600px] rounded-full bg-amber-600/[0.03] blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-app-accent/[0.03] blur-[100px] pointer-events-none" />

      {/* Offline Mode Fallback Indicator Banner */}
      {isOfflineMode && (
        <div className="flex items-center justify-center gap-3 bg-amber-50 border-b border-amber-200/60 px-4 py-3 text-amber-800 text-sm font-medium animate-pulse">
          <WifiOff className="h-5 w-5 shrink-0 text-amber-600" />
          <span>Offline Fallback Active: Running career chat offline. Scans will resume when servers reconnect.</span>
        </div>
      )}

      {/* Error Toast Notifications */}
      {errorToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl shadow-xl transition-all duration-300">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 animate-bounce" />
          <span className="text-sm font-medium">{errorToast}</span>
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1650px] flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="mb-6 flex flex-col gap-4 border-b border-app-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 bg-gradient-to-br from-white/95 to-app-accent-light/45 backdrop-blur-md border border-white/95 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,28,62,0.12)] shadow-inset-soft flex items-center justify-center overflow-hidden group transition-all duration-500 hover:shadow-[0_12px_28px_-3px_rgba(99,28,62,0.18)] hover:border-app-accent/20">
              {/* Subtle glassmorphism highlight shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              <img
                src={cvscanLogo}
                alt="CvScan logo"
                className="h-9 w-auto object-contain drop-shadow-[0_2px_4px_rgba(99,28,62,0.15)] group-hover:drop-shadow-[0_0_10px_rgba(99,28,62,0.35)] transition-all duration-300 transform group-hover:scale-105"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">CvScan</h1>
              <p className="text-xs text-app-text-secondary">Enterprise-grade resume intelligence for smarter screening.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(scanResult || isLoading) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-app-border bg-white/80 backdrop-blur-sm px-4 text-xs font-semibold text-app-text-primary shadow-inset-soft transition-all duration-300 hover:border-app-accent/40 hover:bg-app-accent-light/30 hover:text-app-accent hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Scan Another Resume
              </button>
            )}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-app-accent/15 bg-white/40 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-bold tracking-wider text-app-accent shadow-inset-soft uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-app-accent" aria-hidden="true" />
              Active Simulator
            </div>
          </div>
        </header>

        {!(scanResult || isLoading) ? (
          /* =========================================================
             SCREEN 1: Intake & Upload Screen (Page 1)
             ========================================================= */
          <div className="flex flex-col gap-8 flex-1 animate-fade-in max-w-[1450px] mx-auto w-full py-6 transition-all duration-500">
            {/* Grid for main inputs and upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start w-full">
              {/* Left Column: Target Job Details */}
              <div className="space-y-7">
                <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-7 sm:p-8 shadow-inset-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_-6px_rgba(99,28,62,0.08)] hover:border-white/80">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-5 border-b border-app-border/30 pb-2">Target Job Details</h2>
                  
                  <div className="space-y-5">
                    <label htmlFor="target-role" className="block">
                      <span className="mb-2 block text-xs font-bold text-app-text-secondary uppercase tracking-wider">Target Role / Career Objective</span>
                      <input
                        id="target-role"
                        value={targetRole}
                        onChange={(event) => setTargetRole(event.target.value)}
                        placeholder="e.g. Frontend Engineer, Product Manager..."
                        className="h-12 w-full rounded-xl border border-app-border/60 bg-[#FAF9F5]/30 px-4 text-sm text-app-text-primary outline-none transition-all duration-300 placeholder:text-app-text-secondary/45 hover:bg-[#FAF9F5]/50 focus:bg-white focus:border-app-accent shadow-inset-soft focus:shadow-inset-deep"
                      />
                    </label>

                    <label htmlFor="job-description" className="block">
                      <span className="mb-2 block text-xs font-bold text-app-text-secondary uppercase tracking-wider">Target Job Description</span>
                      <textarea
                        id="job-description"
                        value={jobDescription}
                        onChange={(event) => setJobDescription(event.target.value)}
                        rows={9}
                        placeholder="Paste the target role description, responsibilities, required skills, and qualifications..."
                        className="w-full resize-none rounded-xl border border-app-border/60 bg-[#FAF9F5]/30 px-4 py-3 text-sm leading-relaxed text-app-text-primary outline-none transition-all duration-300 placeholder:text-app-text-secondary/45 hover:bg-[#FAF9F5]/50 focus:bg-white focus:border-app-accent shadow-inset-soft focus:shadow-inset-deep"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Upload Zone & Recent Scans */}
              <div className="space-y-7">
                {/* Upload Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                       event.preventDefault();
                       inputRef.current?.click();
                    }
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_-6px_rgba(99,28,62,0.08)] ${
                    isDragging
                      ? 'border-app-accent bg-app-accent-light/35 shadow-inset-deep'
                      : 'border-app-border bg-white/50 hover:border-app-accent/40 hover:bg-white/75 shadow-inset-soft'
                  }`}
                  aria-label="Upload PDF resume"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-accent text-white shadow-sm">
                    <UploadCloud className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <h3 className="mt-4 text-base font-bold text-app-text-primary">
                    {selectedFile ? 'Resume selected' : 'Drop your resume PDF'}
                  </h3>
                  <p className="mt-1.5 text-sm text-app-text-secondary font-medium">
                    {selectedFile ? selectedFile.name : 'Drag & drop a local file, or click to browse'}
                  </p>

                  {selectedFile && (
                    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-app-border bg-[#FAF9F5]/70 px-3 py-1.5 text-sm font-semibold text-app-text-primary shadow-inset-soft">
                      <FileText className="h-4 w-4 text-app-accent shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFile(null);
                          setFileError('');
                        }}
                        className="ml-1 rounded p-0.5 text-app-text-secondary transition-all duration-300 hover:bg-app-border"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {fileError && <p className="mt-2.5 text-xs font-bold text-rose-600">{fileError}</p>}
                </div>

                {/* Run Smart Scan Button (Option A: Negative Margin Bleed) */}
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={!selectedFile || isLoading || !targetRole.trim()}
                  className="inline-flex h-14 w-full md:w-[calc(100%+2rem)] md:-mx-4 lg:w-[calc(100%+3.5rem)] lg:-mx-7 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#631C3E] to-[#802852] text-white text-sm font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:from-[#501531] hover:to-[#6f1d44] transition-all duration-300 hover:scale-[1.01] active:translate-y-0.5 disabled:cursor-not-allowed disabled:from-app-border disabled:to-app-border disabled:text-app-text-secondary/40 disabled:shadow-none"
                >
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  Run Smart Scan
                </button>

                {/* History Scans (Intake screen fallback) */}
                <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-7 sm:p-8 shadow-inset-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_-6px_rgba(99,28,62,0.08)] hover:border-white/80">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-app-accent mb-4 border-b border-app-border/30 pb-2">Recent Scans</h2>
                  {recentScans.length === 0 ? (
                    <div className="text-center py-4 text-xs text-app-text-secondary">
                      No recent scans. Run a simulation to build history.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {recentScans.map((scan) => (
                        <button
                          key={scan.id}
                          onClick={() => handleLoadScan(scan)}
                          className="flex w-full items-center justify-between rounded-xl border border-app-border/40 bg-white/20 p-3.5 text-left transition-all duration-300 hover:bg-white/50 hover:border-app-accent/30 shadow-inset-soft"
                        >
                          <div className="truncate pr-2">
                            <p className="text-sm font-bold text-app-text-primary truncate">{scan.target_role}</p>
                            <p className="text-xs text-app-text-secondary truncate mt-0.5">{scan.selectedFileName}</p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs text-app-text-secondary font-medium">{scan.date}</span>
                            <span className="rounded bg-app-accent/10 px-2 py-0.5 text-xs font-bold text-app-accent">
                              {scan.score}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             SCREEN 2: Analysis Results & Chat View (Page 2)
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-8 items-start flex-1 animate-fade-in">
            {/* Left Column (Wide): Match Score, Red Flags & Bullet Point Optimizer */}
            <div className="space-y-6">
              {/* Top Row: Score + Red Flags */}
              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
                {/* Match Score Card */}
                <section className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-6 shadow-inset-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_45px_-10px_rgba(99,28,62,0.12)] hover:border-app-accent/25 flex flex-col justify-center items-center">
                  <div className="flex flex-col items-center text-center">
                    {isLoading ? (
                      <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#FAF9F5]/50 border border-app-border animate-pulse">
                        <Loader2 className="h-8 w-8 animate-spin text-app-accent" />
                      </div>
                    ) : (
                      <div
                        className={`relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br ${scoreTone} shadow-md ring-8 ring-white transition-all duration-500`}
                        aria-label={`Overall score ${score} out of 100`}
                      >
                        <span className="text-4xl font-black tracking-tight">{score}</span>
                      </div>
                    )}
                    <h3 className="mt-4 text-sm font-bold text-app-text-primary">Overall Match Score</h3>
                    <p className="mt-2 text-xs leading-5 text-app-text-secondary">
                      Gemini evaluated resume alignment, ATS readiness, missing keywords, and job fit.
                    </p>
                  </div>
                </section>

                {/* Red Flags and Keyword Cards */}
                <div className="bg-white/45 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-inset-soft flex flex-col justify-between space-y-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_45px_-10px_rgba(99,28,62,0.12)] hover:border-white/85">
                  {/* Red Flags warnings */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-2.5 border-b border-app-border/30 pb-1.5 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Red Flags
                    </h3>
                    {isLoading ? (
                      <div className="h-10 bg-[#FAF9F5]/50 border border-app-border rounded-xl animate-pulse"></div>
                    ) : scanResult?.red_flags?.length ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {scanResult.red_flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="flex gap-2 rounded-xl border border-amber-200/60 bg-amber-50/20 px-3.5 py-2.5 text-xs text-amber-955 shadow-inset-soft"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-900">
                        No major ATS red flags found.
                      </p>
                    )}
                  </div>

                  {/* Missing Keywords Gaps */}
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-2.5 border-b border-app-border/30 pb-1.5 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Missing Keywords
                    </h3>
                    {isLoading ? (
                      <div className="h-8 bg-[#FAF9F5]/50 border border-app-border rounded-xl animate-pulse"></div>
                    ) : scanResult?.missing_keywords?.length ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {scanResult.missing_keywords.map((kw, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setChatInput(`How can I demonstrate my experience with "${kw}" on my resume?`);
                              document.getElementById('coach-message')?.focus();
                            }}
                            className="rounded-full border border-app-accent/15 bg-app-accent-light/50 px-2.5 py-1 text-[10px] font-bold text-app-accent transition-all duration-300 hover:bg-app-accent hover:text-white hover:border-app-accent hover:scale-105 active:scale-95"
                            title={`Click to ask the coach about "${kw}"`}
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-900">
                        No critical keywords missing from resume.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bullet point optimizer (Comparison Table) */}
              <section className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-6 shadow-inset-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_45px_-10px_rgba(99,28,62,0.12)] hover:border-app-accent/25">
                <div className="flex items-center gap-2 border-b border-app-border/30 pb-3 mb-4">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent">Bullet Point Optimizer</h3>
                </div>

                <div className="space-y-3">
                  {isLoading ? (
                    <div className="h-20 bg-[#FAF9F5]/50 border border-app-border rounded-xl animate-pulse"></div>
                  ) : scanResult?.bullet_fixes?.length ? (
                    <div className="overflow-x-auto rounded-xl border border-app-border/30 shadow-inset-soft">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-app-border/40 bg-white/35">
                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-rose-700 w-1/2 pr-4 border-r border-app-border/20">Original Bullet Points</th>
                            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-emerald-700 w-1/2 pl-4">Optimized Bullet Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border/20">
                          {scanResult.bullet_fixes.map((fix, idx) => (
                            <tr
                              key={idx}
                              className={`transition-colors hover:bg-app-accent-light/10 ${idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}
                            >
                              <td className="py-4 px-4 pr-4 text-xs text-rose-950 font-medium italic align-top leading-relaxed border-r border-app-border/20">
                                "{fix.original}"
                              </td>
                              <td className="py-4 px-4 pl-4 text-xs text-emerald-955 font-medium italic align-top leading-relaxed">
                                "{fix.optimized}"
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-app-text-secondary text-center py-4">No bullet points submitted or found for rewrite.</p>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (Narrow): AI Career Coach (Full-height) */}
            <div className="space-y-6">
              {/* AI Career Coach (Persistent Chatbot) */}
              <aside className="flex flex-col rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-5 shadow-inset-soft min-h-[600px] h-[740px] lg:h-[800px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_45px_-10px_rgba(99,28,62,0.12)] hover:border-app-accent/25">
                <div className="flex items-center gap-3 border-b border-app-border/40 pb-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#631C3E] to-[#501531] text-white shadow-md">
                    <Bot className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-app-text-primary">AI Career Coach</h3>
                    <p className="text-[10px] text-app-text-secondary font-semibold uppercase tracking-wider">{targetRole || 'General objective'}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1 bg-white/25 rounded-xl p-3 border border-app-border/30 shadow-inset-deep mb-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center h-full py-20 px-3">
                      <Bot className="h-8 w-8 text-app-accent/30 mb-2 animate-bounce" aria-hidden="true" />
                      <p className="text-xs font-bold text-app-text-primary">Career Coach Ready</p>
                      <p className="text-[10px] text-app-text-secondary mt-1 max-w-[200px]">Ask the coach how to resolve resume gaps or practice mock interview questions.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'ai' && (
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-accent text-white text-[9px] font-bold">
                            AI
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed shadow-sm transition-all duration-300 ${
                            message.role === 'user'
                              ? 'bg-[#631C3E] text-white rounded-xl rounded-tr-none'
                              : 'border border-app-border/30 bg-white/95 text-app-text-primary rounded-xl rounded-tl-none shadow-sm'
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))
                  )}

                  {isSendingMessage && (
                    <div className="flex items-center gap-1.5 text-[10px] text-app-text-secondary font-semibold">
                      <Loader2 className="h-3 w-3 animate-spin text-app-accent" aria-hidden="true" />
                      Thinking...
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <label htmlFor="coach-message" className="sr-only">
                    Message AI Career Coach
                  </label>
                  <input
                    id="coach-message"
                    value={chatInput}
                    disabled={isLoading}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask how to improve..."
                    className="min-w-0 flex-1 rounded-xl border border-app-border/60 bg-[#FAF9F5]/40 px-3 py-2.5 text-xs text-app-text-primary outline-none transition-all duration-300 placeholder:text-app-text-secondary/50 focus:bg-white focus:border-app-accent focus:ring-4 focus:ring-app-accent/5 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingMessage || isLoading}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-app-accent px-4 text-xs font-bold text-white shadow-md transition-all duration-300 hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-border disabled:text-app-text-secondary/40"
                  >
                    Send
                  </button>
                </form>
              </aside>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/*
  Architecture note:
  Dashboard.jsx owns intake, structured scan results, job leads, and career chat
  for this phase. Rendering is O(r + k + b + j + m), where r is red flags, k is
  keywords, b is bullet fixes, j is matched jobs, and m is messages. React .map()
  turns each validated backend array into stable UI cards without routing or
  global state while the backend contract is still evolving.
*/

