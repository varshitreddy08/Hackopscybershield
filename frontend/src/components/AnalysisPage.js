import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ThreatDetection from "./ThreatDetection";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a78bfa", "#fbbf24", "#ec4899"];

function AnalysisPage() {
  const [traffic, setTraffic] = useState([]);
  const [partyB, setPartyB] = useState([]);
  const [threats, setThreats] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const fetchAll = () => {
      Promise.all([
        api.get("/traffic"),
        api.get("/analysis/partyB"),
        api.get("/analysis/threats"),
      ]).then(([tRes, pRes, thRes]) => {
        setTraffic(tRes.data);
        setPartyB(pRes.data);
        setThreats(thRes.data);
      }).catch(console.error);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);

    // SSE for real-time threat events
    const baseURL = api.defaults.baseURL || "http://localhost:5000";
    const es = new EventSource(`${baseURL}/threats/stream`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        setLiveEvents((prev) => [evt, ...prev].slice(0, 50));
        // Also refresh threat data on new events
        fetchAll();
      } catch {}
    };
    eventSourceRef.current = es;

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, []);

  // Protocol data
  const protoCounts = {};
  traffic.forEach((t) => {
    const p = t.protocol || "Unknown";
    protoCounts[p] = (protoCounts[p] || 0) + 1;
  });
  const protoData = Object.entries(protoCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // IP frequency
  const ipFreq = {};
  traffic.forEach((t) => {
    ipFreq[t.destination_ip] = (ipFreq[t.destination_ip] || 0) + 1;
  });
  const topIPs = Object.entries(ipFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  const criticalThreats = threats.filter((t) => t.severity === "critical");

  return (
    <div style={{ background: "#171d2b", minHeight: "100vh" }}>
      <nav className="navbar">
        <div className="navbar-brand">
          <span>◆</span>
          <h1>HackOps</h1>
        </div>
        <div className="navbar-links">
          <Link to="/">Dashboard</Link>
          <Link to="/analysis" style={{ color: "#e1e6ed" }}>Analysis</Link>
          <Link to="/endpoints">Endpoints</Link>
          <Link to="/report">Report</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: "20px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ color: "#e1e6ed", fontSize: 22, fontWeight: 600, margin: 0 }}>
            Threat Analysis
          </h2>
          <div style={{ color: "#8b95a5", fontSize: 13, marginTop: 2 }}>
            Deep forensic analysis of captured metadata
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#ef4444", display: "inline-block",
            animation: "pulse-threat 1s infinite",
          }} />
          <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>ANALYZING</span>
        </div>
      </div>

      {/* Threat Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Threats</div>
          <div className="stat-value red">{threats.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical Alerts</div>
          <div className="stat-value orange">{criticalThreats.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Protocols Seen</div>
          <div className="stat-value blue">{protoData.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Party B Targets</div>
          <div className="stat-value white">{partyB.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 24px 16px" }}>
        {/* Protocol Pie */}
        <div className="panel">
          <div className="panel-header">Protocol Distribution</div>
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={protoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#3a4556" }}
                >
                  {protoData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1e2535", border: "1px solid #2a3140", borderRadius: 4 }}
                  itemStyle={{ color: "#c3cbd6" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top IPs Bar */}
        <div className="panel">
          <div className="panel-header">Top Destination IPs</div>
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topIPs} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="#2a3140" tick={{ fill: "#8b95a5", fontSize: 11 }} />
                <YAxis dataKey="ip" type="category" width={110} stroke="#2a3140" tick={{ fill: "#8b95a5", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1e2535", border: "1px solid #2a3140", borderRadius: 4 }}
                  labelStyle={{ color: "#e1e6ed" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {topIPs.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Threat Detection */}
      <div style={{ padding: "0 24px 16px" }}>
        <ThreatDetection />
      </div>

      {/* Real-Time Event Feed */}
      <div style={{ padding: "0 24px 24px" }}>
        <div className="panel">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                display: "inline-block", animation: "pulse-threat 1.5s infinite",
              }} />
              <span>Real-Time Event Stream</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 400, color: "#8b95a5" }}>
              {liveEvents.length} events captured
            </span>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#475569", fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📡</div>
                Waiting for real-time events... Upload a PCAP to trigger live detection.
              </div>
            ) : (
              liveEvents.map((evt, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 20px",
                  borderBottom: "1px solid rgba(30,41,59,0.5)",
                  animation: i === 0 ? "td-slide-in 0.3s ease" : undefined,
                  fontSize: 12,
                }}>
                  <span style={{
                    fontFamily: "monospace", color: "#475569", fontSize: 10, minWidth: 72,
                  }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{
                    background: evt.severity === "critical" ? "#7f1d1d" : evt.severity === "high" ? "#78350f" : "#1e3a5f",
                    color: evt.severity === "critical" ? "#fca5a5" : evt.severity === "high" ? "#fbbf24" : "#93c5fd",
                    padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                    textTransform: "uppercase", minWidth: 56, textAlign: "center",
                  }}>
                    {evt.severity}
                  </span>
                  <span style={{ color: "#3b82f6", fontFamily: "monospace", minWidth: 110 }}>{evt.ip}</span>
                  <span style={{ color: "#94a3b8", flex: 1 }}>{evt.type.replace(/_/g, " ")}</span>
                  <span style={{ color: "#64748b" }}>{evt.detail}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisPage;
