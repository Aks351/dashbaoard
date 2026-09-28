import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { EDIT_KEY } from "../constants/kpiConstants";

export default function UnlockEditingModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on open
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!password) {
      setError("Please enter the editor passphrase.");
      return;
    }
    if (password === EDIT_KEY) {
      onSuccess();
    } else {
      setError("Wrong passphrase. You can still view, but not edit.");
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
        if (e.target === e.currentTarget) onClose();
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Lock size={16} style={{ color: "#3b82f6" }} /> Unlock Editing
            </h3>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginTop: "2px",
              }}
            >
              Enter the editor password to enable editing
            </div>
          </div>
          <button
            onClick={onClose}
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
        <form onSubmit={handleSubmit} style={{ margin: 0 }}>
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
                Password:
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 40px 9px 12px",
                    borderRadius: "10px",
                    border: error
                      ? "1.5px solid #ef4444"
                      : "1.5px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "14px",
                    outline: "none",
                    boxShadow: error
                      ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                      : "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "4px",
                    fontWeight: 400,
                  }}
                >
                  {error}
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
              type="button"
              onClick={onClose}
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
              type="submit"
              className="btn-primary"
              style={{
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "9px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Unlock Editing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
