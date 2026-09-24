import React, { useContext, useState, useEffect, useRef } from "react";
import { KpiContext } from "../store/kpiStore";
import { FREEZE_KEY } from "../constants/kpiConstants";
import { Cloud, FolderOpen, ShieldCheck, X, Lock, Eye, EyeOff } from "lucide-react";
import DataEntryWeekSelector from "./DataEntry/DataEntryWeekSelector";
import DataEntryDepartmentRow from "./DataEntry/DataEntryDepartmentRow";
import DataEntryHiringGrid from "./DataEntry/DataEntryHiringGrid";
import {
  getFreezeBoundaryInfo,
  getCurrentWeek,
  formatTime12,
  formatDateDisplay,
  parseWeekEndMonth,
} from "../utils/dateUtils";

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
  const [selectedFreezeDate, setSelectedFreezeDate] = useState("");
  const [selectedFreezeTime, setSelectedFreezeTime] = useState("18:00");
  const [freezePassword, setFreezePassword] = useState("");
  const [showFreezePassword, setShowFreezePassword] = useState(false);
  const [freezePasswordError, setFreezePasswordError] = useState("");

  const [showDefreezeModal, setShowDefreezeModal] = useState(false);
  const [defreezePassword, setDefreezePassword] = useState("");
  const [showDefreezePassword, setShowDefreezePassword] = useState(false);
  const [defreezePasswordError, setDefreezePasswordError] = useState("");

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

  const getInitialDateForWeek = (weekId) => {
    const targetWk = model.weeks.find((w) => w.id === weekId);
    if (targetWk?.range) {
      const parsedEnd = parseWeekEndMonth(targetWk.range);
      if (parsedEnd && !isNaN(parsedEnd.getTime())) {
        const y = parsedEnd.getFullYear();
        const m = String(parsedEnd.getMonth() + 1).padStart(2, "0");
        const d = String(parsedEnd.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const openFreezeModal = () => {
    const defaultWeek =
      boundary.freezeUpToWeek ||
      model.weeks[model.weeks.length - 2] ||
      model.weeks[0];
    const defaultWeekId = defaultWeek?.id || model.weeks[0]?.id;
    setSelectedFreezeWeekId(defaultWeekId);
    setSelectedFreezeDate(getInitialDateForWeek(defaultWeekId));
    setSelectedFreezeTime("18:00");
    setFreezePassword("");
    setShowFreezePassword(false);
    setFreezePasswordError("");
    setShowFreezeModal(true);
  };

  const handleFreezeWeekChange = (e) => {
    const weekId = e.target.value;
    setSelectedFreezeWeekId(weekId);
    setSelectedFreezeDate(getInitialDateForWeek(weekId));
  };

  const handleConfirmFreeze = async () => {
    if (!freezePassword) {
      setFreezePasswordError("Please enter the freezing password.");
      return;
    }
    if (freezePassword !== FREEZE_KEY) {
      setFreezePasswordError("Incorrect freezing password.");
      return;
    }
    setIsFreezing(true);
    try {
      const success = await freezeData(selectedFreezeWeekId, {
        date: selectedFreezeDate,
        time: selectedFreezeTime,
      });
      if (success) {
        setShowFreezeModal(false);
      }
    } finally {
      setIsFreezing(false);
    }
  };

  const openDefreezeModal = () => {
    setDefreezePassword("");
    setShowDefreezePassword(false);
    setDefreezePasswordError("");
    setShowDefreezeModal(true);
  };

  const handleConfirmDefreeze = async () => {
    if (!defreezePassword) {
      setDefreezePasswordError("Please enter the freezing password.");
      return;
    }
    if (defreezePassword !== FREEZE_KEY) {
      setDefreezePasswordError("Incorrect freezing password.");
      return;
    }
    setIsDefreezing(true);
    try {
      await defreezeData();
      setShowDefreezeModal(false);
    } finally {
      setIsDefreezing(false);
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Lock size={12} style={{ color: '#0284c7' }} />
                  Frozen:{" "}
                  {freezeState.freezeUpToLabel
                    ? freezeState.freezeUpToLabel.split("·")[0].trim()
                    : "Up to Last Wk"}
                </span>
              </div>
              <button
                onClick={openDefreezeModal}
                disabled={isDefreezing}
                style={{
                  background: isDefreezing ? "#94a3b8" : "#ef4444",
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
                  if (!isDefreezing) e.currentTarget.style.background = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  if (!isDefreezing) e.currentTarget.style.background = "#ef4444";
                }}
                title="Enter freezing password to defreeze and re-enable live cloud syncing"
              >
                {isDefreezing ? "Defreezing..." : "🔒 Defreeze"}
              </button>
            </div>
          ) : (
            <button
              onClick={openFreezeModal}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
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
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(2, 132, 199, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(2, 132, 199, 0.25)";
              }}
              title="Freeze data up to selected week, day of week, and time"
            >
              <span>❄️ Freeze Data</span>
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
            background: "rgba(56, 189, 248, 0.12)",
            border: "1.5px solid rgba(56, 189, 248, 0.45)",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            gap: 12,
            alignItems: "center",
            color: "#0369a1",
          }}
        >
          <Lock size={20} style={{ color: "#0284c7", flexShrink: 0 }} />
          <span style={{ fontSize: "13px", lineHeight: "1.4" }}>
            <b>🔒 {wk?.label || "This week"} is frozen.</b> Values for this week
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
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isCurrentWeekFrozen && (
                    <span
                      style={{
                        background: "rgba(56, 189, 248, 0.25)",
                        color: "#7dd3fc",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="This week's values are frozen and locked"
                    >
                      <Lock size={10} /> Locked
                    </span>
                  )}
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
              maxWidth: "420px",
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
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0f172a",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  ❄️ Freeze Previous Weeks
                </h3>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  Freeze data up to selected date and time
                </div>
              </div>
              <button
                onClick={() => setShowFreezeModal(false)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "5px",
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
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "#ffffff",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "6px",
                  }}
                >
                  Freeze Data Up To Week:
                </label>
                <select
                  value={selectedFreezeWeekId || ""}
                  onChange={handleFreezeWeekChange}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {model.weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} {w.range ? `(${w.range})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1e293b",
                      marginBottom: "6px",
                    }}
                  >
                    Select Date:
                  </label>
                  <input
                    type="date"
                    value={selectedFreezeDate}
                    onChange={(e) => setSelectedFreezeDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "14px",
                      fontWeight: 500,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1e293b",
                      marginBottom: "6px",
                    }}
                  >
                    Select Time:
                  </label>
                  <input
                    type="time"
                    value={selectedFreezeTime}
                    onChange={(e) => setSelectedFreezeTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "14px",
                      fontWeight: 500,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Freezing Password Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "6px",
                  }}
                >
                  🔒 Freezing Password:
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showFreezePassword ? "text" : "password"}
                    placeholder="Enter freezing password"
                    value={freezePassword}
                    onChange={(e) => {
                      setFreezePassword(e.target.value);
                      if (freezePasswordError) setFreezePasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmFreeze();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 40px 9px 12px",
                      borderRadius: "10px",
                      border: freezePasswordError
                        ? "1.5px solid #ef4444"
                        : "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "14px",
                      outline: "none",
                      boxShadow: freezePasswordError
                        ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                        : "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFreezePassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      borderRadius: "6px",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#0f172a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#64748b")
                    }
                    title={
                      showFreezePassword ? "Hide password" : "Show password"
                    }
                  >
                    {showFreezePassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {freezePasswordError && (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {freezePasswordError}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 20px",
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
                  padding: "8px 16px",
                  borderRadius: "9px",
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
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: isFreezing ? "wait" : "pointer",
                  opacity: isFreezing ? 0.75 : 1,
                }}
              >
                <span>
                  {isFreezing ? "Freezing..." : "Freeze Data"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Defreeze Confirmation Modal ── */}
      {showDefreezeModal && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDefreezeModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
              width: "100%",
              maxWidth: "420px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease-out",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0f172a",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  🔓 Defreeze Dashboard Data
                </h3>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  Unlock weeks & re-enable live syncing
                </div>
              </div>
              <button
                onClick={() => setShowDefreezeModal(false)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "5px",
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
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#475569",
                  lineHeight: "1.5",
                  background: "#fef2f2",
                  border: "1px solid #fee2e2",
                  padding: "10px 12px",
                  borderRadius: "8px",
                }}
              >
                Defreezing will unlock all previous weeks and allow live updates
                to resume across all devices.
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "6px",
                  }}
                >
                  🔒 Freezing Password:
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showDefreezePassword ? "text" : "password"}
                    placeholder="Enter freezing password"
                    value={defreezePassword}
                    onChange={(e) => {
                      setDefreezePassword(e.target.value);
                      if (defreezePasswordError) setDefreezePasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmDefreeze();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 40px 9px 12px",
                      borderRadius: "10px",
                      border: defreezePasswordError
                        ? "1.5px solid #ef4444"
                        : "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "14px",
                      outline: "none",
                      boxShadow: defreezePasswordError
                        ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                        : "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDefreezePassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      borderRadius: "6px",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#0f172a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#64748b")
                    }
                    title={
                      showDefreezePassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showDefreezePassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {defreezePasswordError && (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {defreezePasswordError}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "#f8fafc",
              }}
            >
              <button
                onClick={() => setShowDefreezeModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "9px",
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
                onClick={handleConfirmDefreeze}
                disabled={isDefreezing}
                style={{
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "9px",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  cursor: isDefreezing ? "wait" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: isDefreezing ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDefreezing)
                    e.currentTarget.style.background = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  if (!isDefreezing)
                    e.currentTarget.style.background = "#ef4444";
                }}
              >
                {isDefreezing ? "Defreezing..." : "Defreeze Dashboard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
