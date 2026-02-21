import React, { useState } from "react";

export const GoalModal = ({ weeklyGoal, thisWeekApps, onSave, onClose, t, S }) => {
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
