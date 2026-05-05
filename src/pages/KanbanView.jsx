import React, { useState } from "react";

const STATUS_COLORS = {
  Applied: "#3b82f6",
  Screening: "#f59e0b",
  Interview: "#8b5cf6",
  Offer: "#10b981",
  Rejected: "#ef4444",
  Ghosted: "#6b7280",
};

const KANBAN_COLS = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"];

const BellIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function RegularCard({ app, onDragStart }) {
  return (
    <div
      className="surface border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
      style={{ borderLeftWidth: "4px", borderLeftColor: STATUS_COLORS[app.status] || "#6b7280" }}
      draggable
      onDragStart={onDragStart}
    >
      <div className="text-[13.5px] font-bold text-gray-900 dark:text-blue-50 tracking-tight leading-tight mb-1">
        {app.company}
      </div>
      <div className="text-[12px] font-medium text-muted mb-2.5">{app.role}</div>
      <div className="flex justify-between items-center mt-2">
        <span
          className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold"
          style={{
            backgroundColor:
              app.priority === "Dream" ? "#f59e0b22" : app.priority === "Target" ? "#3b82f622" : "#6b728022",
            color:
              app.priority === "Dream" ? "#f59e0b" : app.priority === "Target" ? "#3b82f6" : "#6b7280",
          }}
        >
          {app.priority}
        </span>
        <span className="text-[11px] font-medium text-muted">{app.date}</span>
      </div>
      {app.salary && <div className="text-[11px] font-medium text-muted mt-2.5">{app.salary}</div>}
      {app.followUp && (
        <div className="text-[11px] font-bold text-orange-500 mt-2.5 flex items-center gap-1.5">
          <BellIcon />Follow up
        </div>
      )}
    </div>
  );
}

export const KanbanView = ({ apps, handleKanbanDrop }) => {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const kanbanApps = apps.filter(a => a.status !== "Discovered");

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start min-h-0">
        {KANBAN_COLS.map(col => {
          const colApps = kanbanApps.filter(a => a.status === col);
          const isDragOver = dragOver === col;

          return (
            <div
              key={col}
              className={`min-w-[260px] flex-1 flex flex-col surface-alt rounded-2xl p-4 transition-all duration-200 shadow-sm ${isDragOver ? "ring-2 ring-inset" : "border"}`}
              style={{
                ringColor: isDragOver ? STATUS_COLORS[col] : undefined,
                borderTopWidth: "4px",
                borderTopColor: STATUS_COLORS[col] || "#6b7280",
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(col); }}
              onDrop={() => {
                if (dragging) handleKanbanDrop(dragging, col);
                setDragging(null);
                setDragOver(null);
              }}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="flex justify-between items-center mb-4">
                <div
                  className="text-[12px] font-bold uppercase tracking-widest"
                  style={{ color: STATUS_COLORS[col] || "#6b7280" }}
                >
                  {col}
                </div>
                <div
                  className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: `${STATUS_COLORS[col]}22`,
                    color: STATUS_COLORS[col] || "#6b7280",
                  }}
                >
                  {colApps.length}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[50px]">
                {colApps.map(a => (
                  <RegularCard
                    key={a.id}
                    app={a}
                    onDragStart={() => setDragging(a.id)}
                  />
                ))}
                {colApps.length === 0 && (
                  <div className="text-[12px] font-medium text-muted text-center py-6 opacity-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl m-1">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[12px] font-medium text-muted text-center mt-2 py-2">
        Drag cards between columns to update status
      </div>
    </div>
  );
};
