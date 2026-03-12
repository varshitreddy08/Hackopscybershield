import { useEffect, useState } from "react";
import api from "../api";

function StatsCards() {
  const [stats, setStats] = useState({
    totalPackets: 0,
    uniqueEndpoints: 0,
    protocols: 0,
    suspiciousIPs: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [trafficRes, suspiciousRes] = await Promise.all([
          api.get("/traffic"),
          api.get("/analysis/suspicious"),
        ]);

        const traffic = trafficRes.data;
        const suspicious = suspiciousRes.data;

        const endpoints = new Set();
        const protocols = new Set();

        traffic.forEach((t) => {
          endpoints.add(t.source_ip);
          endpoints.add(t.destination_ip);
          protocols.add(t.protocol);
        });

        setStats({
          totalPackets: traffic.length,
          uniqueEndpoints: endpoints.size,
          protocols: protocols.size,
          suspiciousIPs: suspicious.length,
        });
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Total Packets Captured</div>
        <div className="stat-value white">
          {stats.totalPackets.toLocaleString()}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Unique Endpoints</div>
        <div className="stat-value green">
          {stats.uniqueEndpoints.toLocaleString()}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Protocols Detected</div>
        <div className="stat-value orange">
          {stats.protocols.toLocaleString()}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Suspicious IPs</div>
        <div className="stat-value red">
          {stats.suspiciousIPs.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
