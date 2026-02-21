import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { generateAtsResumePdf } from "./lib/resumePdfGenerator";
import { useAppStore } from "./store/useAppStore";
import { LoginView } from "./pages/LoginView";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
  Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
};
const PRIORITY_COLORS = { Dream: "#f59e0b", Target: "#3b82f6", Backup: "#6b7280" };
const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "kanban", label: "Pipeline", icon: "kanban" },
  { id: "applications", label: "Applications", icon: "table" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "resume", label: "AI Resume", icon: "resume" },
];

// ─── ICON ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    kanban: <><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" /></>,
    table: <><path d="M3 3h18v4H3z" /><path d="M3 10h18v4H3z" /><path d="M3 17h18v4H3z" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 16l4-6 4 4 4-8" /></>,
    resume: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>,
    sun: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    upload: <><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
    download: <><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.83" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    logOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

// ─── THEME + STYLE FACTORIES ──────────────────────────────────────────────────
const buildTheme = (dark) => ({
  bg: dark ? "#080d1a" : "#f0f4fa",
  surface: dark ? "#0e1524" : "#ffffff",
  surface2: dark ? "#141e30" : "#f6f9fd",
  border: dark ? "#1a2840" : "#dde3ef",
  text: dark ? "#dce8f8" : "#111827",
  textMuted: dark ? "#4e6a8a" : "#8898b0",
  accent: "#2563eb",
});

