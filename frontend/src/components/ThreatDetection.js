import { useEffect, useState, useRef } from "react";
import api from "../api";

const SEVERITY_CONFIG = {
  critical: { bg: "rgba(127,29,29,0.6)", color: "#fca5a5", border: "#ef4444", icon: "⚠", glow: "rgba(239,68,68,0.3)" },
  high: { bg: "rgba(120,53,15,0.6)", color: "#fbbf24", border: "#f97316", icon: "●", glow: "rgba(249,115,22,0.2)" },
  warning: { bg: "rgba(30,58,95,0.6)", color: "#93c5fd", border: "#3b82f6", icon: "◆", glow: "rgba(59,130,246,0.2)" },
};

/* Inject keyframes once */
const styleId = "threat-detect-keyframes";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const s = document.createElement("style");
  s.id = styleId;
  s.textContent = `
    @keyframes td-slide-in { 0% { opacity: 0; transform: translateX(-20px); } 100% { opacity: 1; transform: translateX(0); } }
    @keyframes td-pulse-dot { 0%,100% { opacity:1; box-shadow: 0 0 4px currentColor; } 50% { opacity:0.4; box-shadow: 0 0 8px currentColor; } }
    @keyframes td-scan-line { 0% { top: 0; } 100% { top: 100%; } }
    @keyframes td-count-up { 0% { opacity:0; transform: scale(0.5); } 100% { opacity:1; transform: scale(1); } }
    @keyframes td-flash { 0%,100% { border-color: #ef4444; } 50% { border-color: #fbbf24; } }
    @keyframes td-glow { 0%,100% { box-shadow: 0 0 20px rgba(239,68,68,0.1); } 50% { box-shadow: 0 0 40px rgba(239,68,68,0.2); } }
  `;
  document.head.appendChild(s);
}

function ThreatDetection() {
  const [threats, setThreats] = useState([]);
  const [prevCount, setPrevCount] = useState(0);
  const [isNew, setIsNew] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const listRef = useRef(null);

  // Live timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch threats
  useEffect(() => {
    const fetch = () => {
      api.get("/analysis/threats").then((res) => {
        const d = res.data;
        if (d.length > prevCount && prevCount > 0) {
          setIsNew(true);
          setTimeout(() => setIsNew(false), 2000);
        }
        setPrevCount(d.length);
        setThreats(d);
      }).catch(() => {});
    };
    fetch();
    const iv = setInterval(fetch, 4000);
    return () => clearInterval(iv);
  }, [prevCount]);

  const criticalCount = threats.filter(t => t.severity === "critical").length;
  const highCount = threats.filter(t => t.severity === "high").length;
  const warningCount = threats.filter(t => t.severity === "warning").length;

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0e17 0%, #111827 100%)",
      border: `1px solid ${criticalCount > 0 ? "#ef4444" : "#1e293b"}`,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
      animation: isNew ? "td-flash 0.5s ease 3, td-glow 2s ease-in-out infinite" : "td-glow 4s ease-in-out infinite",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Scanning line */}
      <div style={{
        position: "absolute", left: 0, width: "100%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)",
        animation: "td-scan-line 4s linear infinite", pointerEvents: "none", zIndex: 2,
      }} />

      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: criticalCount > 0
          ? "linear-gradient(90deg, rgba(127,29,29,0.3), rgba(17,24,39,0.8))"
          : "linear-gradient(90deg, rgba(17,24,39,0.9), rgba(17,24,39,0.8))",
        borderBottom: `1px solid ${criticalCount > 0 ? "rgba(239,68,68,0.3)" : "#1e293b"}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: criticalCount > 0 ? "#ef4444" : "#22c55e",
            animation: "td-pulse-dot 1.5s ease-in-out infinite",
            color: criticalCount > 0 ? "#ef4444" : "#22c55e",
          }} />
          <span style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
            LIVE THREAT DETECTION
          </span>
          <span style={{
            background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 10,
            padding: "2px 8px", borderRadius: 4, fontWeight: 600, letterSpacing: 1,
          }}>ACTIVE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontFamily: "monospace", color: "#64748b", fontSize: 12,
            background: "rgba(15,23,42,0.6)", padding: "3px 8px", borderRadius: 4,
          }}>
            {fmt(elapsed)}
          </span>
        </div>
      </div>

      {/* Severity summary bar */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #1e293b",
      }}>
        {[
          { label: "CRITICAL", count: criticalCount, color: "#ef4444", bg: "rgba(127,29,29,0.2)" },
          { label: "HIGH", count: highCount, color: "#f97316", bg: "rgba(120,53,15,0.2)" },
          { label: "WARNING", count: warningCount, color: "#3b82f6", bg: "rgba(30,58,95,0.2)" },
          { label: "TOTAL", count: threats.length, color: "#94a3b8", bg: "rgba(15,23,42,0.4)" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "12px 16px", textAlign: "center",
            background: s.bg, borderRight: i < 3 ? "1px solid #1e293b" : "none",
          }}>
            <div style={{
              fontSize: 22, fontWeight: 800, color: s.color,
              fontFamily: "monospace",
              animation: "td-count-up 0.6s ease-out",
              textShadow: `0 0 20px ${s.color}44`,
            }}>
              {s.count}
            </div>
            <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, letterSpacing: 1.5, marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Threat list */}
      {threats.length === 0 ? (
        <div style={{
          padding: "40px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <div style={{ color: "#22c55e", fontSize: 14, fontWeight: 600 }}>No Threats Detected</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
            Upload a PCAP file to begin real-time threat analysis
          </div>
        </div>
      ) : (
        <div ref={listRef} style={{ maxHeight: 360, overflowY: "auto" }}>
          {threats.map((threat, i) => {
            const cfg = SEVERITY_CONFIG[threat.severity] || SEVERITY_CONFIG.warning;
            return (
              <div
                key={`${threat.type}-${threat.ip}-${i}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(30,41,59,0.5)",
                  animation: `td-slide-in 0.4s ease ${Math.min(i * 0.05, 0.5)}s both`,
                  cursor: "default",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Severity badge */}
                <span style={{
                  background: cfg.bg, color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  padding: "3px 10px", borderRadius: 4,
                  fontSize: 10, fontWeight: 700,
                  minWidth: 72, textAlign: "center",
                  textTransform: "uppercase", flexShrink: 0, marginTop: 2,
                  letterSpacing: 0.5,
                  boxShadow: `0 0 12px ${cfg.glow}`,
                }}>
                  {cfg.icon} {threat.severity}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{
                      color: "#e2e8f0", fontSize: 13, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif", letterSpacing: 0.2,
                    }}>
                      {threat.type.replace(/_/g, " ")}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {threat.count > 1 && (
                        <span style={{
                          background: "rgba(99,102,241,0.15)", color: "#818cf8",
                          fontSize: 10, padding: "1px 6px", borderRadius: 3, fontWeight: 600,
                        }}>
                          ×{threat.count}
                        </span>
                      )}
                      <span style={{
                        color: cfg.color, fontSize: 12,
                        fontFamily: "monospace", flexShrink: 0,
                        background: "rgba(15,23,42,0.5)", padding: "1px 6px",
                        borderRadius: 3,
                      }}>
                        {threat.ip}
                      </span>
                    </div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    {threat.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "8px 20px", borderTop: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(15,23,42,0.5)",
      }}>
        <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>
          Auto-refresh every 4s
        </span>
        <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
          ENGINE v2.0 • PATTERNS: {new Set(threats.map(t => t.type)).size}
        </span>
      </div>
    </div>
  );
}

export default ThreatDetection;
