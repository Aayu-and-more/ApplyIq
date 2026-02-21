import React, { useState } from "react";

export const GoalModal = ({ weeklyGoal, thisWeekApps, onSave, onClose }) => {
    const [tempGoal, setTempGoal] = useState(weeklyGoal);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={onClose}>
            <div className="surface border rounded-2xl w-[340px] max-w-full p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-blue-50 mb-6 text-center">Set Weekly Goal</div>

                <label className="block text-[11.5px] font-bold text-muted uppercase tracking-widest mb-3 text-center">Applications per week</label>

                <input
                    type="number"
                    min="1"
                    max="100"
                    value={tempGoal}
                    onChange={e => setTempGoal(Number(e.target.value))}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 text-center text-3xl font-extrabold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />

                <div className="text-[12.5px] font-medium text-muted mt-4 text-center">
                    Current pace: <span className="font-bold text-gray-900 dark:text-gray-300">{thisWeekApps}</span> this week
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-[13.5px] font-bold surface-alt border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(tempGoal)}
                        className="flex-1 py-3 rounded-xl text-[13.5px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer shadow-blue-600/20"
                    >
                        Save Goal
                    </button>
                </div>
            </div>
        </div>
    );
};
