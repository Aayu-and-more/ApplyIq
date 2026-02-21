import { useState, useMemo, useEffect } from "react";
import { generateAtsResumePdf } from "./lib/resumePdfGenerator";
import { useAppStore } from "./store/useAppStore";
import { LoginView } from "./pages/LoginView";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "kanban", label: "Pipeline", icon: "kanban" },
  { id: "applications", label: "Applications", icon: "table" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "resume", label: "AI Resume", icon: "resume" },
];

// ─── ICON ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, className = "w-4 h-4" }) => {
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-sans">Loading Secure Database...</div>;
  if (!user) return <LoginView />;

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${dark ? 'dark bg-[#080d1a] text-blue-50' : 'bg-gray-50 text-gray-900'}`}>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg text-sm font-semibold backdrop-blur-md border ${notification.type === "error" ? "bg-red-500/20 border-red-500 text-red-500" : "bg-blue-600/20 border-blue-600 text-blue-600"
          }`}>
          {notification.msg}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-56 bg-white dark:bg-[#0e1524] border-r border-gray-200 dark:border-[#1a2840] flex flex-col py-6 sticky top-0 h-screen shrink-0">
        <div className="px-5 pb-6 border-b border-gray-200 dark:border-[#1a2840] mb-3">
          <div className="text-xl font-extrabold tracking-tight text-blue-600 flex items-center gap-2">
            <Icon name="briefcase" className="w-[18px] h-[18px] text-blue-600" />ApplyIQ
          </div>
          <div className="text-[10px] text-gray-500 dark:text-[#4e6a8a] mt-1 tracking-widest uppercase font-semibold">Job Application Tracker</div>
        </div>

        <div className="py-2 flex-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 mx-2 my-[2px] rounded-lg cursor-pointer text-[13.5px] transition-all w-[calc(100%-16px)] text-left ${view === n.id ? "font-semibold text-white bg-blue-600" : "font-normal text-gray-500 dark:text-[#8898b0] hover:bg-gray-100 dark:hover:bg-[#141e30] bg-transparent"
                }`}>
              <Icon name={n.icon} className={`w-3.5 h-3.5 ${view === n.id ? 'text-white' : 'text-gray-500 dark:text-[#8898b0]'}`} />{n.label}
            </button>
          ))}
        </div>

        <div className="mx-2.5 mb-2.5 bg-gray-50 dark:bg-[#141e30] border border-gray-200 dark:border-[#1a2840] rounded-xl p-3.5">
          <div className="text-[10.5px] text-gray-500 dark:text-[#8898b0] mb-2 uppercase tracking-[0.07em] font-bold">Quick Stats</div>
          {[{ label: "Total", value: apps.length, colorClass: "text-gray-900 dark:text-blue-50" }, { label: "This week", value: thisWeekApps, colorClass: "text-blue-600" }, { label: "Offers", value: offerCount, colorClass: "text-emerald-500" }].map((s, i) => (
            <div key={i} className={`text-xs text-gray-500 dark:text-[#8898b0] flex justify-between ${i < 2 ? 'mb-1' : ''}`}>
              <span>{s.label}</span><span className={`font-semibold ${s.colorClass}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {staleApps.length > 0 && (
          <div onClick={() => setView("analytics")} className="mx-2.5 mb-2.5 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-orange-500/20 transition-colors">
            <div className="text-[11px] text-orange-500 font-bold flex items-center gap-1.5">
              <Icon name="bell" className="w-[11px] h-[11px]" />{staleApps.length} Follow-Up Alert{staleApps.length > 1 ? "s" : ""}
            </div>
          </div>
        )}

        <div className="px-2.5 pb-1.5 flex flex-col gap-2">
          <button onClick={logout} className="w-full justify-center text-[12.5px] flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-semibold hover:bg-red-500/20 transition-colors cursor-pointer">
            <Icon name="logOut" className="w-[13px] h-[13px]" />Sign Out
          </button>
          <button onClick={() => setDark(!dark)} className="w-full justify-center text-[12.5px] flex items-center gap-1.5 px-4 py-2 bg-gray-50 dark:bg-[#141e30] text-gray-900 dark:text-blue-50 border border-gray-200 dark:border-[#1a2840] rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-[#1a2840] transition-colors cursor-pointer">
            <Icon name={dark ? "sun" : "moon"} className="w-[13px] h-[13px] text-gray-500 dark:text-[#8898b0]" />{dark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-8 py-7 overflow-y-auto min-w-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-2xl font-bold tracking-tight">{NAV.find(n => n.id === view)?.label}</div>
            <div className="text-[12.5px] text-gray-500 dark:text-[#8898b0] mt-1">
              {view === "dashboard" && `${apps.length} total · ${thisWeekApps} this week · ${responseRate}% response rate`}
              {view === "kanban" && "Drag cards between columns to update status"}
              {view === "applications" && `${filteredApps.length} of ${apps.length} applications`}
              {view === "analytics" && "Conversion metrics, trends, and follow-up tracking"}
              {view === "resume" && `${cvLibrary.length} CV${cvLibrary.length !== 1 ? "s" : ""} in library · AI-powered ATS optimisation`}
            </div>
          </div>
          {view !== "resume" && (
            <button onClick={() => { setForm(emptyForm); setShowAddModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white border-none rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors cursor-pointer">
              <Icon name="plus" className="w-[13px] h-[13px]" />Add Application
            </button>
          )}
        </div>

        {/* View Routing */}
        {view === "dashboard" && <DashboardView apps={apps} staleApps={staleApps} thisWeekApps={thisWeekApps} weeklyGoal={weeklyGoal} goalPct={goalPct} responseRate={responseRate} offerCount={offerCount} interviewRate={interviewRate} statusDist={statusDist} setView={setView} setShowGoalModal={setShowGoalModal} exportCSV={exportCSV} />}
        {view === "kanban" && <KanbanView apps={apps} handleKanbanDrop={handleKanbanDrop} />}
        {view === "applications" && <ApplicationsView filteredApps={filteredApps} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleEdit={handleEdit} handleDelete={deleteApplication} setShowAddModal={setShowAddModal} exportCSV={exportCSV} />}
        {view === "analytics" && <AnalyticsView apps={apps} staleApps={staleApps} responseRate={responseRate} interviewRate={interviewRate} offerCount={offerCount} />}
        {view === "resume" && <ResumeView cvLibrary={cvLibrary} selectedCvId={selectedCvId} setSelectedCvId={setSelectedCvId} setDefaultCv={setDefaultCv} deleteCv={deleteCv} resumeJD={resumeJD} setResumeJD={setResumeJD} resumeOutput={resumeOutput} atsScore={atsScore} isGenerating={isGenerating} handleGenerateResume={handleGenerateResume} handleCopy={handleCopy} handleDownloadPdf={handleDownloadPdf} copySuccess={copySuccess} setShowCvModal={setShowCvModal} />}
      </div>

      {/* Modals */}
      {showAddModal && <AddAppModal form={form} setForm={setForm} handleSave={handleSave} onClose={() => setShowAddModal(false)} />}
      {showGoalModal && <GoalModal weeklyGoal={weeklyGoal} thisWeekApps={thisWeekApps} onSave={(g) => { saveWeeklyGoal(g); setShowGoalModal(false); }} onClose={() => setShowGoalModal(false)} />}
      {showCvModal && <AddCvModal cvBeingAdded={cvBeingAdded} setCvBeingAdded={setCvBeingAdded} handlePdfUpload={handlePdfUpload} saveCv={handleSaveCv} onClose={() => { setShowCvModal(false); setCvBeingAdded({ name: "", base64: null, fileName: null }); }} />}
    </div>
  );
}