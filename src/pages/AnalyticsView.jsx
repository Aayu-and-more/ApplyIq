import React from "react";
import {
    LineChart, Line, BarChart, Bar, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export const AnalyticsView = ({ apps, staleApps, responseRate, interviewRate, offerCount, t, S }) => {
    const monthly = [
        { month: "Oct", apps: 3, responses: 1 }, { month: "Nov", apps: 7, responses: 2 },
        { month: "Dec", apps: 12, responses: 4 }, { month: "Jan", apps: 18, responses: 7 }, { month: "Feb", apps: 8, responses: 3 },
    ];
    const funnel = [
        { stage: "Applied", count: apps.length },
        { stage: "Screening", count: apps.filter(a => ["Screening", "Interview", "Offer"].includes(a.status)).length },
        { stage: "Interview", count: apps.filter(a => ["Interview", "Offer"].includes(a.status)).length },
        { stage: "Offer", count: offerCount },
    ];
    const today = new Date();

    const STATUS_COLORS = {
        Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
        Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
    };

    return (
        <div>
            <div style={S.row}>
                <div style={{ ...S.card, flex: 2 }}>
                    <div style={S.cardTitle}>Monthly Volume vs Response Rate</div>
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11.5 }} />
                            <Line type="monotone" dataKey="apps" stroke={t.accent} strokeWidth={2.5} dot={{ r: 3.5 }} name="Applications" />
                            <Line type="monotone" dataKey="responses" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5 }} name="Responses" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ ...S.card, flex: 1 }}>
                    <div style={S.cardTitle}>Conversion Funnel</div>
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} width={65} />
                            <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12 }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {funnel.map((_, i) => <Cell key={i} fill={[t.accent, "#f59e0b", "#8b5cf6", "#10b981"][i]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={S.row}>
                {[
                    { label: "Response Rate", value: `${responseRate}%`, sub: "Got at least a screening call", color: t.accent },
                    { label: "Interview Rate", value: `${interviewRate}%`, sub: "Reached interview stage", color: "#8b5cf6" },
                    { label: "Offer Rate", value: `${apps.length ? Math.round((offerCount / apps.length) * 100) : 0}%`, sub: "Received an offer", color: "#10b981" },
                    { label: "Active Pipeline", value: apps.filter(a => ["Screening", "Interview"].includes(a.status)).length, sub: "In active stages", color: "#f59e0b" },
                ].map((m, i) => (
                    <div key={i} style={{ ...S.statCard(m.color), flex: 1 }}>
                        <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>{m.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 5 }}>{m.sub}</div>
                    </div>
                ))}
            </div>
            {staleApps.length > 0 && (
                <div style={S.card}>
                    <div style={S.cardTitle}>⚠️ Stale Applications — Follow-Up Needed</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>{["Company", "Role", "Applied", "Days Stale", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                        <tbody>
                            {staleApps.map(a => {
                                const days = Math.floor((today - new Date(a.date)) / 86400000);
                                return (
                                    <tr key={a.id}>
                                        <td style={{ ...S.td, fontWeight: 600 }}>{a.company}</td>
                                        <td style={{ ...S.td, fontSize: 12.5, color: t.textMuted }}>{a.role}</td>
                                        <td style={{ ...S.td, fontSize: 11.5, color: t.textMuted }}>{a.date}</td>
                                        <td style={{ ...S.td, color: "#f97316", fontWeight: 700 }}>{days}d</td>
                                        <td style={S.td}><span style={S.badge(a.status)}>{a.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
