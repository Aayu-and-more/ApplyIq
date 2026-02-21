import React, { useRef } from "react";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

export const AddCvModal = ({ cvBeingAdded, setCvBeingAdded, handlePdfUpload, saveCv, onClose, t, S }) => {
    const fileInputRef = useRef(null);
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, width: 440 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Add CV to Library</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><Icon name="x" size={17} /></button>
                </div>
                <label style={S.label}>CV Name / Label</label>
                <input value={cvBeingAdded.name} onChange={e => setCvBeingAdded(p => ({ ...p, name: e.target.value }))}
                    placeholder='e.g. "Finance CV", "Quant CV", "General"' style={{ ...S.input, marginBottom: 16 }} />
                <label style={S.label}>Upload PDF</label>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: "none" }} />
                <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${cvBeingAdded.base64 ? "#2563eb" : t.border}`, borderRadius: 9, padding: "24px", textAlign: "center", cursor: "pointer", background: cvBeingAdded.base64 ? "#2563eb0e" : t.surface2, transition: "all 0.15s", marginBottom: 8 }}>
                    {cvBeingAdded.base64 ? (
                        <div style={{ color: "#2563eb" }}>
                            <Icon name="check" size={22} color="#2563eb" />
                            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{cvBeingAdded.fileName}</div>
                            <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>Click to replace</div>
                        </div>
                    ) : (
                        <div style={{ color: t.textMuted }}>
                            <Icon name="upload" size={22} color={t.textMuted} />
                            <div style={{ fontSize: 13, marginTop: 8 }}>Click to upload PDF</div>
                            <div style={{ fontSize: 11.5, marginTop: 2, opacity: 0.6 }}>Stored locally in your browser</div>
                        </div>
                    )}
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 16 }}>📌 PDF stored in localStorage — never leaves your device until deployed.</div>
                <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={S.btn("secondary")}>Cancel</button>
                    <button onClick={saveCv} disabled={!cvBeingAdded.name.trim() || !cvBeingAdded.base64}
                        style={{ ...S.btn("primary"), opacity: (!cvBeingAdded.name.trim() || !cvBeingAdded.base64) ? 0.45 : 1 }}>
                        <Icon name="plus" size={13} />Save to Library
                    </button>
                </div>
            </div>
        </div>
    );
};
