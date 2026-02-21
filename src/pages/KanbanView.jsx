import React, { useState } from "react";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

const STATUS_COLORS = {
    Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
    Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
};

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

export const KanbanView = ({ apps, handleKanbanDrop, t, S }) => {
    const [dragging, setDragging] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    return (
        <div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12 }}>
                {KANBAN_COLS.map(col => {
                    const colApps = apps.filter(a => a.status === col);
                    return (
                        <div key={col}
                            style={{ minWidth: 175, flex: 1, background: t.surface2, border: `1px solid ${dragOver === col ? STATUS_COLORS[col] : t.border}`, borderTop: `3px solid ${STATUS_COLORS[col] || "#6b7280"}`, borderRadius: 10, padding: "12px 10px", transition: "border 0.15s" }}
                            onDragOver={e => { e.preventDefault(); setDragOver(col); }}
                            onDrop={() => { if (dragging) handleKanbanDrop(dragging, col); setDragging(null); setDragOver(null); }}
                            onDragLeave={() => setDragOver(null)}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[col] || "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>{col}</div>
                                <div style={{ fontSize: 10.5, background: (STATUS_COLORS[col] || "#6b7280") + "22", color: STATUS_COLORS[col] || "#6b7280", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>{colApps.length}</div>
                            </div>
                            {colApps.map(a => (
                                <div key={a.id}
                                    style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${STATUS_COLORS[a.status]}`, borderRadius: 7, padding: "10px", marginBottom: 7, cursor: "grab" }}
                                    draggable onDragStart={() => setDragging(a.id)}
                                >
                                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{a.company}</div>
                                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 7 }}>{a.role}</div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={S.prioBadge(a.priority)}>{a.priority}</span>
                                        <span style={{ fontSize: 10.5, color: t.textMuted }}>{a.date}</span>
                                    </div>
                                    {a.salary && <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 4 }}>{a.salary}</div>}
                                    {a.followUp && <div style={{ fontSize: 10.5, color: "#f97316", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}><Icon name="bell" size={10} color="#f97316" />Follow up</div>}
                                </div>
                            ))}
                            {colApps.length === 0 && <div style={{ fontSize: 11.5, color: t.textMuted, textAlign: "center", padding: "18px 0", opacity: 0.4 }}>Drop here</div>}
                        </div>
                    );
                })}
            </div>
            <div style={{ fontSize: 11.5, color: t.textMuted, textAlign: "center", marginTop: 4 }}>💡 Drag cards between columns to update status</div>
        </div>
    );
};
