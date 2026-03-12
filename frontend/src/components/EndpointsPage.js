import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const PAGE_SIZE = 15;

function EndpointsPage() {
  const [traffic, setTraffic] = useState([]);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("count");
  const [sortDir, setSortDir] = useState(-1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/traffic")
        .then((res) => setTraffic(res.data))
        .catch(console.error);
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Aggregate endpoints
  const endpointMap = {};
  traffic.forEach((t) => {
    const ip = t.destination_ip;
    if (!endpointMap[ip]) {
      endpointMap[ip] = { ip, count: 0, protocols: new Set(), sources: new Set() };
    }
    endpointMap[ip].count += 1;
    endpointMap[ip].protocols.add(t.protocol || "Unknown");
    endpointMap[ip].sources.add(t.source_ip);
  });

  let endpoints = Object.values(endpointMap).map((e) => ({
    ...e,
    protocols: [...e.protocols].join(", "),
    uniqueSources: e.sources.size,
    risk: e.count > 80 ? "critical" : e.count > 40 ? "high" : e.count > 15 ? "medium" : "low",
  }));

  // Search
  if (search) {
    endpoints = endpoints.filter((e) =>
      e.ip.includes(search) || e.protocols.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Sort
  endpoints.sort((a, b) => {
    const aVal = a[sortKey] || "";
    const bVal = b[sortKey] || "";
    if (typeof aVal === "number") return (aVal - bVal) * sortDir;
    return String(aVal).localeCompare(String(bVal)) * sortDir;
  });

  const totalPages = Math.ceil(endpoints.length / PAGE_SIZE);
  const pageData = endpoints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxCount = Math.max(...endpoints.map((e) => e.count), 1);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const arrow = (key) => (sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "");

  const riskStyle = (risk) => ({
    critical: { bg: "#7f1d1d", color: "#fca5a5" },
    high: { bg: "#78350f", color: "#fbbf24" },
    medium: { bg: "#1e3a5f", color: "#93c5fd" },
    low: { bg: "#1a2535", color: "#8b95a5" },
  }[risk] || { bg: "#1a2535", color: "#8b95a5" });

  return (
    <div style={{ background: "#171d2b", minHeight: "100vh" }}>
      <nav className="navbar">
        <div className="navbar-brand">
          <span>◆</span>
          <h1>HackOps</h1>
        </div>
        <div className="navbar-links">
          <Link to="/">Dashboard</Link>
          <Link to="/analysis">Analysis</Link>
          <Link to="/endpoints" style={{ color: "#e1e6ed" }}>Endpoints</Link>
          <Link to="/report">Report</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: "20px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ color: "#e1e6ed", fontSize: 22, fontWeight: 600, margin: 0 }}>
            Endpoint Profiling
          </h2>
          <div style={{ color: "#8b95a5", fontSize: 13, marginTop: 2 }}>
            IP behavior profiling and attribution insights
          </div>
        </div>

        <input
          type="text"
          placeholder="Search IP or protocol..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            background: "#1e2535", border: "1px solid #2a3140", borderRadius: 4,
            padding: "8px 14px", color: "#e1e6ed", fontSize: 13, width: 240,
            outline: "none",
          }}
        />
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Endpoints</div>
          <div className="stat-value blue">{endpoints.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical Risk</div>
          <div className="stat-value red">{endpoints.filter((e) => e.risk === "critical").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value orange">{endpoints.filter((e) => e.risk === "high").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Connections</div>
          <div className="stat-value white">{traffic.length}</div>
        </div>
      </div>

      {/* Endpoint Table */}
      <div style={{ padding: "0 24px 24px" }}>
        <div className="panel">
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { key: "ip", label: "Destination IP" },
                    { key: "count", label: "Connections" },
                    { key: "uniqueSources", label: "Unique Sources" },
                    { key: "protocols", label: "Protocols" },
                    { key: "risk", label: "Risk Level" },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => handleSort(key)}>
                      {label}{arrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((e, i) => {
                  const rs = riskStyle(e.risk);
                  return (
                    <tr key={i}>
                      <td style={{ color: "#3b82f6", fontFamily: "monospace" }}>{e.ip}</td>
                      <td>
                        <div className="bar-cell">
                          <div className="bar blue" style={{ width: `${Math.max((e.count / maxCount) * 80, 8)}px` }} />
                          <span style={{ color: "#c3cbd6" }}>{e.count}</span>
                        </div>
                      </td>
                      <td style={{ color: "#8b95a5" }}>{e.uniqueSources}</td>
                      <td>
                        {e.protocols.split(", ").map((p) => (
                          <span key={p} style={{
                            background: "#2a3140", padding: "2px 6px", borderRadius: 3,
                            fontSize: 11, color: "#f97316", marginRight: 4,
                          }}>
                            {p}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span style={{
                          background: rs.bg, color: rs.color,
                          padding: "2px 10px", borderRadius: 3,
                          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                        }}>
                          {e.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                « prev
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={p === page ? "active" : ""}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                next »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EndpointsPage;
