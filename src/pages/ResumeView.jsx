import React from "react";

export const ResumeView = ({ cvLibrary, selectedCvId, setSelectedCvId, setDefaultCv, deleteCv, resumeJD, setResumeJD, resumeOutput, atsScore, isGenerating, handleGenerateResume, handleCopy, handleDownloadPdf, copySuccess, setShowCvModal }) => {
    const activeCv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 h-[calc(100vh-140px)]">

            {/* Left Column (Input) */}
            <div className="flex flex-col gap-5 overflow-y-auto pr-1 pb-4">

                {/* CV Library Card */}
                <div className="surface rounded-2xl shadow-sm p-5 border flex flex-col min-h-[220px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-[11.5px] font-bold text-muted uppercase tracking-widest">CV Library</div>
                        <button
                            onClick={() => setShowCvModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                        >
                            Add CV
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-2.5">
                        {cvLibrary.length === 0 ? (
                            <div className="flex-1 flex flex-col justify-center items-center py-6 text-muted border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                <div className="text-[13px] font-bold mb-1">No CVs yet</div>
                                <div className="text-[11.5px] opacity-70">Upload a PDF to get started</div>
                            </div>
                        ) : (
                            cvLibrary.map(cv => {
                                const isActive = selectedCvId === cv.id || (!selectedCvId && cv.isDefault);
                                return (
                                    <div key={cv.id}
                                        onClick={() => setSelectedCvId(cv.id)}
                                        className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200
                                            ${isActive
                                                ? "bg-blue-600/10 border-2 border-blue-600 shadow-sm"
                                                : "surface-alt border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm"
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13.5px] font-bold text-gray-900 dark:text-blue-50 truncate mb-0.5">{cv.name}</div>
                                            <div className="text-[11.5px] text-muted truncate">{cv.fileName} · {cv.addedAt}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {cv.isDefault && (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                                                    Default
                                                </span>
                                            )}
                                            {!cv.isDefault && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDefaultCv(cv.id); }}
                                                    title="Set as default"
                                                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={e => { e.stopPropagation(); deleteCv(cv.id); }}
                                                title="Delete CV"
                                                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Job Description Input Card */}
                <div className="surface rounded-2xl shadow-sm p-5 border flex-1 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-[11.5px] font-bold text-muted uppercase tracking-widest">Job Description</div>
                        {activeCv && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Using: {activeCv.name}
                            </div>
                        )}
                    </div>

                    <textarea
                        value={resumeJD}
                        onChange={e => setResumeJD(e.target.value)}
                        placeholder="Paste the full job description here…\n\nThe AI will extract ATS keywords, match them against your CV, and rewrite the bullet points to maximise your ATS match rate for this specific role."
                        className="flex-1 w-full resize-none bg-gray-50 dark:bg-[#141e30] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-[13px] leading-relaxed text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mb-4 placeholder-gray-400 dark:placeholder-gray-600 h-[200px]"
                    />

                    <button
                        onClick={handleGenerateResume}
                        disabled={isGenerating || !resumeJD.trim() || cvLibrary.length === 0}
                        className={`w-full flex justify-center py-3.5 rounded-xl text-[14px] font-bold transition-all shadow-sm ${(isGenerating || !resumeJD.trim() || cvLibrary.length === 0)
                                ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-blue-600/20"
                            }`}
                    >
                        {isGenerating ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Analysing & Optimising…
                            </span>
                        ) : "Generate ATS-Optimised Resume"}
                    </button>

                    {cvLibrary.length === 0 && (
                        <div className="text-[11.5px] font-bold text-orange-500 mt-3 text-center flex justify-center items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            Add at least one CV to library first
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column (Output) */}
            <div className="surface rounded-2xl shadow-sm p-5 border flex flex-col h-full min-h-[500px]">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="text-[12px] font-bold text-gray-900 dark:text-blue-50 uppercase tracking-widest">ATS-Optimised Resume Output</div>
                        {atsScore && (
                            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 border border-emerald-500/20 rounded-lg text-[13px] font-bold tracking-tight shadow-sm flex items-center gap-1.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                ATS Score: {atsScore}/100
                            </div>
                        )}
                    </div>

                    {resumeOutput && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-white dark:bg-[#141e30] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-blue-50 rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer shadow-sm w-[110px]"
                            >
                                {copySuccess ? "✓ Copied!" : "Copy Text"}
                            </button>
                            <button
                                onClick={handleDownloadPdf}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg text-[12.5px] font-semibold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="2V1" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.83" /></svg>
                                Download Optimised PDF
                            </button>
                        </div>
                    )}
                </div>

                <textarea
                    readOnly
                    value={resumeOutput}
                    placeholder="Your ATS-optimised, Harvard-format resume will appear here…"
                    className="flex-1 w-full resize-none font-mono text-[13px] leading-[1.6] bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-gray-900 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors custom-scrollbar"
                />
            </div>
        </div>
    );
};
