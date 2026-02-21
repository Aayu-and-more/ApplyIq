import React from "react";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

export const ResumeView = ({ cvLibrary, selectedCvId, setSelectedCvId, setDefaultCv, deleteCv, resumeJD, setResumeJD, resumeOutput, atsScore, isGenerating, handleGenerateResume, handleCopy, handleDownloadPdf, copySuccess, setShowCvModal, t, S }) => {
    const activeCv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
    return (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, height: "calc(100vh - 148px)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
                <div style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={S.cardTitle}>CV Library</div>
                        <button onClick={() => setShowCvModal(true)} style={S.btn("primary")}>Add CV</button>
                    </div>
                    {cvLibrary.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px 0", color: t.textMuted }}>
                            <div style={{ fontSize: 13, marginTop: 10 }}>No CVs yet</div>
                            <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.6 }}>Upload a PDF to get started</div>
                        </div>
                    ) : (
                        cvLibrary.map(cv => (
                            <div key={cv.id} onClick={() => setSelectedCvId(cv.id)}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: `1.5px solid ${selectedCvId === cv.id || (!selectedCvId && cv.isDefault) ? "#2563eb" : t.border}`, background: selectedCvId === cv.id || (!selectedCvId && cv.isDefault) ? "#2563eb12" : t.surface2, transition: "all 0.15s" }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.name}</div>
                                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{cv.fileName} · {cv.addedAt}</div>
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                    {cv.isDefault && <span style={{ fontSize: 10, background: "#10b98120", color: "#10b981", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>Default</span>}
                                    {!cv.isDefault && (
                                        <button onClick={e => { e.stopPropagation(); setDefaultCv(cv.id); }} title="Set as default" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2 }}>
                                            Star
                                        </button>
                                    )}
                                    <button onClick={e => { e.stopPropagation(); deleteCv(cv.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}>
                                        Del
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {activeCv && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>Using: {activeCv.name}</div>}
                </div>

                <div style={{ ...S.card, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={S.cardTitle}>Job Description</div>
                    <textarea value={resumeJD} onChange={e => setResumeJD(e.target.value)}
                        placeholder={"Paste the full job description here…\n\nThe AI will extract ATS keywords, match against your CV, and rewrite sections to maximise match rate."}
                        style={{ ...S.input, flex: 1, resize: "none", lineHeight: 1.65, fontSize: 12.5, marginBottom: 12, minHeight: 200 }}
                    />
                    <button onClick={handleGenerateResume} disabled={isGenerating || !resumeJD.trim() || cvLibrary.length === 0}
                        style={{ ...S.btn("primary"), justifyContent: "center", opacity: (isGenerating || !resumeJD.trim() || cvLibrary.length === 0) ? 0.45 : 1, fontSize: 13.5, padding: "10px" }}>
                        {isGenerating ? "Analysing & Optimising…" : "Generate ATS-Optimised Resume"}
                    </button>
                    {cvLibrary.length === 0 && <div style={{ fontSize: 11, color: "#f97316", marginTop: 8, textAlign: "center" }}>⚠️ Add at least one CV above first</div>}
                </div>
            </div>

            <div style={{ ...S.card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ ...S.cardTitle, marginBottom: 0 }}>ATS-Optimised Resume Output</div>
                        {atsScore && (
                            <div style={{ background: "#10b98120", color: "#10b981", padding: "4px 8px", borderRadius: 6, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                                ATS Score: {atsScore}/100
                            </div>
                        )}
                    </div>

                    {resumeOutput && (
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handleCopy} style={S.btn("secondary")}>
                                {copySuccess ? "Copied!" : "Copy Text"}
                            </button>
                            <button onClick={handleDownloadPdf} style={S.btn("primary")}>
                                Download Optimised CV
                            </button>
                        </div>
                    )}
                </div>
                <textarea readOnly value={resumeOutput} placeholder="Your ATS-optimised, Harvard-format resume will appear here…"
                    style={{ ...S.input, flex: 1, resize: "none", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: t.surface, cursor: "text" }}
                />
            </div>
        </div>
    );
};
