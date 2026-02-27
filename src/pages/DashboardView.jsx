import React from "react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const Icon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
        refresh: <><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></>
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icons[name] || null}
        </svg>
    );
};

const STATUS_COLORS = {
    Applied: "#3b82f6", Screening: "#f59e0b", Interview: "#8b5cf6",
    Offer: "#10b981", Rejected: "#ef4444", Ghosted: "#6b7280",
};

const WEEKLY_DATA = [
    { week: "W1", apps: 12 }, { week: "W2", apps: 15 },
    { week: "W3", apps: 8 }, { week: "W4", apps: 22 },
];

export const DashboardView = ({ apps, staleApps, thisWeekApps, weeklyGoal, goalPct, responseRate, offerCount, interviewRate, statusDist, setView, setShowGoalModal, exportCSV, isSyncingGmail, handleGmailSync }) => (
    <div className="flex flex-col gap-5">

        {/* Alerts */}
        <div className="flex justify-between items-center gap-4">
            {staleApps.length > 0 ? (
                <div
                    onClick={() => setView("analytics")}
                    className="flex-1 bg-orange-500/10 border border-orange-500 rounded-xl px-4 py-3 flex items-center gap-2.5 text-orange-500 text-[13px] cursor-pointer hover:bg-orange-500/20 transition-colors"
                >
                    <strong>{staleApps.length} application{staleApps.length > 1 ? "s" : ""} need follow-up</strong> — click to review
                </div>
            ) : <div className="flex-1" />}

            <button
                onClick={handleGmailSync}
                disabled={isSyncingGmail}
                className={`py-3 px-5 rounded-xl text-[13px] font-bold shadow-sm transition-all flex items-center gap-2
                    ${isSyncingGmail ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-[#141e30] border border-gray-200 dark:border-[#1a2840] hover:border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'}
                `}
            >
                <Icon name="refresh" className={`w-4 h-4 ${isSyncingGmail ? 'animate-spin' : ''}`} />
                {isSyncingGmail ? 'Syncing...' : 'Sync Gmail Apps'}
            </button>
        </div>

        {/* Top Stat Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
                { label: "Total Applied", value: apps.length, sub: "All time", color: "border-blue-600", text: "text-blue-600" },
                { label: "This Week", value: thisWeekApps, sub: `Goal: ${weeklyGoal} · ${goalPct}%`, color: "border-emerald-500", text: "text-emerald-500" },
                { label: "Response Rate", value: `${responseRate}%`, sub: "Screening or above", color: "border-amber-500", text: "text-amber-500" },
                { label: "Active Offers", value: offerCount, sub: `${interviewRate}% interview rate`, color: "border-violet-500", text: "text-violet-500" },
            ].map((stat, i) => (
                <div key={i} className={`surface border-t-[3px] ${stat.color} rounded-xl p-5 shadow-sm`}>
                    <div className="text-[11px] text-muted uppercase tracking-widest font-bold mb-2">{stat.label}</div>
                    <div className={`text-3xl font-extrabold tracking-tight leading-none ${stat.text}`}>{stat.value}</div>
                    <div className="text-[11.5px] text-muted mt-1.5 font-medium">{stat.sub}</div>
                </div>
            ))}
        </div>

        {/* Goal Card */}
        <div className="surface rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">Weekly Application Goal</div>
                    <div className="text-[13px] text-muted font-medium">{thisWeekApps} of {weeklyGoal} applications this week</div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`text-3xl font-extrabold ${goalPct >= 100 ? "text-emerald-500" : "brand-text"}`}>{goalPct}%</div>
                    <button onClick={() => setShowGoalModal(true)} className="px-3.5 py-2 rounded-lg text-sm font-semibold surface-alt hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer">Edit Goal</button>
                </div>
            </div>
            <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-1.5 border border-gray-100 dark:border-gray-700">
                <div className={`h-full rounded-full transition-all duration-700 ease-out ${goalPct >= 100 ? "bg-emerald-500" : "brand-bg"}`} style={{ width: `${goalPct}%` }} />
            </div>
            <div className="text-[11.5px] text-muted font-medium">{goalPct >= 100 ? "🎯 Goal achieved this week!" : `${weeklyGoal - thisWeekApps} more to hit your goal`}</div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="surface rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col">
                <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">Applications Per Week</div>
                <div className="flex-1 min-h-[175px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={WEEKLY_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                            <XAxis dataKey="week" tick={{ fontSize: 10.5, fill: "#8898b0" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10.5, fill: "#8898b0" }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: 'var(--tw-prose-body)', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Bar dataKey="apps" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="surface rounded-xl p-5 shadow-sm flex flex-col">
                <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4">By Status</div>
                <div className="flex-1 flex flex-col justify-center min-h-[175px]">
                    <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                            <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                                {statusDist.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || "#6b7280"} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--tw-prose-body)', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 mt-4 justify-center">
                        {statusDist.map((sd, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                                <div className="w-[7px] h-[7px] rounded-sm" style={{ background: STATUS_COLORS[sd.name] || "#6b7280" }} />
                                {sd.name} ({sd.value})
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="surface rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="text-[11px] font-bold text-muted uppercase tracking-widest">Recent Applications</div>
                <button onClick={exportCSV} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold surface-alt hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer">Export CSV</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            {["Company", "Role", "Date", "Status", "Priority", "Salary"].map(h => (
                                <th key={h} className="pb-3 pt-1 px-3 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {apps.slice(0, 6).map(a => (
                            <tr key={a.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800 font-bold text-[13px]">{a.company}</td>
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800 text-muted text-[12.5px] font-medium">{a.role}</td>
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800 text-muted text-[11.5px] font-medium">{a.date}</td>
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800">
                                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                        style={{ backgroundColor: `${STATUS_COLORS[a.status]}22`, color: STATUS_COLORS[a.status] || "#6b7280" }}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800">
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                                        style={{ backgroundColor: a.priority === "Dream" ? "#f59e0b22" : a.priority === "Target" ? "#3b82f622" : "#6b728022", color: a.priority === "Dream" ? "#f59e0b" : a.priority === "Target" ? "#3b82f6" : "#6b7280" }}>
                                        {a.priority}
                                    </span>
                                </td>
                                <td className="py-3 px-3 border-b border-gray-100 dark:border-gray-800 text-muted text-[11.5px] font-medium">{a.salary || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