const buildStyles = (t) => ({
  card: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px" },
  cardTitle: { fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 },
  statCard: (color) => ({ background: t.surface, border: `1px solid ${t.border}`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: "18px 20px" }),
  badge: (status) => ({ display: "inline-flex", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[status] || "#6b7280") + "22", color: STATUS_COLORS[status] || "#6b7280" }),
  prioBadge: (p) => ({ display: "inline-flex", padding: "2px 8px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: (PRIORITY_COLORS[p] || "#6b7280") + "22", color: PRIORITY_COLORS[p] || "#6b7280" }),
  input: { width: "100%", padding: "9px 13px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 13.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  select: { width: "100%", padding: "9px 13px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" },
  btn: (variant) => {
    const base = { padding: "9px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6 };
    if (variant === "primary") return { ...base, background: "#2563eb", color: "#fff", border: "none" };
    if (variant === "danger") return { ...base, background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" };
    return { ...base, background: t.surface2, color: t.text, border: `1px solid ${t.border}` };
  },
  th: { textAlign: "left", padding: "9px 13px", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${t.border}` },
  td: { padding: "11px 13px", fontSize: 13, borderBottom: `1px solid ${t.border}` },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 28, width: 500, maxWidth: "100%", zIndex: 51, maxHeight: "90vh", overflowY: "auto" },
  goalBar: { height: 9, borderRadius: 99, background: t.border, overflow: "hidden", margin: "8px 0 5px" },
  row: { display: "flex", gap: 14, marginBottom: 20 },
});

// ─── VIEWS ────────────────────────────────────────────────────────────────────
import { DashboardView } from "./pages/DashboardView";
import { KanbanView } from "./pages/KanbanView";
import { ApplicationsView } from "./pages/ApplicationsView";
import { AnalyticsView } from "./pages/AnalyticsView";
import { ResumeView } from "./pages/ResumeView";

// ─── MODALS ───────────────────────────────────────────────────────────────────
import { AddAppModal } from "./components/modals/AddAppModal";
import { GoalModal } from "./components/modals/GoalModal";
import { AddCvModal } from "./components/modals/AddCvModal";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ApplyIQ() {
  const {
    user, authLoading, apps, cvLibrary, weeklyGoal, dark, view, notification,
    setDark, setView, setNotification, saveApplication, deleteApplication, updateApplicationStatus,
    saveCv, deleteCv, setDefaultCv, saveWeeklyGoal, initStore, logout
  } = useAppStore();

  useEffect(() => {
    const unsubscribe = initStore();
    return () => unsubscribe && unsubscribe();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [resumeJD, setResumeJD] = useState("");
  const [resumeOutput, setResumeOutput] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cvBeingAdded, setCvBeingAdded] = useState({ name: "", base64: null, fileName: null });
  const [copySuccess, setCopySuccess] = useState(false);
  const emptyForm = { company: "", role: "", date: new Date().toISOString().slice(0, 10), source: "LinkedIn", status: "Applied", salary: "", priority: "Target", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const t = buildTheme(dark);
  const S = buildStyles(t);

  const today = new Date();
  const staleApps = apps.filter(a => { const d = (today - new Date(a.date)) / 86400000; return d > 14 && (a.status === "Applied" || a.status === "Screening"); });
  const thisWeekApps = apps.filter(a => (today - new Date(a.date)) / 86400000 <= 7).length;
  const responseRate = apps.length ? Math.round((apps.filter(a => ["Screening", "Interview", "Offer"].includes(a.status)).length / apps.length) * 100) : 0;
  const offerCount = apps.filter(a => a.status === "Offer").length;
  const interviewRate = apps.length ? Math.round((apps.filter(a => ["Interview", "Offer"].includes(a.status)).length / apps.length) * 100) : 0;
  const statusDist = KANBAN_COLS.map(s => ({ name: s, value: apps.filter(a => a.status === s).length })).filter(x => x.value > 0);
  const goalPct = Math.min(Math.round((thisWeekApps / weeklyGoal) * 100), 100);
  const filteredApps = useMemo(() => apps.filter(a => {
    const q = searchTerm.toLowerCase();
    return (a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)) && (filterStatus === "All" || a.status === filterStatus);
  }), [apps, searchTerm, filterStatus]);

  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    saveApplication(form);
    setShowAddModal(false); setForm(emptyForm);
  };

  const handleEdit = app => { setForm({ ...app }); setShowAddModal(true); };
  const handleKanbanDrop = (appId, newStatus) => { updateApplicationStatus(appId, newStatus); };

  const exportCSV = () => {
    const headers = ["Company", "Role", "Date", "Source", "Status", "Priority", "Salary", "Notes"];
    const rows = apps.map(a => [a.company, a.role, a.date, a.source, a.status, a.priority, a.salary || "", `"${(a.notes || "").replace(/"/g, '""')}"`]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `ApplyIQ_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url); setNotification({ msg: "CSV exported", type: "success" });
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") { setNotification({ msg: "Please upload a PDF", type: "error" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setCvBeingAdded(prev => ({ ...prev, base64: ev.target.result.split(",")[1], fileName: file.name })); setNotification({ msg: `${file.name} loaded`, type: "success" }); };
    reader.readAsDataURL(file);
  };
  const handleSaveCv = () => {
    if (!cvBeingAdded.name.trim() || !cvBeingAdded.base64) return;
    saveCv(cvBeingAdded);
    setCvBeingAdded({ name: "", base64: null, fileName: null });
    setShowCvModal(false);
  };

  // Safe PDF Handler
  const handleDownloadPdf = () => {
    if (!resumeOutput) {
      setNotification({ msg: "No content to download", type: "error" });
      return;
    }
    try {
      generateAtsResumePdf(resumeOutput);
      setNotification({ msg: "PDF downloaded!", type: "success" });
    } catch (err) {
      console.error("PDF generation error:", err);
      setNotification({ msg: "PDF download failed", type: "error" });
    }
  };

  const handleGenerateResume = async () => {
    const cv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
    if (!cv) { setNotification({ msg: "Please select a CV first", type: "error" }); return; }
    if (!resumeJD.trim()) { setNotification({ msg: "Please paste a job description", type: "error" }); return; }
    setIsGenerating(true); setResumeOutput("");
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvBase64: cv.base64, jobDescription: resumeJD }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let finalResult = data.result;
      const scoreMatch = finalResult.match(/\[ATS_SCORE:\s*(\d+)\]/i);
      if (scoreMatch) {
        setAtsScore(scoreMatch[1]);
        finalResult = finalResult.replace(scoreMatch[0], '').trim();
      } else {
        setAtsScore(null);
      }

      setResumeOutput(finalResult);
      setNotification({ msg: "Resume optimised!", type: "success" });
    } catch (err) {
      setResumeOutput(`⚠️ Error: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set in Vercel environment variables.`);
      setNotification({ msg: "Error — check API key", type: "error" });
    } finally { setIsGenerating(false); }
  };
  const handleCopy = () => { navigator.clipboard.writeText(resumeOutput); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); };

  const sp = { t, S };

  if (authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4fa", color: "#111827", fontFamily: "sans-serif" }}>Loading Secure Database...</div>;
  if (!user) return <LoginView t={t} S={S} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: t.text, transition: "background 0.3s, color 0.3s" }}>
      {notification && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 100, background: notification.type === "error" ? "#ef444420" : "#2563eb20", border: `1px solid ${notification.type === "error" ? "#ef4444" : "#2563eb"}`, color: notification.type === "error" ? "#ef4444" : "#2563eb", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, backdropFilter: "blur(8px)" }}>
          {notification.msg}
        </div>
      )}

      <div style={{ width: 220, background: t.surface, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${t.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px", color: t.accent, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="briefcase" size={17} color={t.accent} />ApplyIQ
          </div>
          <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Job Application Tracker</div>
        </div>
        <div style={{ padding: "8px 0", flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", margin: "1px 8px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: view === n.id ? 600 : 400, color: view === n.id ? "#fff" : t.textMuted, background: view === n.id ? t.accent : "transparent", transition: "all 0.15s", border: "none", width: "calc(100% - 16px)", textAlign: "left" }}>
              <Icon name={n.icon} size={14} color={view === n.id ? "#fff" : t.textMuted} />{n.label}
            </button>
          ))}
        </div>
        <div style={{ margin: "0 10px 10px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 9, padding: "12px 14px" }}>
          <div style={{ fontSize: 10.5, color: t.textMuted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>Quick Stats</div>
          {[{ label: "Total", value: apps.length, color: t.text }, { label: "This week", value: thisWeekApps, color: t.accent }, { label: "Offers", value: offerCount, color: "#10b981" }].map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: t.textMuted, display: "flex", justifyContent: "space-between", marginBottom: i < 2 ? 4 : 0 }}>
              <span>{s.label}</span><span style={{ color: s.color, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>
        {staleApps.length > 0 && (
          <div onClick={() => setView("analytics")} style={{ margin: "0 10px 10px", background: "#f9731612", border: "1px solid #f9731640", borderRadius: 9, padding: "10px 14px", cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="bell" size={11} color="#f97316" />{staleApps.length} Follow-Up Alert{staleApps.length > 1 ? "s" : ""}
            </div>
          </div>
        )}
        <div style={{ padding: "0 10px 6px" }}>
          <button onClick={logout} style={{ ...S.btn("danger"), width: "100%", justifyContent: "center", fontSize: 12.5, marginBottom: 8 }}>
            <Icon name={"logOut"} size={13} color={"#ef4444"} />Sign Out
          </button>
          <button onClick={() => setDark(!dark)} style={{ ...S.btn("secondary"), width: "100%", justifyContent: "center", fontSize: 12.5 }}>
            <Icon name={dark ? "sun" : "moon"} size={13} color={t.textMuted} />{dark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.5px" }}>{NAV.find(n => n.id === view)?.label}</div>
            <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 3 }}>
              {view === "dashboard" && `${apps.length} total · ${thisWeekApps} this week · ${responseRate}% response rate`}
              {view === "kanban" && "Drag cards between columns to update status"}
              {view === "applications" && `${filteredApps.length} of ${apps.length} applications`}
              {view === "analytics" && "Conversion metrics, trends, and follow-up tracking"}
              {view === "resume" && `${cvLibrary.length} CV${cvLibrary.length !== 1 ? "s" : ""} in library · AI-powered ATS optimisation`}
            </div>
          </div>
          {view !== "resume" && (
            <button onClick={() => { setForm(emptyForm); setShowAddModal(true); }} style={S.btn("primary")}>
              <Icon name="plus" size={13} />Add Application
            </button>
          )}
        </div>

        {view === "dashboard" && <DashboardView    {...sp} apps={apps} staleApps={staleApps} thisWeekApps={thisWeekApps} weeklyGoal={weeklyGoal} goalPct={goalPct} responseRate={responseRate} offerCount={offerCount} interviewRate={interviewRate} statusDist={statusDist} setView={setView} setShowGoalModal={setShowGoalModal} exportCSV={exportCSV} />}
        {view === "kanban" && <KanbanView       {...sp} apps={apps} handleKanbanDrop={handleKanbanDrop} />}
        {view === "applications" && <ApplicationsView {...sp} filteredApps={filteredApps} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleEdit={handleEdit} handleDelete={deleteApplication} setShowAddModal={setShowAddModal} exportCSV={exportCSV} />}
        {view === "analytics" && <AnalyticsView    {...sp} apps={apps} staleApps={staleApps} responseRate={responseRate} interviewRate={interviewRate} offerCount={offerCount} />}
        {view === "resume" && <ResumeView       {...sp} cvLibrary={cvLibrary} selectedCvId={selectedCvId} setSelectedCvId={setSelectedCvId} setDefaultCv={setDefaultCv} deleteCv={deleteCv} resumeJD={resumeJD} setResumeJD={setResumeJD} resumeOutput={resumeOutput} atsScore={atsScore} isGenerating={isGenerating} handleGenerateResume={handleGenerateResume} handleCopy={handleCopy} handleDownloadPdf={handleDownloadPdf} copySuccess={copySuccess} setShowCvModal={setShowCvModal} />}
      </div>

      {showAddModal && <AddAppModal  {...sp} form={form} setForm={setForm} handleSave={handleSave} onClose={() => setShowAddModal(false)} />}
      {showGoalModal && <GoalModal    {...sp} weeklyGoal={weeklyGoal} thisWeekApps={thisWeekApps} onSave={(g) => { saveWeeklyGoal(g); setShowGoalModal(false); }} onClose={() => setShowGoalModal(false)} />}
      {showCvModal && <AddCvModal   {...sp} cvBeingAdded={cvBeingAdded} setCvBeingAdded={setCvBeingAdded} handlePdfUpload={handlePdfUpload} saveCv={handleSaveCv} onClose={() => { setShowCvModal(false); setCvBeingAdded({ name: "", base64: null, fileName: null }); }} />}
    </div>
  );
}