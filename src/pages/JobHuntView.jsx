import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateAtsResumePdf } from "../lib/resumePdfGenerator";

// ── Search config ─────────────────────────────────────────────────────────────
const DEFAULT_KEYWORDS = [
  "equity research analyst",
  "financial analyst",
  "investment analyst",
  "graduate scheme finance",
  "markets analyst",
  "financial analyst graduate",
];

const DATE_OPTIONS = [
  { label: "24h", value: "today" },
  { label: "3 days", value: "3days" },
  { label: "1 week", value: "week" },
  { label: "1 month", value: "month" },
];

// ── Fit scoring ───────────────────────────────────────────────────────────────
const FIT_KEYWORDS = [
  "equity research", "financial analyst", "investment", "markets", "trading",
  "portfolio", "asset management", "fund", "capital markets", "fixed income",
  "graduate", "intern", "junior", "analyst", "finance", "risk", "credit",
  "quantitative", "bloomberg", "excel", "financial modelling", "valuation",
  "dcf", "financial statements", "derivatives",
];

function fitScore(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const matches = FIT_KEYWORDS.filter(k => text.includes(k)).length;
  return Math.min(10, Math.max(1, Math.round((matches / 6) * 10)));
}

function fitColor(score) {
  if (score >= 8) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  if (score >= 5) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
  return "text-red-500 bg-red-500/10 border-red-500/30";
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export const JobHuntView = ({ cvLibrary, selectedCvId, setSelectedCvId, setShowCvModal, saveApplication }) => {
  const { apps, setNotification } = useAppStore();

  const [jobs, setJobs] = useState([]);
  const [skipped, setSkipped] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("jd"); // "jd" | "cv"
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);
  const [activeKeywords, setActiveKeywords] = useState(new Set(DEFAULT_KEYWORDS));
  const [dateFilter, setDateFilter] = useState("week");

  // CV generation state (per selected job)
  const [cvOutput, setCvOutput] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Check if already applied
  function alreadyApplied(job) {
    return apps.some(
      a =>
        a.company.toLowerCase() === job.company.toLowerCase() &&
        a.role.toLowerCase().includes(job.title.toLowerCase().slice(0, 15))
    );
  }

  function toggleKeyword(kw) {
    setActiveKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw) && next.size > 1) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }

  // Fetch jobs
  async function handleFindJobs() {
    setLoading(true);
    setJobs([]);
    setSelected(null);
    setSkipped(new Set());
    try {
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [...activeKeywords], dateFilter }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const scored = (data.jobs || []).map(j => ({ ...j, fit: fitScore(j) }));
      scored.sort((a, b) => b.fit - a.fit);
      setJobs(scored);
      if (scored.length === 0) setNotification({ msg: "No new jobs found right now — try again later.", type: "error" });
    } catch (err) {
      setNotification({ msg: `Search failed: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Generate CV for selected job
  async function handleGenerateCv() {
    const cv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
    if (!cv) { setNotification({ msg: "Select a CV from your library first", type: "error" }); return; }
    if (!selected) return;
    setIsGenerating(true);
    setCvOutput("");
    setAtsScore(null);
    try {
      const cvBase64 = cv.base64 || localStorage.getItem(`applyiq_cv_${cv.id}`);
      if (!cvBase64) throw new Error("CV not found on this device. Please re-upload your PDF.");
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvBase64, jobDescription: selected.description }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      let output = data.result;
      const scoreMatch = output.match(/\[ATS_SCORE:\s*(\d+)\]/i);
      if (scoreMatch) { setAtsScore(scoreMatch[1]); output = output.replace(scoreMatch[0], "").trim(); }
      setCvOutput(output);
      setNotification({ msg: "ATS resume generated!", type: "success" });
    } catch (err) {
      setNotification({ msg: `CV generation failed: ${err.message}`, type: "error" });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(cvOutput);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function handleDownloadPdf() {
    if (!cvOutput) return;
    try { generateAtsResumePdf(cvOutput); setNotification({ msg: "PDF downloaded!", type: "success" }); }
    catch (err) { setNotification({ msg: "PDF download failed", type: "error" }); }
  }

  function handleApply() {
    if (!selected) return;
    if (!selected.url) {
      setNotification({ msg: "No apply link available for this job.", type: "error" });
      return;
    }
    const a = document.createElement("a");
    a.href = selected.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    if (window.confirm(`Mark "${selected.title}" at ${selected.company} as Applied?`)) {
      saveApplication({
        company: selected.company,
        role: selected.title,
        date: new Date().toISOString().slice(0, 10),
        source: selected.easyApply ? "LinkedIn" : "Company Site",
        status: "Applied",
        salary: selected.salary || "",
        priority: "Target",
        notes: `Applied via ApplyIQ Job Hunt.\n${selected.url}`,
      });
      setSkipped(prev => new Set([...prev, selected.id]));
      setSelected(null);
    }
  }

  function handleSkip(jobId) {
    setSkipped(prev => new Set([...prev, jobId]));
    if (selected?.id === jobId) setSelected(null);
  }

  function handleSelectJob(job) {
    setSelected(job);
    setTab("jd");
    setCvOutput("");
    setAtsScore(null);
  }

  const visibleJobs = jobs.filter(j => {
    if (skipped.has(j.id)) return false;
    if (easyApplyOnly && !j.easyApply) return false;
    return true;
  });

  const activeCv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Keywords */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 dark:text-[#4e6a8a] uppercase tracking-wider shrink-0">Keywords:</span>
          {DEFAULT_KEYWORDS.map(kw => (
            <button
              key={kw}
              onClick={() => toggleKeyword(kw)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors cursor-pointer
                ${activeKeywords.has(kw)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-200 dark:border-[#1a2840] text-gray-400 dark:text-[#4e6a8a] hover:border-blue-400"
                }`}
            >
              {kw}
            </button>
          ))}
        </div>

        {/* Row 2: Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleFindJobs}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm"
          >
            {loading ? <><Spinner /> Searching…</> : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>Find New Jobs</>
            )}
          </button>

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#141e30] rounded-lg p-1">
            {DATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateFilter(opt.value)}
                className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer
                  ${dateFilter === opt.value
                    ? "bg-white dark:bg-[#1a2840] text-gray-900 dark:text-blue-50 shadow-sm"
                    : "text-gray-500 dark:text-[#4e6a8a] hover:text-gray-700 dark:hover:text-blue-50"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-[#8898b0] cursor-pointer select-none">
            <input type="checkbox" checked={easyApplyOnly} onChange={e => setEasyApplyOnly(e.target.checked)} className="accent-blue-600 w-3.5 h-3.5" />
            Easy Apply only
          </label>

          {jobs.length > 0 && (
            <span className="text-[12.5px] text-gray-400 dark:text-[#4e6a8a] ml-auto">
              {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""} · {visibleJobs.filter(j => alreadyApplied(j)).length} already applied
            </span>
          )}
        </div>
      </div>

      {/* Main panel */}
      {jobs.length === 0 && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#1a2840] rounded-2xl">
          <svg className="w-10 h-10 text-gray-300 dark:text-[#2a3a54] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <div className="text-[15px] font-bold text-gray-400 dark:text-[#4e6a8a] mb-1">No jobs loaded yet</div>
          <div className="text-[12.5px] text-gray-400 dark:text-[#3a5070]">Click "Find New Jobs" to search LinkedIn, Indeed & more</div>
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Job list */}
          <div className="w-[300px] shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
            {visibleJobs.map(job => {
              const applied = alreadyApplied(job);
              const isSelected = selected?.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => !applied && handleSelectJob(job)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer
                    ${isSelected
                      ? "border-blue-600 bg-blue-600/10 shadow-sm"
                      : applied
                        ? "border-gray-200 dark:border-[#1a2840] bg-gray-50 dark:bg-[#0e1524] opacity-50 cursor-not-allowed"
                        : "border-gray-200 dark:border-[#1a2840] bg-white dark:bg-[#0e1524] hover:border-blue-400 dark:hover:border-blue-600"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-[13px] font-bold text-gray-900 dark:text-blue-50 leading-snug line-clamp-2">{job.title}</div>
                    <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${fitColor(job.fit)}`}>{job.fit}/10</span>
                  </div>
                  <div className="text-[12px] text-blue-600 dark:text-blue-400 font-semibold truncate">{job.company}</div>
                  <div className="text-[11.5px] text-gray-500 dark:text-[#8898b0] mt-0.5 truncate">{job.location}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {job.easyApply && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-500/20">Easy Apply</span>
                    )}
                    {applied && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">Applied</span>
                    )}
                    {job.employmentType && (
                      <span className="text-[10px] text-gray-400 dark:text-[#4e6a8a]">{job.employmentType}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0e1524] border border-gray-200 dark:border-[#1a2840] rounded-2xl overflow-hidden">

              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-[#1a2840]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-bold text-gray-900 dark:text-blue-50 leading-snug">{selected.title}</div>
                    <div className="text-[13px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">{selected.company}</div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[12px] text-gray-500 dark:text-[#8898b0]">
                      <span>{selected.location}</span>
                      {selected.salary && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selected.salary}</span>}
                      {selected.postedAt && <span>{new Date(selected.postedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg border ${fitColor(selected.fit)}`}>{selected.fit}/10 fit</span>
                    {selected.easyApply && (
                      <span className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-bold border border-blue-500/20">Easy Apply</span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-3">
                  {["jd", "cv"].map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer
                        ${tab === t ? "bg-blue-600 text-white" : "text-gray-500 dark:text-[#8898b0] hover:bg-gray-100 dark:hover:bg-[#141e30]"}`}
                    >
                      {t === "jd" ? "Job Description" : "AI Resume"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {tab === "jd" ? (
                  <pre className="text-[12.5px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                    {selected.description || "No description available."}
                  </pre>
                ) : (
                  <div className="flex flex-col gap-4 h-full">
                    {/* CV selector */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-2 flex-1 flex-wrap">
                        {cvLibrary.length === 0 ? (
                          <button onClick={() => setShowCvModal(true)} className="text-[12.5px] text-blue-600 font-semibold underline cursor-pointer">Add a CV to your library first</button>
                        ) : (
                          cvLibrary.map(cv => (
                            <button
                              key={cv.id}
                              onClick={() => setSelectedCvId(cv.id)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer
                                ${(selectedCvId === cv.id || (!selectedCvId && cv.isDefault))
                                  ? "bg-blue-600/10 border-blue-600 text-blue-600"
                                  : "border-gray-200 dark:border-[#1a2840] text-gray-500 dark:text-[#8898b0] hover:border-blue-400"
                                }`}
                            >
                              {cv.name}
                            </button>
                          ))
                        )}
                      </div>
                      <button
                        onClick={handleGenerateCv}
                        disabled={isGenerating || cvLibrary.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-white rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {isGenerating ? <><Spinner />Generating…</> : "Generate ATS CV"}
                      </button>
                    </div>

                    {/* CV output */}
                    {cvOutput ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {atsScore && (
                            <span className="text-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">ATS Score: {atsScore}/100</span>
                          )}
                          <button onClick={handleCopy} className="px-3 py-1.5 text-[12px] font-semibold border border-gray-200 dark:border-[#1a2840] rounded-lg hover:bg-gray-50 dark:hover:bg-[#141e30] transition-colors cursor-pointer text-gray-700 dark:text-blue-50 w-[100px]">
                            {copySuccess ? "✓ Copied!" : "Copy Text"}
                          </button>
                          <button onClick={handleDownloadPdf} className="px-3 py-1.5 text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
                            Download PDF
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={cvOutput}
                          className="flex-1 w-full resize-none font-mono text-[12px] leading-relaxed bg-gray-50 dark:bg-[#141e30] border border-gray-200 dark:border-[#1a2840] rounded-xl p-4 text-gray-900 dark:text-gray-300 focus:outline-none min-h-[300px]"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#1a2840] rounded-xl py-12">
                        <div className="text-[13px] font-bold text-gray-400 dark:text-[#4e6a8a] mb-1">No CV generated yet</div>
                        <div className="text-[12px] text-gray-400 dark:text-[#3a5070]">Select a CV and click "Generate ATS CV"</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3.5 border-t border-gray-100 dark:border-[#1a2840] flex items-center gap-2">
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  Apply {selected.easyApply ? "(Easy Apply)" : "(Company Site)"}
                </button>
                <button
                  onClick={() => handleSkip(selected.id)}
                  className="px-4 py-2.5 text-[13px] font-semibold text-gray-500 dark:text-[#8898b0] border border-gray-200 dark:border-[#1a2840] rounded-lg hover:bg-gray-50 dark:hover:bg-[#141e30] transition-colors cursor-pointer"
                >
                  Skip
                </button>
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    View Listing →
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#1a2840] rounded-2xl">
              <div className="text-[14px] font-bold text-gray-400 dark:text-[#4e6a8a] mb-1">Select a job to review</div>
              <div className="text-[12.5px] text-gray-400 dark:text-[#3a5070]">Click any card on the left</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
