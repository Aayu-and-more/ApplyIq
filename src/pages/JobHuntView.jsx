import { useState, useEffect } from "react";
import { generateAtsResumePdf } from "../lib/resumePdfGenerator";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function scoreColor(score) {
  if (score >= 70) return { bg: "#10b98120", color: "#10b981", border: "#10b98140" };
  if (score >= 50) return { bg: "#f59e0b20", color: "#f59e0b", border: "#f59e0b40" };
  return { bg: "#ef444420", color: "#ef4444", border: "#ef444440" };
}

function sponsorBadgeCls(tier) {
  if (tier === "high") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  if (tier === "medium") return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  return "";
}

function sourceLabel(src) {
  if (src === "linkedin") return "LinkedIn";
  if (src === "indeed") return "Indeed";
  return "Direct";
}

export const JobHuntView = ({
  apps,
  isRunningDiscovery,
  handlePullJobs,
  approveDiscovery,
  skipDiscovery,
  cvLibrary = [],
  selectedCvId,
  setSelectedCvId,
  setShowCvModal,
  setNotification,
}) => {
  const discoveredJobs = (apps || [])
    .filter(a => a.status === "Discovered")
    .sort((a, b) => (b.discoveryScore || 0) - (a.discoveryScore || 0));

  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState("jd");
  const [cvOutput, setCvOutput] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Clear selected if it was approved/skipped (no longer in apps)
  useEffect(() => {
    if (selected && !apps.find(a => a.id === selected.id)) {
      setSelected(null);
      setCvOutput("");
      setAtsScore(null);
    }
  }, [apps, selected]);

  const filtered = discoveredJobs.filter(j =>
    sourceFilter === "all" || j.discoverySource === sourceFilter
  );

  const sourceCounts = {
    linkedin: discoveredJobs.filter(j => j.discoverySource === "linkedin").length,
    indeed: discoveredJobs.filter(j => j.discoverySource === "indeed").length,
    company: discoveredJobs.filter(j => j.discoverySource === "company").length,
  };

  function openJob(job) {
    setSelected(job);
    setDrawerTab("jd");
    setCvOutput("");
    setAtsScore(null);
  }

  async function handleApply(job) {
    const target = job || selected;
    if (!target) return;
    if (target.jobUrl) {
      const a = document.createElement("a");
      a.href = target.jobUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    await approveDiscovery(target.id);
    if (selected?.id === target.id) setSelected(null);
  }

  async function handleSkip(job) {
    const target = job || selected;
    if (!target) return;
    await skipDiscovery(target.id);
    if (selected?.id === target.id) setSelected(null);
  }

  async function handleGenerateCv() {
    const cv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
    if (!cv) { setNotification({ msg: "Select a CV from your library first", type: "error" }); return; }
    if (!selected?.jobDescription) { setNotification({ msg: "No job description stored for this role", type: "error" }); return; }
    setIsGenerating(true);
    setCvOutput("");
    setAtsScore(null);
    try {
      const cvBase64 = cv.base64 || localStorage.getItem(`applyiq_cv_${cv.id}`);
      if (!cvBase64) throw new Error("CV not found on this device. Please re-upload.");
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvBase64, jobDescription: selected.jobDescription }),
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
    catch { setNotification({ msg: "PDF download failed", type: "error" }); }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handlePullJobs}
          disabled={isRunningDiscovery}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm"
        >
          {isRunningDiscovery ? (
            <><Spinner />Scraping... (~15s)</>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Pull Jobs
            </>
          )}
        </button>

        {/* Source filter */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#141e30] rounded-lg p-1">
          {[
            { key: "all", label: `All (${discoveredJobs.length})` },
            { key: "linkedin", label: `LinkedIn (${sourceCounts.linkedin})` },
            { key: "indeed", label: `Indeed (${sourceCounts.indeed})` },
            { key: "company", label: `Direct (${sourceCounts.company})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer
                ${sourceFilter === key
                  ? "bg-white dark:bg-[#1a2840] text-gray-900 dark:text-blue-50 shadow-sm"
                  : "text-gray-500 dark:text-[#4e6a8a] hover:text-gray-700 dark:hover:text-blue-50"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-[12px] text-gray-400 dark:text-[#4e6a8a] ml-auto">
          {discoveredJobs.length === 0
            ? "Click Pull Jobs to discover roles in Ireland & EU"
            : `${filtered.length} job${filtered.length !== 1 ? "s" : ""} • Apply or Skip to update your pipeline`}
        </span>
      </div>

      {/* Main panel */}
      {discoveredJobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#1a2840] rounded-2xl gap-3">
          <svg className="w-12 h-12 text-gray-300 dark:text-[#2a3a54]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <div className="text-[15px] font-bold text-gray-400 dark:text-[#4e6a8a]">No jobs discovered yet</div>
          <div className="text-[12.5px] text-gray-400 dark:text-[#3a5070]">Pull Jobs scrapes LinkedIn, Indeed & company sites for graduate finance roles in Ireland & EU</div>
          <button
            onClick={handlePullJobs}
            disabled={isRunningDiscovery}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer mt-2"
          >
            {isRunningDiscovery ? <><Spinner />Scraping...</> : "Pull Jobs Now"}
          </button>
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Job list */}
          <div className="w-[300px] shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="text-[13px] text-gray-400 dark:text-[#4e6a8a] text-center py-8">
                No {sourceFilter} jobs discovered
              </div>
            ) : filtered.map(job => {
              const sc = scoreColor(job.discoveryScore || 0);
              const isSelected = selected?.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => openJob(job)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer
                    ${isSelected
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-gray-200 dark:border-[#1a2840] bg-white dark:bg-[#0e1524] hover:border-violet-400 dark:hover:border-violet-600"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="text-[13px] font-bold text-gray-900 dark:text-blue-50 leading-snug line-clamp-2">{job.role}</div>
                    {job.discoveryScore != null && (
                      <span
                        className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md border"
                        style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}
                      >
                        {job.discoveryScore}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-violet-600 dark:text-violet-400 font-semibold truncate">{job.company}</div>
                  <div className="text-[11.5px] text-gray-500 dark:text-[#8898b0] mt-0.5 truncate">{job.location || "Ireland"}</div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {job.discoverySource && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-violet-500/20 bg-violet-500/10 text-violet-400">
                        {sourceLabel(job.discoverySource)}
                      </span>
                    )}
                    {job.sponsorTier && job.sponsorTier !== "unknown" && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${sponsorBadgeCls(job.sponsorTier)}`}>
                        {job.sponsorTier === "high" ? "High" : "Med"} sponsor
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      onClick={e => { e.stopPropagation(); handleApply(job); }}
                      className="flex-1 px-2 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleSkip(job); }}
                      className="px-2 py-1.5 text-[11px] font-semibold border border-gray-200 dark:border-[#1a2840] text-gray-500 dark:text-[#8898b0] rounded-lg hover:bg-gray-50 dark:hover:bg-[#141e30] cursor-pointer"
                    >
                      Skip
                    </button>
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
                    <div className="text-[16px] font-bold text-gray-900 dark:text-blue-50 leading-snug">{selected.role}</div>
                    <div className="text-[13px] text-violet-600 dark:text-violet-400 font-semibold mt-0.5">{selected.company}</div>
                    <div className="text-[12px] text-gray-500 dark:text-[#8898b0] mt-1">{selected.location}</div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#141e30] transition-colors cursor-pointer shrink-0 text-gray-500"
                  >
                    <XIcon />
                  </button>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {selected.discoveryScore != null && (() => {
                    const sc = scoreColor(selected.discoveryScore);
                    return (
                      <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg border"
                        style={{ backgroundColor: sc.bg, color: sc.color, borderColor: sc.border }}>
                        Score {selected.discoveryScore}/100
                      </span>
                    );
                  })()}
                  {selected.sponsorTier && selected.sponsorTier !== "unknown" && (
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border ${sponsorBadgeCls(selected.sponsorTier)}`}>
                      {selected.sponsorTier === "high" ? "High" : "Medium"} Sponsor
                    </span>
                  )}
                  {selected.discoverySource && (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg font-bold border border-violet-500/20 bg-violet-500/10 text-violet-400">
                      {sourceLabel(selected.discoverySource)}
                    </span>
                  )}
                  {selected.salary && (
                    <span className="text-[11px] text-emerald-500 font-semibold">{selected.salary}</span>
                  )}
                  {selected.jobUrl && (
                    <a
                      href={selected.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[12px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      View listing
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-3">
                  {["jd", "cv"].map(t => (
                    <button
                      key={t}
                      onClick={() => setDrawerTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer
                        ${drawerTab === t ? "bg-violet-600 text-white" : "text-gray-500 dark:text-[#8898b0] hover:bg-gray-100 dark:hover:bg-[#141e30]"}`}
                    >
                      {t === "jd" ? "Job Description" : "AI Resume"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {drawerTab === "jd" ? (
                  <pre className="text-[12.5px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                    {selected.jobDescription || "No description stored for this role."}
                  </pre>
                ) : (
                  <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-2 flex-1 flex-wrap">
                        {cvLibrary.length === 0 ? (
                          <button onClick={() => setShowCvModal(true)} className="text-[12.5px] text-blue-600 font-semibold underline cursor-pointer">
                            Add a CV to your library first
                          </button>
                        ) : (
                          cvLibrary.map(cv => (
                            <button
                              key={cv.id}
                              onClick={() => setSelectedCvId(cv.id)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer
                                ${(selectedCvId === cv.id || (!selectedCvId && cv.isDefault))
                                  ? "bg-violet-600/10 border-violet-600 text-violet-600"
                                  : "border-gray-200 dark:border-[#1a2840] text-gray-500 dark:text-[#8898b0] hover:border-violet-400"
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
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/40 text-white rounded-lg text-[12.5px] font-semibold cursor-pointer shrink-0"
                      >
                        {isGenerating ? <><Spinner /> Generating...</> : "Generate ATS CV"}
                      </button>
                    </div>

                    {cvOutput ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {atsScore && (
                            <span className="text-[12px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 font-bold">
                              ATS {atsScore}/100
                            </span>
                          )}
                          <button onClick={handleCopy} className="px-3 py-1.5 text-[12px] font-semibold border border-gray-200 dark:border-[#1a2840] rounded-lg hover:bg-gray-50 dark:hover:bg-[#141e30] cursor-pointer text-gray-700 dark:text-blue-50 w-[80px]">
                            {copySuccess ? "Copied!" : "Copy"}
                          </button>
                          <button onClick={handleDownloadPdf} className="px-3 py-1.5 text-[12px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg cursor-pointer">
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
                        <div className="text-[12px] text-gray-400 dark:text-[#3a5070]">Select a CV and click Generate ATS CV</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1a2840] flex items-center gap-2">
                <button
                  onClick={() => handleApply(selected)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Apply (opens listing)
                </button>
                <button
                  onClick={() => handleSkip(selected)}
                  className="px-4 py-2.5 text-[13px] font-semibold text-gray-500 dark:text-[#8898b0] border border-gray-200 dark:border-[#1a2840] rounded-lg hover:bg-gray-50 dark:hover:bg-[#141e30] transition-colors cursor-pointer"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 dark:border-[#1a2840] rounded-2xl">
              <div className="text-[14px] font-bold text-gray-400 dark:text-[#4e6a8a] mb-1">Select a job to review</div>
              <div className="text-[12.5px] text-gray-400 dark:text-[#3a5070]">Click any card on the left to see the full description and generate an ATS CV</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
