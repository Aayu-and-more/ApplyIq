import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { generateAtsResumePdf } from "./resumePdfGenerator";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
  Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
};
const PRIORITY_COLORS = { Dream: "#f59e0b", Target: "#3b82f6", Backup: "#6b7280" };
const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];
const LS = { APPS: "applyiq_apps", DARK: "applyiq_dark", GOAL: "applyiq_goal", CVS: "applyiq_cvs" };
const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: "dashboard" },
  { id: "kanban",       label: "Pipeline",     icon: "kanban"    },
  { id: "applications", label: "Applications", icon: "table"     },
  { id: "analytics",    label: "Analytics",    icon: "chart"     },
  { id: "resume",       label: "AI Resume",    icon: "resume"    },
];
const SEED_APPS = [
  { id:1, company:"Goldman Sachs",  role:"Analyst, Risk Management",     date:"2025-01-28", source:"LinkedIn", status:"Interview", salary:"£70k–£85k",  priority:"Dream",  notes:"3rd round scheduled Feb 12",      followUp:false },
  { id:2, company:"BlackRock",      role:"Portfolio Analytics Associate", date:"2025-01-25", source:"LinkedIn", status:"Screening", salary:"£65k–£75k",  priority:"Dream",  notes:"HR call done, awaiting next step", followUp:true  },
  { id:3, company:"Barclays",       role:"Quantitative Analyst",          date:"2025-01-22", source:"LinkedIn", status:"Applied",   salary:"£60k–£72k",  priority:"Target", notes:"",                                 followUp:true  },
  { id:4, company:"HSBC",           role:"FX Derivatives Analyst",        date:"2025-01-20", source:"LinkedIn", status:"Rejected",  salary:"£58k–£68k",  priority:"Target", notes:"Rejected after phone screen",      followUp:false },
  { id:5, company:"Citadel",        role:"Quantitative Research",         date:"2025-01-18", source:"LinkedIn", status:"Offer",     salary:"£90k–£120k", priority:"Dream",  notes:"OFFER RECEIVED — deciding",        followUp:false },
  { id:6, company:"JP Morgan",      role:"Markets Associate",             date:"2025-01-30", source:"LinkedIn", status:"Applied",   salary:"£68k–£80k",  priority:"Dream",  notes:"",                                 followUp:false },
  { id:7, company:"Two Sigma",      role:"Quant Finance Analyst",         date:"2025-01-26", source:"LinkedIn", status:"Interview", salary:"£85k–£110k", priority:"Dream",  notes:"Technical round booked",           followUp:false },
  { id:8, company:"Monzo",          role:"Credit Risk Analyst",           date:"2025-02-03", source:"LinkedIn", status:"Screening", salary:"£52k–£65k",  priority:"Backup", notes:"Online assessment sent",           followUp:false },
];
const WEEKLY_DATA = [
  { week:"Dec W3", apps:2 },{ week:"Dec W4", apps:4 },{ week:"Jan W1", apps:6 },
  { week:"Jan W2", apps:8 },{ week:"Jan W3", apps:5 },{ week:"Jan W4", apps:9 },{ week:"Feb W1", apps:7 },
];

// ─── LOCALSTORAGE HELPERS ─────────────────────────────────────────────────────
const lsGet = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── ICON ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    kanban:    <><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></>,
    table:     <><path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/></>,
    chart:     <><path d="M3 3v18h18"/><path d="M7 16l4-6 4 4 4-8"/></>,
    resume:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>,
    sun:       <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></>,
    moon:      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:     <polyline points="20 6 9 17 4 12"/>,
    zap:       <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    upload:    <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
    file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    download:  <><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.83"/></>,
    star:      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    target:    <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    copy:      <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

// ─── THEME + STYLE FACTORIES ──────────────────────────────────────────────────
// These are plain functions, not components — safe to call inside ApplyIQ
const buildTheme = (dark) => ({
  bg:        dark ? "#080d1a" : "#f0f4fa",
  surface:   dark ? "#0e1524" : "#ffffff",
  surface2:  dark ? "#141e30" : "#f6f9fd",
  border:    dark ? "#1a2840" : "#dde3ef",
  text:      dark ? "#dce8f8" : "#111827",
  textMuted: dark ? "#4e6a8a" : "#8898b0",
  accent:    "#2563eb",
});

