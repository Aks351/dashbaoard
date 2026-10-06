import React, { useState, useContext, useMemo } from "react";
import {
  X,
  Download,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { KpiContext } from "../store/kpiStore";
import { getAvailableMonths, weeksInMonth } from "../utils/dateUtils";
import { downloadReportPdf } from "../utils/pdfExportUtils";

export default function DownloadReportModal({
  onClose,
  defaultSectionId = "overview",
  defaultPeriod = null,
}) {
  const { model, activePeriod } = useContext(KpiContext);
  const { weeks, departments, meta } = model;

  const availableMonths = useMemo(() => {
    return getAvailableMonths(weeks, meta?.period || "");
  }, [weeks, meta]);

  const [selectedSection, setSelectedSection] = useState(
    defaultSectionId || "overview",
  );
  const [selectedMonth, setSelectedMonth] = useState(
    defaultPeriod ||
      activePeriod ||
      (availableMonths.length
        ? availableMonths[availableMonths.length - 1]
        : ""),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Calculate stats for preview
  const previewWeeks = useMemo(() => {
    if (!selectedMonth || selectedMonth === "all") return weeks;
    return weeksInMonth(weeks, selectedMonth);
  }, [weeks, selectedMonth]);

  const targetKpiCount = useMemo(() => {
    if (selectedSection === "all") {
      return departments.reduce((acc, d) => acc + d.metrics.length, 0);
    }
    if (selectedSection === "overview") {
      return departments.reduce((acc, d) => {
        return (
          acc +
          d.metrics.filter(
            (m) => d.id !== "hiring" || !/·\s*Position:/i.test(m.sub || ""),
          ).length
        );
      }, 0);
    }
    const dept = departments.find((d) => d.id === selectedSection);
    return dept ? dept.metrics.length : 0;
  }, [departments, selectedSection]);

  const targetFilename = useMemo(() => {
    const cleanPeriod = (selectedMonth || "All_Months").replace(/\s+/g, "_");
    if (selectedSection === "all") {
      return `Vinayak_Enterprises_Master_KPI_Report_${cleanPeriod}.pdf`;
    }
    if (selectedSection === "overview") {
      return `Vinayak_Enterprises_Overview_KPI_Report_${cleanPeriod}.pdf`;
    }
    const dept = departments.find((d) => d.id === selectedSection);
    const deptName = dept ? dept.name.replace(/\s+/g, "_") : selectedSection;
    return `Vinayak_Enterprises_${deptName}_KPI_Report_${cleanPeriod}.pdf`;
  }, [selectedSection, selectedMonth, departments]);

  const handleDownload = async () => {
    setIsGenerating(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const fileName = await downloadReportPdf(model, {
        sectionId: selectedSection,
        period: selectedMonth === "all" ? "" : selectedMonth,
      });
      setSuccessMsg(`Report downloaded successfully: ${fileName}`);
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
      setErrorMsg(err.message || "Failed to generate PDF report.");
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
          width: "100%",
          maxWidth: "520px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "fadeIn 0.15s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
              }}
            >
              <Download size={18} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                }}
              >
                Download Monthly Report
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Export executive PDF report with live MTD rollup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            style={{
              background: "transparent",
              border: "none",
              cursor: isGenerating ? "not-allowed" : "pointer",
              color: "#94a3b8",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* File Format Badge */}
          {/* <div
            style={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              padding: "12px 14px",
              display: "flex",
              gap: "2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} style={{ color: "#ef4444" }} />
            </div>
            <span
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "3px 9px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              PDF ONLY
            </span>
          </div> */}

          {/* Section Selection */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              <Layers size={15} style={{ color: "#0284c7" }} />
              Select Section / Department
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={isGenerating}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: "14px",
                color: "#0f172a",
                outline: "none",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {/* <option value="all">
                📑 All Sections (Consolidated Master PDF)
              </option>
              <option value="overview">
                📊 Overview (Executive Summary Scorecard)
              </option> */}
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.name} Department
                </option>
              ))}
            </select>
          </div>

          {/* Month Selection */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              <Calendar size={15} style={{ color: "#0284c7" }} />
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isGenerating}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: "14px",
                color: "#0f172a",
                outline: "none",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="all">All Months (Full Timeline History)</option>
            </select>
          </div>

          {/* Preview / Metadata Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "12px",
              color: "#475569",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Month:</span>
              <strong style={{ color: "#0f172a" }}>
                {selectedMonth === "all" ? "All Months" : selectedMonth}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Included Weeks:</span>
              <strong style={{ color: "#0f172a" }}>
                {previewWeeks.length} week{previewWeeks.length !== 1 ? "s" : ""}
                {previewWeeks.length > 0 &&
                  ` (${previewWeeks[0].label} – ${previewWeeks[previewWeeks.length - 1].label})`}
              </strong>
            </div>
            {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Metrics & Indicators:</span>
              <strong style={{ color: "#0f172a" }}>
                {targetKpiCount} KPIs
              </strong>
            </div> */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "2px",
                paddingTop: "6px",
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              <span>Target File:</span>
              <span
                style={{
                  color: "#0369a1",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {targetFilename}
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "12px",
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                color: "#065f46",
                fontSize: "12px",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: isGenerating ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: isGenerating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
              opacity: isGenerating ? 0.75 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={15} />
                Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
