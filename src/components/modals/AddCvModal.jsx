import React, { useRef } from "react";

const Icon = ({ name, className = "w-4 h-4" }) => {
    const icons = {
        x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
        check: <polyline points="20 6 9 17 4 12" />,
        upload: <><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></>,
        plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icons[name] || null}
        </svg>
    );
};

export const AddCvModal = ({ cvBeingAdded, setCvBeingAdded, handlePdfUpload, saveCv, onClose }) => {
    const fileInputRef = useRef(null);
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={onClose}>
            <div className="surface border rounded-2xl w-[440px] max-w-full p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-blue-50">Add CV to Library</div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-blue-50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <Icon name="x" className="w-[18px] h-[18px]" />
                    </button>
                </div>

                <label className="block text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">CV Name / Label</label>
                <input
                    value={cvBeingAdded.name}
                    onChange={e => setCvBeingAdded(p => ({ ...p, name: e.target.value }))}
                    placeholder='e.g. "Finance CV", "Quant CV", "General"'
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#141e30] text-[13.5px] text-gray-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm mb-5"
                />

                <label className="block text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">Upload PDF</label>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-2
                        ${cvBeingAdded.base64
                            ? "border-blue-500 bg-blue-500/5 hover:bg-blue-500/10"
                            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#141e30] hover:bg-gray-100 dark:hover:bg-[#1a2840]"
                        }`}
                >
                    {cvBeingAdded.base64 ? (
                        <div className="flex flex-col items-center text-blue-600 dark:text-blue-500">
                            <Icon name="check" className="w-6 h-6 mb-2" />
                            <div className="text-[13.5px] font-bold tracking-tight">{cvBeingAdded.fileName}</div>
                            <div className="text-[11.5px] text-blue-600/70 dark:text-blue-500/70 mt-1 font-medium">Click to replace PDF</div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-500 dark:text-[#6b7c93]">
                            <Icon name="upload" className="w-6 h-6 mb-2" />
                            <div className="text-[13.5px] font-semibold text-gray-700 dark:text-gray-300">Click to browse or drag PDF here</div>
                            <div className="text-[11.5px] mt-1 opacity-75">Only PDF files are supported</div>
                        </div>
                    )}
                </div>

                <div className="text-[11px] font-medium text-muted mb-6 flex items-start gap-1.5">
                    <span className="text-[14px]">🔒</span>
                    PDF is stored securely in Firebase Cloud Storage alongside your profile.
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold surface-alt border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveCv}
                        disabled={!cvBeingAdded.name.trim() || !cvBeingAdded.base64}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-sm ${(!cvBeingAdded.name.trim() || !cvBeingAdded.base64)
                                ? "bg-blue-600/50 text-white/70 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                            }`}
                    >
                        <Icon name="plus" className="w-3.5 h-3.5" />Save to Library
                    </button>
                </div>
            </div>
        </div>
    );
};
