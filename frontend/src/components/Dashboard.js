import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../api";
import StatsCards from "./StatsCards";
import TrafficChart from "./TrafficChart";
import EndpointTable from "./EndpointTable";
import WorldMap from "./WorldMap";
import UploadPCAP from "./UploadPCAP";
import SuspiciousIPs from "./SuspiciousIPs";
import CommunicationGraph from "./CommunicationGraph";
import CommunicationFrequency from "./CommunicationFrequency";
import TimingHeatmap from "./TimingHeatmap";
import ThreatDetection from "./ThreatDetection";
import CyberBackground from "./CyberBackground";
import ErrorBoundary from "./ErrorBoundary";

function Dashboard() {
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = () => {
      api.get("/uploads/history").then(r => setHistory(r.data)).catch(() => {});
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <CyberBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span>◆</span>
          <h1>HackOps</h1>
        </div>
        <div className="navbar-links">
          <Link to="/" style={{ color: "#e1e6ed" }}>Dashboard</Link>
          <Link to="/analysis">Analysis</Link>
          <Link to="/endpoints">Endpoints</Link>
          <Link to="/report">Report</Link>
          <span style={{ color: "#4a5568", margin: "0 4px" }}>|</span>
          <button onClick={() => setShowHistory(!showHistory)} style={{
            background: "none", border: "1px solid #2d3748", color: "#3b82f6",
            padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12
          }}>History ({history.length})</button>
          {user ? (
            <>
              <span style={{ color: "#8b95a5", fontSize: 12 }}>{user.email}</span>
              <button onClick={signOut} style={{
                background: "none", border: "1px solid #2d3748", color: "#8b95a5",
                padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12
              }}>Sign Out</button>
            </>
          ) : (
            <Link to="/login" style={{
              background: "#3b82f6", color: "#fff", padding: "6px 16px",
              borderRadius: 4, textDecoration: "none", fontSize: 13, fontWeight: 600
            }}>Login</Link>
          )}
        </div>
      </nav>

      {/* File Upload History Dropdown */}
      {showHistory && (
        <div style={{
          position: "absolute", top: 50, right: 24, width: 360,
          background: "#1e2535", border: "1px solid #2d3748", borderRadius: 8,
          padding: 16, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ color: "#e1e6ed", margin: 0, fontSize: 14 }}>Upload History</h4>
            <button onClick={() => setShowHistory(false)} style={{
              background: "none", border: "none", color: "#8b95a5", cursor: "pointer", fontSize: 16
            }}>✕</button>
          </div>
          {history.length === 0 ? (
            <p style={{ color: "#8b95a5", fontSize: 13 }}>No files uploaded yet</p>
          ) : (
            history.slice().reverse().map((h, i) => (
              <div key={i} style={{
                padding: "8px 0", borderBottom: i < history.length - 1 ? "1px solid #2d3748" : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ color: "#e1e6ed", fontSize: 13, fontWeight: 500 }}>{h.filename}</div>
                  <div style={{ color: "#8b95a5", fontSize: 11 }}>
                    {h.packets} packets • {new Date(h.timestamp).toLocaleString()}
                  </div>
                </div>
                <span style={{
                  background: "#22c55e20", color: "#22c55e", padding: "2px 8px",
                  borderRadius: 3, fontSize: 10, fontWeight: 600
                }}>ANALYZED</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>Encrypted Traffic Analysis</h2>
          <div className="subtitle">
            Deanonymisation of encrypted communications — metadata forensics dashboard
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#22c55e", display: "inline-block",
            animation: "pulse 2s infinite"
          }} />
          <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Upload */}
      <ErrorBoundary>
        <UploadPCAP />
      </ErrorBoundary>

      {/* Stat Cards Row */}
      <ErrorBoundary>
        <StatsCards />
      </ErrorBoundary>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Row 1: Endpoint Table + Traffic Trend + Party B */}
        <div className="grid-row-3">
          <ErrorBoundary>
            <EndpointTable />
          </ErrorBoundary>
          <ErrorBoundary>
            <TrafficChart />
          </ErrorBoundary>
          <ErrorBoundary>
            <CommunicationFrequency />
          </ErrorBoundary>
        </div>

        {/* Row 2: Communication Graph + Traffic Distribution */}
        <div className="grid-row-2">
          <ErrorBoundary>
            <CommunicationGraph />
          </ErrorBoundary>
          <ErrorBoundary>
            <WorldMap />
          </ErrorBoundary>
        </div>

        {/* Row 3: Timing Heatmap (full width) */}
        <div className="grid-row-1">
          <ErrorBoundary>
            <TimingHeatmap />
          </ErrorBoundary>
        </div>

        {/* Row 4: Suspicious IPs (full width) */}
        <div className="grid-row-1">
          <ErrorBoundary>
            <SuspiciousIPs />
          </ErrorBoundary>
        </div>

        {/* Row 5: Live Threat Detection */}
        <div className="grid-row-1">
          <ErrorBoundary>
            <ThreatDetection />
          </ErrorBoundary>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;