const buildStyles = (t) => ({
  card:      { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px" },
  cardTitle: { fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 },
  statCard:  (color) => ({ background: t.surface, border: `1px solid ${t.border}`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: "18px 20px" }),
  badge:     (status) => ({ display: "inline-flex", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: (STATUS_COLORS[status] || "#6b7280") + "22", color: STATUS_COLORS[status] || "#6b7280" }),
  prioBadge: (p) => ({ display: "inline-flex", padding: "2px 8px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: (PRIORITY_COLORS[p] || "#6b7280") + "22", color: PRIORITY_COLORS[p] || "#6b7280" }),
  input:     { width: "100%", padding: "9px 13px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 13.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  select:    { width: "100%", padding: "9px 13px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" },
  label:     { fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" },
  btn: (variant) => {
    const base = { padding: "9px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6 };
    if (variant === "primary") return { ...base, background: "#2563eb", color: "#fff", border: "none" };
    if (variant === "danger")  return { ...base, background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" };
    return { ...base, background: t.surface2, color: t.text, border: `1px solid ${t.border}` };
  },
  th:      { textAlign: "left", padding: "9px 13px", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${t.border}` },
  td:      { padding: "11px 13px", fontSize: 13, borderBottom: `1px solid ${t.border}` },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:   { background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 28, width: 500, maxWidth: "100%", zIndex: 51, maxHeight: "90vh", overflowY: "auto" },
  goalBar: { height: 9, borderRadius: 99, background: t.border, overflow: "hidden", margin: "8px 0 5px" },
  row:     { display: "flex", gap: 14, marginBottom: 20 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS — all defined OUTSIDE ApplyIQ()
// KEY LESSON: Never define a component inside another component's render.
// React would treat it as a brand-new component type every render, unmounting
// and remounting it — which destroys input focus after every keystroke.
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardView = ({ apps, staleApps, thisWeekApps, weeklyGoal, goalPct, responseRate, offerCount, interviewRate, statusDist, setView, setShowGoalModal, exportCSV, t, S }) => (
  <div>
    {staleApps.length > 0 && (
      <div onClick={() => setView("analytics")} style={{ background: "#f9731610", border: "1px solid #f97316", borderRadius: 9, padding: "11px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, color: "#f97316", fontSize: 13, cursor: "pointer" }}>
        <Icon name="alert" size={15} color="#f97316" />
        <strong>{staleApps.length} application{staleApps.length > 1 ? "s" : ""} need follow-up</strong> — click to review
      </div>
    )}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
      {[
        { label: "Total Applied",  value: apps.length,       sub: "All time",                          color: t.accent  },
        { label: "This Week",      value: thisWeekApps,       sub: `Goal: ${weeklyGoal} · ${goalPct}%`, color: "#10b981" },
        { label: "Response Rate",  value: `${responseRate}%`, sub: "Screening or above",                color: "#f59e0b" },
        { label: "Active Offers",  value: offerCount,         sub: `${interviewRate}% interview rate`,  color: "#8b5cf6" },
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
          <button onClick={() => setShowGoalModal(true)} style={S.btn("secondary")}><Icon name="target" size={13} />Edit Goal</button>
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
        <button onClick={exportCSV} style={S.btn("secondary")}><Icon name="download" size={12} />Export CSV</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Company","Role","Date","Status","Priority","Salary"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
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

const KanbanView = ({ apps, handleKanbanDrop, t, S }) => {
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

const ApplicationsView = ({ filteredApps, searchTerm, setSearchTerm, filterStatus, setFilterStatus, handleEdit, handleDelete, setShowAddModal, exportCSV, t, S }) => (
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
      <button onClick={exportCSV} style={S.btn("secondary")}><Icon name="download" size={13} />CSV</button>
      <button onClick={() => setShowAddModal(true)} style={S.btn("primary")}><Icon name="plus" size={13} />Add Application</button>
    </div>
    <div style={S.card}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Company","Role","Date","Source","Status","Priority","Salary","Notes",""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
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
                  <button onClick={() => handleEdit(a)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 3 }}><Icon name="edit" size={13} /></button>
                  <button onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 3 }}><Icon name="trash" size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AnalyticsView = ({ apps, staleApps, responseRate, interviewRate, offerCount, t, S }) => {
  const monthly = [
    { month: "Oct", apps: 3, responses: 1 }, { month: "Nov", apps: 7, responses: 2 },
    { month: "Dec", apps: 12, responses: 4 }, { month: "Jan", apps: 18, responses: 7 }, { month: "Feb", apps: 8, responses: 3 },
  ];
  const funnel = [
    { stage: "Applied",   count: apps.length },
    { stage: "Screening", count: apps.filter(a => ["Screening","Interview","Offer"].includes(a.status)).length },
    { stage: "Interview", count: apps.filter(a => ["Interview","Offer"].includes(a.status)).length },
    { stage: "Offer",     count: offerCount },
  ];
  const today = new Date();
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
                {funnel.map((_, i) => <Cell key={i} fill={[t.accent,"#f59e0b","#8b5cf6","#10b981"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={S.row}>
        {[
          { label: "Response Rate",   value: `${responseRate}%`,  sub: "Got at least a screening call",   color: t.accent  },
          { label: "Interview Rate",  value: `${interviewRate}%`, sub: "Reached interview stage",          color: "#8b5cf6" },
          { label: "Offer Rate",      value: `${apps.length ? Math.round((offerCount/apps.length)*100) : 0}%`, sub: "Received an offer", color: "#10b981" },
          { label: "Active Pipeline", value: apps.filter(a => ["Screening","Interview"].includes(a.status)).length, sub: "In active stages", color: "#f59e0b" },
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
            <thead><tr>{["Company","Role","Applied","Days Stale","Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
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

const ResumeView = ({ cvLibrary, selectedCvId, setSelectedCvId, setDefaultCv, deleteCv, resumeJD, setResumeJD, resumeOutput, isGenerating, handleGenerateResume, handleCopy, copySuccess, setShowCvModal, t, S }) => {
  const activeCv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, height: "calc(100vh - 148px)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={S.cardTitle}>CV Library</div>
            <button onClick={() => setShowCvModal(true)} style={S.btn("primary")}><Icon name="plus" size={12} />Add CV</button>
          </div>
          {cvLibrary.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: t.textMuted }}>
              <Icon name="file" size={28} color={t.textMuted} />
              <div style={{ fontSize: 13, marginTop: 10 }}>No CVs yet</div>
              <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.6 }}>Upload a PDF to get started</div>
            </div>
          ) : (
            cvLibrary.map(cv => (
              <div key={cv.id} onClick={() => setSelectedCvId(cv.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: `1.5px solid ${selectedCvId === cv.id || (!selectedCvId && cv.isDefault) ? "#2563eb" : t.border}`, background: selectedCvId === cv.id || (!selectedCvId && cv.isDefault) ? "#2563eb12" : t.surface2, transition: "all 0.15s" }}
              >
                <Icon name="file" size={18} color={selectedCvId === cv.id ? "#2563eb" : t.textMuted} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{cv.fileName} · {cv.addedAt}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {cv.isDefault && <span style={{ fontSize: 10, background: "#10b98120", color: "#10b981", padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>Default</span>}
                  {!cv.isDefault && (
                    <button onClick={e => { e.stopPropagation(); setDefaultCv(cv.id); }} title="Set as default" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2 }}>
                      <Icon name="star" size={12} />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); deleteCv(cv.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
          {activeCv && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={11} color="#10b981" />Using: {activeCv.name}</div>}
        </div>

        <div style={{ ...S.card, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={S.cardTitle}>Job Description</div>
          <textarea value={resumeJD} onChange={e => setResumeJD(e.target.value)}
            placeholder={"Paste the full job description here…\n\nThe AI will extract ATS keywords, match against your CV, and rewrite sections to maximise match rate."}
            style={{ ...S.input, flex: 1, resize: "none", lineHeight: 1.65, fontSize: 12.5, marginBottom: 12, minHeight: 200 }}
          />
          <button onClick={handleGenerateResume} disabled={isGenerating || !resumeJD.trim() || cvLibrary.length === 0}
            style={{ ...S.btn("primary"), justifyContent: "center", opacity: (isGenerating || !resumeJD.trim() || cvLibrary.length === 0) ? 0.45 : 1, fontSize: 13.5, padding: "10px" }}>
            <Icon name="zap" size={14} />{isGenerating ? "Analysing & Optimising…" : "Generate ATS-Optimised Resume"}
          </button>
          {cvLibrary.length === 0 && <div style={{ fontSize: 11, color: "#f97316", marginTop: 8, textAlign: "center" }}>⚠️ Add at least one CV above first</div>}
        </div>
      </div>

      <div style={{ ...S.card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={S.cardTitle}>ATS-Optimised Resume Output</div>
          {resumeOutput && (
  <div style={{ display: "flex", gap: 8 }}>
    <button onClick={handleCopy} style={S.btn("secondary")}>
      <Icon name="copy" size={12} />{copySuccess ? "Copied!" : "Copy Text"}
    </button>
    {/* <button onClick={handleDownloadPdf} style={S.btn("primary")}>
      <Icon name="download" size={12} />Download PDF
    </button> */}
  </div>
)}
        </div>
        {!resumeOutput && !isGenerating && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.textMuted, gap: 12 }}>
            <Icon name="zap" size={38} color={t.border} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Ready to optimise</div>
            <div style={{ fontSize: 12.5, textAlign: "center", maxWidth: 280, lineHeight: 1.6, opacity: 0.7 }}>Select a CV, paste the job description, and hit Generate.</div>
          </div>
        )}
        {isGenerating && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.textMuted, gap: 12 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>⚙️ Claude is analysing…</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Extracting keywords · Matching experience · Rewriting bullets</div>
          </div>
        )}
        {resumeOutput && !isGenerating && (
          <pre style={{ flex: 1, fontSize: 12.5, lineHeight: 1.75, whiteSpace: "pre-wrap", color: t.text, fontFamily: "'DM Mono','Fira Code',monospace", overflowY: "auto", margin: 0 }}>
            {resumeOutput}
          </pre>
        )}
      </div>
    </div>
  );
};

// ─── MODALS ───────────────────────────────────────────────────────────────────
const AddAppModal = ({ form, setForm, handleSave, onClose, t, S }) => (
  <div style={S.overlay} onClick={onClose}>
    <div style={S.modal} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{form.id ? "Edit Application" : "New Application"}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><Icon name="x" size={17} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        {[
          { label: "Company *",    key: "company", type: "text", placeholder: "e.g. Goldman Sachs" },
          { label: "Role *",       key: "role",    type: "text", placeholder: "e.g. Risk Analyst"  },
          { label: "Date Applied", key: "date",    type: "date" },
          { label: "Salary Range", key: "salary",  type: "text", placeholder: "e.g. £60k–£75k"    },
        ].map(f => (
          <div key={f.key}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder || ""} style={S.input} />
          </div>
        ))}
        {[
          { label: "Status",   key: "status",   options: KANBAN_COLS },
          { label: "Priority", key: "priority", options: ["Dream","Target","Backup"] },
          { label: "Source",   key: "source",   options: ["LinkedIn","Company Site","Referral","Recruiter","Other"] },
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

const GoalModal = ({ weeklyGoal, thisWeekApps, onSave, onClose, t, S }) => {
  const [tempGoal, setTempGoal] = useState(weeklyGoal);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 340 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Set Weekly Goal</div>
        <label style={S.label}>Applications per week</label>
        <input type="number" min="1" max="100" value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))}
          style={{ ...S.input, fontSize: 22, fontWeight: 700, textAlign: "center", padding: "14px" }} />
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8, textAlign: "center" }}>Current pace: {thisWeekApps} this week</div>
        <div style={{ display: "flex", gap: 9, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.btn("secondary")}>Cancel</button>
          <button onClick={() => onSave(tempGoal)} style={S.btn("primary")}>Save Goal</button>
        </div>
      </div>
    </div>
  );
};

const AddCvModal = ({ cvBeingAdded, setCvBeingAdded, handlePdfUpload, saveCv, onClose, t, S }) => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function ApplyIQ() {

  // const handleDownloadPdf = () => {
//   try {
//     generateAtsResumePdf(resumeOutput, "Aayush More Resume");
//     notify("PDF downloaded!");
//   } catch (err) {
//     console.error("PDF generation error:", err);
//     notify("PDF download failed - check console", "error");
//   }
// };

  // Persisted state
  const [dark,       setDark]       = useState(() => lsGet(LS.DARK, true));
  const [apps,       setApps]       = useState(() => lsGet(LS.APPS, SEED_APPS));
  const [weeklyGoal, setWeeklyGoal] = useState(() => lsGet(LS.GOAL, 10));
  const [cvLibrary,  setCvLibrary]  = useState(() => lsGet(LS.CVS,  []));

  useEffect(() => lsSet(LS.DARK, dark),       [dark]);
  useEffect(() => lsSet(LS.APPS, apps),       [apps]);
  useEffect(() => lsSet(LS.GOAL, weeklyGoal), [weeklyGoal]);
  useEffect(() => lsSet(LS.CVS,  cvLibrary),  [cvLibrary]);

  // UI state
  const [view,          setView]         = useState("dashboard");
  const [showAddModal,  setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal]= useState(false);
  const [showCvModal,   setShowCvModal]  = useState(false);
  const [searchTerm,    setSearchTerm]   = useState("");
  const [filterStatus,  setFilterStatus] = useState("All");
  const [notification,  setNotification] = useState(null);
  const [selectedCvId,  setSelectedCvId] = useState(null);
  const [resumeJD,      setResumeJD]     = useState("");
  const [resumeOutput,  setResumeOutput] = useState("");
  const [isGenerating,  setIsGenerating] = useState(false);
  const [cvBeingAdded,  setCvBeingAdded] = useState({ name: "", base64: null, fileName: null });
  const [copySuccess,   setCopySuccess]  = useState(false);
  const emptyForm = { company:"", role:"", date: new Date().toISOString().slice(0,10), source:"LinkedIn", status:"Applied", salary:"", priority:"Target", notes:"" };
  const [form, setForm] = useState(emptyForm);

  // Theme & styles
  const t = buildTheme(dark);
  const S = buildStyles(t);

  // Toast
  const notify = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Derived stats
  const today         = new Date();
  const staleApps     = apps.filter(a => { const d = (today - new Date(a.date)) / 86400000; return d > 14 && (a.status === "Applied" || a.status === "Screening"); });
  const thisWeekApps  = apps.filter(a => (today - new Date(a.date)) / 86400000 <= 7).length;
  const responseRate  = apps.length ? Math.round((apps.filter(a => ["Screening","Interview","Offer"].includes(a.status)).length / apps.length) * 100) : 0;
  const offerCount    = apps.filter(a => a.status === "Offer").length;
  const interviewRate = apps.length ? Math.round((apps.filter(a => ["Interview","Offer"].includes(a.status)).length / apps.length) * 100) : 0;
  const statusDist    = KANBAN_COLS.map(s => ({ name: s, value: apps.filter(a => a.status === s).length })).filter(x => x.value > 0);
  const goalPct       = Math.min(Math.round((thisWeekApps / weeklyGoal) * 100), 100);
  const filteredApps  = useMemo(() => apps.filter(a => {
    const q = searchTerm.toLowerCase();
    return (a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)) && (filterStatus === "All" || a.status === filterStatus);
  }), [apps, searchTerm, filterStatus]);

  // CRUD
  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    if (form.id) { setApps(prev => prev.map(a => a.id === form.id ? { ...form } : a)); notify("Application updated"); }
    else { setApps(prev => [...prev, { ...form, id: Date.now(), followUp: false }]); notify("Application added"); }
    setShowAddModal(false); setForm(emptyForm);
  };
  const handleDelete     = id  => { setApps(prev => prev.filter(a => a.id !== id)); notify("Deleted", "error"); };
  const handleEdit       = app => { setForm({ ...app }); setShowAddModal(true); };
  const handleKanbanDrop = (appId, newStatus) => { setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)); notify(`Moved to ${newStatus}`); };

  // CSV
  const exportCSV = () => {
    const headers = ["Company","Role","Date","Source","Status","Priority","Salary","Notes"];
    const rows    = apps.map(a => [a.company,a.role,a.date,a.source,a.status,a.priority,a.salary||"",`"${(a.notes||"").replace(/"/g,'""')}"`]);
    const csv     = [headers,...rows].map(r => r.join(",")).join("\n");
    const blob    = new Blob([csv],{type:"text/csv"});
    const url     = URL.createObjectURL(blob);
    const link    = document.createElement("a");
    link.href=url; link.download=`ApplyIQ_${new Date().toISOString().slice(0,10)}.csv`; link.click();
    URL.revokeObjectURL(url); notify("CSV exported");
  };

  // CV library
  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") { notify("Please upload a PDF","error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setCvBeingAdded(prev => ({ ...prev, base64: ev.target.result.split(",")[1], fileName: file.name })); notify(`${file.name} loaded`); };
    reader.readAsDataURL(file);
  };
  const saveCv = () => {
    if (!cvBeingAdded.name.trim() || !cvBeingAdded.base64) return;
    const newCv = { id: Date.now(), name: cvBeingAdded.name.trim(), fileName: cvBeingAdded.fileName, base64: cvBeingAdded.base64, isDefault: cvLibrary.length === 0, addedAt: new Date().toISOString().slice(0,10) };
    setCvLibrary(prev => [...prev, newCv]);
    if (!selectedCvId) setSelectedCvId(newCv.id);
    setCvBeingAdded({ name: "", base64: null, fileName: null });
    setShowCvModal(false);
    notify(`"${newCv.name}" saved`);
  };
  const deleteCv     = id  => { setCvLibrary(prev => prev.filter(c => c.id !== id)); if (selectedCvId === id) setSelectedCvId(null); notify("CV removed","error"); };
  const setDefaultCv = id  => { setCvLibrary(prev => prev.map(c => ({...c, isDefault: c.id===id}))); setSelectedCvId(id); notify("Default CV updated"); };

  // AI resume
  const handleGenerateResume = async () => {
    const cv = cvLibrary.find(c => c.id === selectedCvId) || cvLibrary.find(c => c.isDefault);
    if (!cv)              { notify("Please select a CV first","error"); return; }
    if (!resumeJD.trim()) { notify("Please paste a job description","error"); return; }
    setIsGenerating(true); setResumeOutput("");
    try {
      // Calls our serverless function in /api/generate-resume.js
      // The function holds the API key secretly on Vercel's servers
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvBase64: cv.base64,
          jobDescription: resumeJD,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResumeOutput(data.result);
      notify("Resume optimised!");
    } catch (err) {
      setResumeOutput(`⚠️ Error: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set in Vercel environment variables.`);
      notify("Error — check API key", "error");
    } finally { setIsGenerating(false); }
  };
  const handleCopy = () => { navigator.clipboard.writeText(resumeOutput); setCopySuccess(true); setTimeout(()=>setCopySuccess(false),2000); };

  const sp = { t, S }; // shared props passed to every view

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: t.text, transition: "background 0.3s, color 0.3s" }}>

      {/* Toast */}
      {notification && (
        <div style={{ position: "fixed", top: 18, right: 18, zIndex: 100, background: notification.type==="error" ? "#ef444420" : "#2563eb20", border: `1px solid ${notification.type==="error" ? "#ef4444" : "#2563eb"}`, color: notification.type==="error" ? "#ef4444" : "#2563eb", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, backdropFilter: "blur(8px)" }}>
          {notification.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: 220, background: t.surface, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${t.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px", color: t.accent, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="briefcase" size={17} color={t.accent} />ApplyIQ
          </div>
          <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Job Application Tracker</div>
        </div>
        <div style={{ padding: "8px 0", flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", margin: "1px 8px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: view===n.id?600:400, color: view===n.id?"#fff":t.textMuted, background: view===n.id?t.accent:"transparent", transition: "all 0.15s", border: "none", width: "calc(100% - 16px)", textAlign: "left" }}>
              <Icon name={n.icon} size={14} color={view===n.id?"#fff":t.textMuted} />{n.label}
            </button>
          ))}
        </div>
        <div style={{ margin: "0 10px 10px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 9, padding: "12px 14px" }}>
          <div style={{ fontSize: 10.5, color: t.textMuted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>Quick Stats</div>
          {[{label:"Total",value:apps.length,color:t.text},{label:"This week",value:thisWeekApps,color:t.accent},{label:"Offers",value:offerCount,color:"#10b981"}].map((s,i)=>(
            <div key={i} style={{ fontSize: 12, color: t.textMuted, display: "flex", justifyContent: "space-between", marginBottom: i<2?4:0 }}>
              <span>{s.label}</span><span style={{ color: s.color, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>
        {staleApps.length > 0 && (
          <div onClick={() => setView("analytics")} style={{ margin: "0 10px 10px", background: "#f9731612", border: "1px solid #f9731640", borderRadius: 9, padding: "10px 14px", cursor: "pointer" }}>
            <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="bell" size={11} color="#f97316" />{staleApps.length} Follow-Up Alert{staleApps.length>1?"s":""}
            </div>
          </div>
        )}
        <div style={{ padding: "0 10px 6px" }}>
          <button onClick={() => setDark(!dark)} style={{ ...S.btn("secondary"), width: "100%", justifyContent: "center", fontSize: 12.5 }}>
            <Icon name={dark?"sun":"moon"} size={13} color={t.textMuted} />{dark?"Light Mode":"Dark Mode"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.5px" }}>{NAV.find(n=>n.id===view)?.label}</div>
            <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 3 }}>
              {view==="dashboard"    && `${apps.length} total · ${thisWeekApps} this week · ${responseRate}% response rate`}
              {view==="kanban"       && "Drag cards between columns to update status"}
              {view==="applications" && `${filteredApps.length} of ${apps.length} applications`}
              {view==="analytics"    && "Conversion metrics, trends, and follow-up tracking"}
              {view==="resume"       && `${cvLibrary.length} CV${cvLibrary.length!==1?"s":""} in library · AI-powered ATS optimisation`}
            </div>
          </div>
          {view !== "resume" && (
            <button onClick={() => { setForm(emptyForm); setShowAddModal(true); }} style={S.btn("primary")}>
              <Icon name="plus" size={13} />Add Application
            </button>
          )}
        </div>

        {view==="dashboard"    && <DashboardView    {...sp} apps={apps} staleApps={staleApps} thisWeekApps={thisWeekApps} weeklyGoal={weeklyGoal} goalPct={goalPct} responseRate={responseRate} offerCount={offerCount} interviewRate={interviewRate} statusDist={statusDist} setView={setView} setShowGoalModal={setShowGoalModal} exportCSV={exportCSV} />}
        {view==="kanban"       && <KanbanView       {...sp} apps={apps} handleKanbanDrop={handleKanbanDrop} />}
        {view==="applications" && <ApplicationsView {...sp} filteredApps={filteredApps} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleEdit={handleEdit} handleDelete={handleDelete} setShowAddModal={setShowAddModal} exportCSV={exportCSV} />}
        {view==="analytics"    && <AnalyticsView    {...sp} apps={apps} staleApps={staleApps} responseRate={responseRate} interviewRate={interviewRate} offerCount={offerCount} />}
        {view==="resume"       && <ResumeView       {...sp} cvLibrary={cvLibrary} selectedCvId={selectedCvId} setSelectedCvId={setSelectedCvId} setDefaultCv={setDefaultCv} deleteCv={deleteCv} resumeJD={resumeJD} setResumeJD={setResumeJD} resumeOutput={resumeOutput} isGenerating={isGenerating} handleGenerateResume={handleGenerateResume} handleCopy={handleCopy} copySuccess={copySuccess} setShowCvModal={setShowCvModal} />}
      </div>

      {showAddModal  && <AddAppModal  {...sp} form={form} setForm={setForm} handleSave={handleSave} onClose={()=>setShowAddModal(false)} />}
      {showGoalModal && <GoalModal    {...sp} weeklyGoal={weeklyGoal} thisWeekApps={thisWeekApps} onSave={(g)=>{setWeeklyGoal(g);setShowGoalModal(false);notify(`Goal set to ${g}/week`);}} onClose={()=>setShowGoalModal(false)} />}
      {showCvModal   && <AddCvModal   {...sp} cvBeingAdded={cvBeingAdded} setCvBeingAdded={setCvBeingAdded} handlePdfUpload={handlePdfUpload} saveCv={saveCv} onClose={()=>{setShowCvModal(false);setCvBeingAdded({name:"",base64:null,fileName:null});}} />}
    </div>
  );
}