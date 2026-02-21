import React from "react";

const Icon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icons[name] || null}
        </svg>
    );
};

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

export const AddAppModal = ({ form, setForm, handleSave, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={onClose}>
        <div
            className="surface border rounded-2xl p-6 md:p-8 w-[500px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-blue-50">
                    {form.id ? "Edit Application" : "New Application"}
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-blue-50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <Icon name="x" className="w-[18px] h-[18px]" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: "Company *", key: "company", type: "text", placeholder: "e.g. Goldman Sachs" },
                    { label: "Role *", key: "role", type: "text", placeholder: "e.g. Risk Analyst" },
                    { label: "Date Applied", key: "date", type: "date" },
                    { label: "Salary Range", key: "salary", type: "text", placeholder: "e.g. £60k–£75k" },
                ].map(f => (
                    <div key={f.key}>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">{f.label}</label>
                        <input
                            type={f.type}
                            value={form[f.key] || ""}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder || ""}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                        />
                    </div>
                ))}

                {[
                    { label: "Status", key: "status", options: KANBAN_COLS },
                    { label: "Priority", key: "priority", options: ["Dream", "Target", "Backup"] },
                    { label: "Source", key: "source", options: ["LinkedIn", "Company Site", "Referral", "Recruiter", "Other"] },
                ].map(f => (
                    <div key={f.key}>
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">{f.label}</label>
                        <select
                            value={form[f.key] || ""}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                        >
                            {f.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">Notes</label>
                <textarea
                    value={form.notes || ""}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Interview prep, contacts, deadlines…"
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm resize-none h-24"
                />
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-semibold surface-alt border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                    {form.id ? "Save Changes" : "Add Application"}
                </button>
            </div>
        </div>
    </div>
);
