import React from "react";

const Icon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
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

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

export const ApplicationsView = ({ filteredApps, searchTerm, setSearchTerm, filterStatus, setFilterStatus, handleEdit, handleDelete, handleDeleteAll, setShowAddModal, exportCSV }) => (
    <div className="flex flex-col gap-5 h-full">
        {/* Controls Bar */}
        <div className="flex flex-wrap gap-3 items-center w-full">
            <div className="relative flex-1 min-w-[240px]">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <Icon name="search" className="w-[15px] h-[15px]" />
                </div>
                <input
                    placeholder="Search company or role…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                />
            </div>

            <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-[160px] px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
                <option>All Statuses</option>
                {KANBAN_COLS.map(c => <option key={c}>{c}</option>)}
            </select>

            <div className="flex gap-2 ml-auto">
                <button
                    onClick={handleDeleteAll}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50 shadow-sm cursor-pointer"
                >
                    Delete All
                </button>
                <button
                    onClick={exportCSV}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white dark:bg-[#141e30] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer"
                >
                    Export CSV
                </button>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                >
                    Add Application
                </button>
            </div>
        </div>

        {/* Datagrid */}
        <div className="surface rounded-2xl shadow-sm border overflow-hidden flex-1">
            <div className="overflow-x-auto w-full h-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-50 dark:bg-[#141e30]/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            {["Company", "Role", "Date", "Source", "Status", "Priority", "Salary", "Notes", "Actions"].map(h => (
                                <th key={h} className="py-3.5 px-4 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                        {filteredApps.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-16 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted">
                                        <Icon name="search" className="w-8 h-8 opacity-20 mb-2" />
                                        <div className="text-[14px] font-medium">No applications found</div>
                                        <div className="text-[12px] opacity-70">Try adjusting your filters or search term</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {filteredApps.map(a => (
                            <tr key={a.id} className="group hover:bg-blue-50/50 dark:hover:bg-[#141e30]/50 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-[13.5px] text-gray-900 dark:text-blue-50">{a.company}</td>
                                <td className="py-3.5 px-4 text-[13px] text-muted font-medium">{a.role}</td>
                                <td className="py-3.5 px-4 text-[12px] text-muted whitespace-nowrap">{a.date}</td>
                                <td className="py-3.5 px-4 text-[12px] text-muted">{a.source}</td>
                                <td className="py-3.5 px-4">
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold"
                                        style={{ backgroundColor: `${STATUS_COLORS[a.status]}15`, color: STATUS_COLORS[a.status] || "#6b7280" }}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4">
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                                        style={{ backgroundColor: a.priority === "Dream" ? "#f59e0b15" : a.priority === "Target" ? "#3b82f615" : "#6b728015", color: a.priority === "Dream" ? "#f59e0b" : a.priority === "Target" ? "#3b82f6" : "#6b7280" }}>
                                        {a.priority}
                                    </span>
                                </td>
                                <td className="py-3.5 px-4 text-[12px] text-muted whitespace-nowrap">{a.salary || "—"}</td>
                                <td className="py-3.5 px-4 text-[12px] text-muted max-w-[180px] truncate" title={a.notes}>{a.notes || "—"}</td>
                                <td className="py-3.5 px-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(a)} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-md transition-colors cursor-pointer">Edit</button>
                                        <button onClick={() => handleDelete(a.id)} className="text-[12px] font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-md transition-colors cursor-pointer">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
