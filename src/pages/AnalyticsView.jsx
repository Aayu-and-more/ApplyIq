import React from "react";
import {
    LineChart, Line, BarChart, Bar, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export const AnalyticsView = ({ apps, staleApps, responseRate, interviewRate, offerCount }) => {
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
        <div className="flex flex-col gap-5">
            {/* Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Status Breakdown Chart */}
                <div className="surface rounded-2xl shadow-sm p-5 lg:col-span-2 flex flex-col">
                    <div className="text-[11.5px] font-bold text-muted uppercase tracking-widest mb-4">Application Status Breakdown</div>
                    <div className="flex-1 min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { status: "Applied", count: apps.filter(a => a.status === "Applied").length },
                                { status: "Screening", count: apps.filter(a => a.status === "Screening").length },
                                { status: "Interview", count: apps.filter(a => a.status === "Interview").length },
                                { status: "Offer", count: offerCount },
                                { status: "Rejected", count: apps.filter(a => a.status === "Rejected").length },
                                { status: "Ghosted", count: apps.filter(a => a.status === "Ghosted").length }
                            ].filter(d => d.count > 0)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" vertical={false} />
                                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#8898b0" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#8898b0" }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: 'var(--tw-prose-body)', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {
                                        [
                                            { status: "Applied", count: apps.filter(a => a.status === "Applied").length },
                                            { status: "Screening", count: apps.filter(a => a.status === "Screening").length },
                                            { status: "Interview", count: apps.filter(a => a.status === "Interview").length },
                                            { status: "Offer", count: offerCount },
                                            { status: "Rejected", count: apps.filter(a => a.status === "Rejected").length },
                                            { status: "Ghosted", count: apps.filter(a => a.status === "Ghosted").length }
                                        ].filter(d => d.count > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Funnel Chart */}
                <div className="surface rounded-2xl shadow-sm p-5 flex flex-col">
                    <div className="text-[11.5px] font-bold text-muted uppercase tracking-widest mb-4">Conversion Funnel</div>
                    <div className="flex-1 min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#8898b0" }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#8898b0" }} axisLine={false} tickLine={false} width={70} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: 'var(--tw-prose-body)', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                    {funnel.map((_, i) => <Cell key={i} fill={["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"][i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Response Rate", value: `${responseRate}%`, sub: "Got at least a screening call", color: "border-blue-600", text: "text-blue-600" },
                    { label: "Interview Rate", value: `${interviewRate}%`, sub: "Reached interview stage", color: "border-violet-500", text: "text-violet-500" },
                    { label: "Offer Rate", value: `${apps.length ? Math.round((offerCount / apps.length) * 100) : 0}%`, sub: "Received an offer", color: "border-emerald-500", text: "text-emerald-500" },
                    { label: "Active Pipeline", value: apps.filter(a => ["Screening", "Interview"].includes(a.status)).length, sub: "In active stages", color: "border-amber-500", text: "text-amber-500" },
                ].map((m, i) => (
                    <div key={i} className={`surface border-t-[3px] ${m.color} rounded-xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-300`}>
                        <div className="text-[11px] text-muted uppercase tracking-widest font-bold mb-2">{m.label}</div>
                        <div className={`text-3xl font-extrabold tracking-tight leading-none ${m.text}`}>{m.value}</div>
                        <div className="text-[11.5px] text-muted mt-2 font-medium">{m.sub}</div>
                    </div>
                ))}
            </div>

            {/* Stale Apps Table */}
            {staleApps.length > 0 && (
                <div className="surface rounded-2xl shadow-sm border overflow-hidden mt-1">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-orange-50/50 dark:bg-orange-500/5">
                        <div className="text-[11.5px] font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="text-[14px]">⚠️</span> Stale Applications — Follow-Up Needed
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 dark:bg-[#141e30]/30">
                                <tr>
                                    {["Company", "Role", "Applied", "Days Stale", "Status"].map(h => (
                                        <th key={h} className="py-3 px-5 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                                {staleApps.map(a => {
                                    const days = Math.floor((today - new Date(a.date)) / 86400000);
                                    return (
                                        <tr key={a.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
                                            <td className="py-3 px-5 font-bold text-[13.5px] text-gray-900 dark:text-blue-50">{a.company}</td>
                                            <td className="py-3 px-5 text-[13px] text-muted font-medium">{a.role}</td>
                                            <td className="py-3 px-5 text-[12px] text-muted whitespace-nowrap">{a.date}</td>
                                            <td className="py-3 px-5">
                                                <span className="inline-flex items-center justify-center bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-bold px-2.5 py-1 rounded-md text-[12px]">
                                                    {days}d
                                                </span>
                                            </td>
                                            <td className="py-3 px-5">
                                                <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold"
                                                    style={{ backgroundColor: `${STATUS_COLORS[a.status]}15`, color: STATUS_COLORS[a.status] || "#6b7280" }}>
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
