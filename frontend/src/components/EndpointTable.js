import { useState, useEffect } from "react";
import api from "../api";

const PAGE_SIZE = 10;

function EndpointTable() {
  const [traffic, setTraffic] = useState([]);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("packet_count");
  const [sortDir, setSortDir] = useState(-1);

  useEffect(() => {
    const fetchTraffic = () => {
      api
        .get("/traffic")
        .then((res) => setTraffic(res.data))
        .catch((err) => console.error(err));
    };
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => d * -1);
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sorted = [...traffic].sort((a, b) => {
    const aVal = a[sortKey] || "";
    const bVal = b[sortKey] || "";
    if (typeof aVal === "number") return (aVal - bVal) * sortDir;
    return String(aVal).localeCompare(String(bVal)) * sortDir;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxPackets = Math.max(...traffic.map((t) => t.packet_count || 1), 1);

  const arrow = (key) =>
    sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "";

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">Communication Endpoints</div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("source_ip")}>
                Source IP{arrow("source_ip")}
              </th>
              <th onClick={() => handleSort("destination_ip")}>
                Destination IP{arrow("destination_ip")}
              </th>
              <th onClick={() => handleSort("protocol")}>
                Protocol{arrow("protocol")}
              </th>
              <th onClick={() => handleSort("packet_count")}>
                Packets{arrow("packet_count")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((t, i) => (
              <tr key={i}>
                <td>{t.source_ip}</td>
                <td>{t.destination_ip}</td>
                <td>
                  <span
                    style={{
                      background: "#2a3140",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontSize: "12px",
                      color: t.protocol === "TCP" ? "#3b82f6" : t.protocol === "UDP" ? "#22c55e" : "#f97316",
                    }}
                  >
                    {t.protocol}
                  </span>
                </td>
                <td>
                  <div className="bar-cell">
                    <div
                      className="bar blue"
                      style={{
                        width: `${Math.max((t.packet_count / maxPackets) * 80, 8)}px`,
                      }}
                    />
                    <span>{t.packet_count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            « prev
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            next »
          </button>
        </div>
      )}
    </div>
  );
}

export default EndpointTable;