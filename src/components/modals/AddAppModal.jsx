import React from "react";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

export const AddAppModal = ({ form, setForm, handleSave, onClose, t, S }) => (
    <div style={S.overlay} onClick={onClose}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{form.id ? "Edit Application" : "New Application"}</div>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><Icon name="x" size={17} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                {[
                    { label: "Company *", key: "company", type: "text", placeholder: "e.g. Goldman Sachs" },
                    { label: "Role *", key: "role", type: "text", placeholder: "e.g. Risk Analyst" },
                    { label: "Date Applied", key: "date", type: "date" },
                    { label: "Salary Range", key: "salary", type: "text", placeholder: "e.g. £60k–£75k" },
                ].map(f => (
                    <div key={f.key}>
                        <label style={S.label}>{f.label}</label>
                        <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder || ""} style={S.input} />
                    </div>
                ))}
                {[
                    { label: "Status", key: "status", options: KANBAN_COLS },
                    { label: "Priority", key: "priority", options: ["Dream", "Target", "Backup"] },
                    { label: "Source", key: "source", options: ["LinkedIn", "Company Site", "Referral", "Recruiter", "Other"] },
                ].map(f => (
                    <div key={f.key}>
                        <label style={S.label}>{f.label}</label>
                        <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={S.select}>
                            {f.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 13 }}>
                <label style={S.label}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interview prep, contacts, deadlines…" style={{ ...S.input, height: 75, resize: "none", lineHeight: 1.5 }} />
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 20, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={S.btn("secondary")}>Cancel</button>
                <button onClick={handleSave} style={S.btn("primary")}>{form.id ? "Save Changes" : "Add Application"}</button>
            </div>
        </div>
    </div>
);
