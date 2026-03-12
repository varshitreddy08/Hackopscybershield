import { useEffect, useState } from "react";
import api from "../api";

function SuspiciousIPs() {
  const [ips, setIps] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/analysis/suspicious")
        .then((res) => setIps(res.data))
        .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const maxCount = Math.max(...ips.map((ip) => ip.communication_count), 1);

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">
        Suspicious Endpoint Detection
        {ips.length > 0 && (
          <span style={{ float: "right", color: "#ef4444", fontSize: 12, fontWeight: 400 }}>
            {ips.length} flagged
          </span>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Destination IP</th>
              <th>Communication Count</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {ips.map((ip, i) => (
              <tr key={i}>
                <td style={{ color: "#ef4444" }}>{ip.destination_ip}</td>
                <td>
                  <div className="bar-cell">
                    <div
                      className="bar red"
                      style={{
                        width: `${Math.max((ip.communication_count / maxCount) * 100, 12)}px`,
                      }}
                    />
                    <span>{ip.communication_count}</span>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      background: ip.communication_count > 100 ? "#7f1d1d" : "#78350f",
                      color: ip.communication_count > 100 ? "#fca5a5" : "#fbbf24",
                      padding: "2px 10px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {ip.communication_count > 100 ? "HIGH" : "MEDIUM"}
                  </span>
                </td>
              </tr>
            ))}
            {ips.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "#4a5568", padding: 20 }}>
                  No suspicious endpoints detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SuspiciousIPs;