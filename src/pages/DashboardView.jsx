import React from "react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const Icon = ({ name, size = 16, color = "currentColor" }) => {
    // We'll bring this over properly when we extract Icon, but for now we fallback
    return <span style={{ fontSize: size, color }}>Icon</span>;
};

// Colors config that was in App.jsx
const STATUS_COLORS = {
    Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
    Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
};

const WEEKLY_DATA = [
    { week: "W1", apps: 12 }, { week: "W2", apps: 15 },
    { week: "W3", apps: 8 }, { week: "W4", apps: 22 },
];

export const DashboardView = ({ apps, staleApps, thisWeekApps, weeklyGoal, goalPct, responseRate, offerCount, interviewRate, statusDist, setView, setShowGoalModal, exportCSV, t, S }) => (
    <div>
        {staleApps.length > 0 && (
            <div onClick={() => setView("analytics")} style={{ background: "#f9731610", border: "1px solid #f97316", borderRadius: 9, padding: "11px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, color: "#f97316", fontSize: 13, cursor: "pointer" }}>
                <strong>{staleApps.length} application{staleApps.length > 1 ? "s" : ""} need follow-up</strong> — click to review
            </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
                { label: "Total Applied", value: apps.length, sub: "All time", color: t.accent },
                { label: "This Week", value: thisWeekApps, sub: `Goal: ${weeklyGoal} · ${goalPct}%`, color: "#10b981" },
                { label: "Response Rate", value: `${responseRate}%`, sub: "Screening or above", color: "#f59e0b" },
                { label: "Active Offers", value: offerCount, sub: `${interviewRate}% interview rate`, color: "#8b5cf6" },
            ].map((stat, i) => (
                <div key={i} style={S.statCard(stat.color)}>
                    <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>{stat.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 5 }}>{stat.sub}</div>
                </div>
            ))}
        </div>

        <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={S.cardTitle}>Weekly Application Goal</div>
                    <div style={{ fontSize: 13, color: t.textMuted }}>{thisWeekApps} of {weeklyGoal} applications this week</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: goalPct >= 100 ? "#10b981" : t.accent }}>{goalPct}%</div>
                    <button onClick={() => setShowGoalModal(true)} style={S.btn("secondary")}>Edit Goal</button>
                </div>
            </div>
            <div style={S.goalBar}>
                <div style={{ height: "100%", borderRadius: 99, width: `${goalPct}%`, background: goalPct >= 100 ? "#10b981" : t.accent, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 11.5, color: t.textMuted }}>{goalPct >= 100 ? "🎯 Goal achieved this week!" : `${weeklyGoal - thisWeekApps} more to hit your goal`}</div>
        </div>

        <div style={S.row}>
            <div style={{ ...S.card, flex: 2 }}>
                <div style={S.cardTitle}>Applications Per Week</div>
                <ResponsiveContainer width="100%" height={175}>
                    <BarChart data={WEEKLY_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                        <XAxis dataKey="week" tick={{ fontSize: 10.5, fill: t.textMuted }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10.5, fill: t.textMuted }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12 }} />
                        <Bar dataKey="apps" fill={t.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div style={{ ...S.card, flex: 1 }}>
                <div style={S.cardTitle}>By Status</div>
                <ResponsiveContainer width="100%" height={175}>
                    <PieChart>
                        <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                            {statusDist.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#6b7280"} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, fontSize: 12 }} />
                    </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 10px", marginTop: 6 }}>
                    {statusDist.map((sd, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: t.textMuted }}>
                            <div style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_COLORS[sd.name] }} />
                            {sd.name} ({sd.value})
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={S.cardTitle}>Recent Applications</div>
                <button onClick={exportCSV} style={S.btn("secondary")}>Export CSV</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Company", "Role", "Date", "Status", "Priority", "Salary"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                    {apps.slice(0, 6).map(a => (
                        <tr key={a.id}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{a.company}</td>
                            <td style={{ ...S.td, color: t.textMuted, fontSize: 12.5 }}>{a.role}</td>
                            <td style={{ ...S.td, color: t.textMuted, fontSize: 11.5 }}>{a.date}</td>
                            <td style={S.td}><span style={S.badge(a.status)}>{a.status}</span></td>
                            <td style={S.td}><span style={S.prioBadge(a.priority)}>{a.priority}</span></td>
                            <td style={{ ...S.td, color: t.textMuted, fontSize: 11.5 }}>{a.salary || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
