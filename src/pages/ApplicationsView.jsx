import React from "react";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

export const ApplicationsView = ({ filteredApps, searchTerm, setSearchTerm, filterStatus, setFilterStatus, handleEdit, handleDelete, setShowAddModal, exportCSV, t, S }) => (
    <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Icon name="search" size={14} color={t.textMuted} />
                </div>
                <input placeholder="Search company or role…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...S.input, paddingLeft: 34 }} />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.select, width: 150 }}>
                <option>All</option>
                {KANBAN_COLS.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={exportCSV} style={S.btn("secondary")}>CSV</button>
            <button onClick={() => setShowAddModal(true)} style={S.btn("primary")}>Add Application</button>
        </div>
        <div style={S.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Company", "Role", "Date", "Source", "Status", "Priority", "Salary", "Notes", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                    {filteredApps.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: t.textMuted, padding: 28 }}>No applications found</td></tr>}
                    {filteredApps.map(a => (
                        <tr key={a.id} onMouseEnter={e => e.currentTarget.style.background = t.surface2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{a.company}</td>
                            <td style={{ ...S.td, fontSize: 12.5, color: t.textMuted }}>{a.role}</td>
                            <td style={{ ...S.td, fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap" }}>{a.date}</td>
                            <td style={{ ...S.td, fontSize: 11.5, color: t.textMuted }}>{a.source}</td>
                            <td style={S.td}><span style={S.badge(a.status)}>{a.status}</span></td>
                            <td style={S.td}><span style={S.prioBadge(a.priority)}>{a.priority}</span></td>
                            <td style={{ ...S.td, fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap" }}>{a.salary || "—"}</td>
                            <td style={{ ...S.td, fontSize: 11.5, color: t.textMuted, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notes || "—"}</td>
                            <td style={S.td}>
                                <div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={() => handleEdit(a)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 3 }}>Edit</button>
                                    <button onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 3 }}>Del</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
