import React, { useContext, useState, useEffect, useRef } from "react";
import { KpiContext } from "../store/kpiStore";
import { Cloud, FolderOpen, ShieldCheck, X } from "lucide-react";
import DataEntryWeekSelector from "./DataEntry/DataEntryWeekSelector";
import DataEntryDepartmentRow from "./DataEntry/DataEntryDepartmentRow";
import DataEntryHiringGrid from "./DataEntry/DataEntryHiringGrid";
import { getFreezeBoundaryInfo, getCurrentWeek } from "../utils/dateUtils";

export default function DataEntry() {
  const {
    model,
    activeWeek,
    setActiveWeek,
    updateValue,
    canEdit,
    unlockEditing,
    addWeek,
    editWeek,
    removeWeek,
    addHiringRole,
    removeHiringRole,
    toggleRoleWeek,
    connState,
    freezeState,
    freezeData,
    defreezeData,
    isWeekFrozen,
  } = useContext(KpiContext);

  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [selectedFreezeWeekId, setSelectedFreezeWeekId] = useState(null);

  const { weeks, departments } = model;
  const hasInitializedWeekRef = useRef(false);

  // Automatically select the Current week by default in the Data Entry section
  useEffect(() => {
    if (weeks && weeks.length > 0 && !hasInitializedWeekRef.current) {
      hasInitializedWeekRef.current = true;
      const cur = getCurrentWeek(weeks);
      if (cur && cur.id) {
        setActiveWeek(cur.id);
      }
    }
  }, [weeks, setActiveWeek]);

  const wk = weeks.find((w) => w.id === activeWeek);
  const cloudOn = true; // Simulating backend connection
  const isCurrentWeekFrozen = isWeekFrozen?.(activeWeek);
  const effectiveCanEdit = canEdit && !isCurrentWeekFrozen;

  const [isFreezing, setIsFreezing] = useState(false);
  const [isDefreezing, setIsDefreezing] = useState(false);

  const boundary = getFreezeBoundaryInfo(model.weeks);

  const openFreezeModal = () => {
    if (!canEdit) {
      const unlocked = unlockEditing();
      if (!unlocked) return;
    }
    setSelectedFreezeWeekId(
      boundary.freezeUpToWeek?.id ||
        model.weeks[model.weeks.length - 2]?.id ||
        model.weeks[0]?.id,
    );
    setShowFreezeModal(true);
  };

  const handleConfirmFreeze = async () => {
    if (!canEdit) {
      const unlocked = unlockEditing();
      if (!unlocked) return;
    }
    setIsFreezing(true);
    try {
      const success = await freezeData(selectedFreezeWeekId);
      if (success) {
        setShowFreezeModal(false);
      }
    } finally {
      setIsFreezing(false);
    }
  };

  const handleDefreeze = async () => {
    if (!canEdit) {
      const unlocked = unlockEditing();
      if (!unlocked) return;
    }
    if (
      window.confirm(
        "Defreeze dashboard data for all users? After defreezing, clicking Refresh will update all weeks with live cloud data.",
      )
    ) {
      setIsDefreezing(true);
      try {
        await defreezeData();
      } finally {
        setIsDefreezing(false);
      }
    }
  };

  return (
    <div className="data-entry-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">⚙️ Data Entry</h1>
          <p className="page-subtitle">
            Add a week, then type Plan & Actual for each metric. Everything
            updates automatically.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* ── Data Freezing Controls in Data Entry ── */}
          {freezeState.isFrozen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(12px)",
                border: "1.5px solid rgba(56, 189, 248, 0.5)",
                borderRadius: "10px",
                padding: "4px 6px 4px 12px",
                gap: "10px",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0369a1",
                }}
                title={`Frozen up to: ${freezeState.freezeUpToLabel}\nSnapshot taken: ${new Date(freezeState.frozenAt).toLocaleString()}`}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#0284c7",
                    boxShadow: "0 0 6px rgba(2, 132, 199, 0.6)",
                    display: "inline-block",
                  }}
                ></span>
                <span>
                  Frozen:{" "}
                  {freezeState.freezeUpToLabel
                    ? freezeState.freezeUpToLabel.split("(")[0].trim()
                    : "Up to Last Wk"}
                </span>
              </div>
              <button
                onClick={handleDefreeze}
                disabled={isDefreezing}
                style={{
                  background: isDefreezing ? "#94a3b8" : canEdit ? "#ef4444" : "#64748b",
                  border: "none",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: isDefreezing ? "wait" : "pointer",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                onMouseEnter={(e) => {
                  if (!isDefreezing) e.currentTarget.style.background = canEdit ? "#dc2626" : "#475569";
                }}
                onMouseLeave={(e) => {
                  if (!isDefreezing) e.currentTarget.style.background = canEdit ? "#ef4444" : "#64748b";
                }}
                title={canEdit ? "Click to defreeze and re-enable live cloud syncing for all weeks" : "Password required to defreeze data (Click to enter password)"}
              >
                {isDefreezing ? "Defreezing..." : canEdit ? "Defreeze" : "🔒 Defreeze"}
              </button>
            </div>
          ) : (
            <button
              onClick={openFreezeModal}
              style={{
                background: canEdit
                  ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                  : "linear-gradient(135deg, #475569 0%, #334155 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: canEdit
                  ? "0 4px 12px rgba(2, 132, 199, 0.25)"
                  : "0 4px 12px rgba(51, 65, 85, 0.25)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = canEdit
                  ? "0 6px 16px rgba(2, 132, 199, 0.35)"
                  : "0 6px 16px rgba(51, 65, 85, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = canEdit
                  ? "0 4px 12px rgba(2, 132, 199, 0.25)"
                  : "0 4px 12px rgba(51, 65, 85, 0.25)";
              }}
              title={canEdit ? "Freeze data up to selected week" : "Password required to freeze data (Click to enter password)"}
            >
              <span>{canEdit ? "❄️ Freeze Data" : "🔒 Freeze Data"}</span>
            </button>
          )}

          <div
            className="nav-conn"
            style={{
              background: "rgba(255,255,255,0.8)",
              padding: "6px 12px",
              borderRadius: 20,
              border: "1px solid var(--border)",
            }}
          >
            <span className={`conn-indicator ${connState}`}></span>
            <span style={{ color: "var(--text2)", fontWeight: 600 }}>
              {connState === "online" ? "Cloud Sync On" : "Offline Mode"}
            </span>
          </div>
          {cloudOn && !canEdit && (
            <button
              className="btn-primary"
              style={{ padding: "8px 16px" }}
              onClick={unlockEditing}
            >
              🔓 Unlock Editing
            </button>
          )}
        </div>
      </div>

      <DataEntryWeekSelector
        weeks={weeks}
        activeWeek={activeWeek}
        setActiveWeek={setActiveWeek}
        canEdit={canEdit}
        addWeek={addWeek}
        editWeek={editWeek}
        removeWeek={removeWeek}
        isWeekFrozen={isWeekFrozen}
      />

      {isCurrentWeekFrozen && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
            color: "#0369a1",
          }}
        >
          <span style={{ fontSize: "13px", lineHeight: "1.4" }}>
            <b>{freezeState.freezeUpToLabel} is frozen.</b>Values for this week
            are locked and preserved during API refresh. Click <b>Defreeze</b>{" "}
            above if you need to edit this week.
          </span>
        </div>
      )}

      {cloudOn && !canEdit && !isCurrentWeekFrozen && (
        <div
          style={{
            padding: 16,
            background: "#fff",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            marginBottom: 24,
            display: "flex",
            gap: 10,
            alignItems: "center",
            color: "var(--text2)",
          }}
        >
          🔒{" "}
          <span>
            You are in <b>view mode</b>. Click <b>Unlock Editing</b> (top right)
            to change values.
          </span>
        </div>
      )}

      {wk ? (
        departments.map((d) => {
          let baseMetrics = d.metrics;
          let posMetrics = [];
          if (d.id === "hiring") {
            // baseMetrics are now computed, so we don't show them in Data Entry anymore!
            baseMetrics = [];
            posMetrics = d.metrics.filter((m) => m.id.startsWith("pos_"));
          }

          return (
            <div key={d.id} className="de-dept">
              <div className="de-dept-head">
                <span>
                  {d.emoji} {d.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {wk.label} · {wk.range}
                </span>
              </div>

              <DataEntryDepartmentRow
                department={d}
                wk={wk}
                canEdit={effectiveCanEdit}
                updateValue={updateValue}
                baseMetrics={baseMetrics}
              />

              {d.id === "hiring" && (
                <DataEntryHiringGrid
                  department={d}
                  wk={wk}
                  canEdit={effectiveCanEdit}
                  updateValue={updateValue}
                  posMetrics={posMetrics}
                  allPosMetrics={d.metrics.filter((m) =>
                    m.id.startsWith("pos_"),
                  )}
                  addHiringRole={addHiringRole}
                  removeHiringRole={removeHiringRole}
                  toggleRoleWeek={toggleRoleWeek}
                />
              )}
            </div>
          );
        })
      ) : (
        <div className="empty-state">
          No weeks available. Add a week to start entering data.
        </div>
      )}

      {/* ── Freeze Confirmation Modal ── */}
      {showFreezeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowFreezeModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              borderRadius: "16px",
              maxWidth: "480px",
              width: "100%",
              boxShadow:
                "0 20px 45px -10px rgba(15, 23, 42, 0.2), 0 8px 16px -4px rgba(0, 0, 0, 0.06)",
              color: "#0f172a",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#0f172a",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Freeze Dashboard Data
                  </h3>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    Lock historical weeks up to the previous completed week
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFreezeModal(false)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0f172a",
                  marginBottom: "-10px",
                }}
              >
                Current Active Week:
              </div>
              {boundary.currentWeek && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {boundary.currentWeek.label} ·{" "}
                    <span style={{ fontWeight: 500, color: "#475569" }}>
                      {boundary.currentWeek.range || ""}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "8px",
                  }}
                >
                  Freeze data up to:
                </label>
                <select
                  value={selectedFreezeWeekId || ""}
                  onChange={(e) => setSelectedFreezeWeekId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {model.weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} {w.range ? `(${w.range})` : ""}{" "}
                      {w.id === boundary.freezeUpToWeek?.id
                        ? "(Last Week / Recommended)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "#f8fafc",
              }}
            >
              <button
                onClick={() => setShowFreezeModal(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#ffffff")
                }
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFreeze}
                disabled={isFreezing}
                className="btn-primary"
                style={{
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  cursor: isFreezing ? "wait" : "pointer",
                  opacity: isFreezing ? 0.75 : 1,
                }}
              >
                <span>{isFreezing ? "Freezing for all users..." : "Freeze Data"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
