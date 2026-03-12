import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";
import api from "../api";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ec4899", "#14b8a6", "#a855f7"];

function TrafficChart() {
  const [data, setData] = useState([]);
  const [protocols, setProtocols] = useState([]);

  useEffect(() => {
    const fetchData = () => {
    api
      .get("/traffic")
      .then((res) => {
        const traffic = res.data;

        // Group by buckets and protocol
        const bucketSize = Math.max(1, Math.floor(traffic.length / 20));
        const protocolSet = new Set();
        const buckets = [];

        for (let i = 0; i < traffic.length; i += bucketSize) {
          const slice = traffic.slice(i, i + bucketSize);
          const entry = { time: `${Math.floor(i / bucketSize) + 1}` };

          slice.forEach((pkt) => {
            const proto = pkt.protocol || "Other";
            protocolSet.add(proto);
            entry[proto] = (entry[proto] || 0) + (pkt.packet_count || 1);
          });

          buckets.push(entry);
        }

        setProtocols([...protocolSet]);
        setData(buckets);
      })
      .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">Traffic Trend by Protocol</div>
      <div className="panel-body">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              {protocols.map((proto, i) => (
                <linearGradient key={proto} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="time" stroke="#4a5568" tick={{ fill: "#8b95a5", fontSize: 11 }} />
            <YAxis stroke="#4a5568" tick={{ fill: "#8b95a5", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#1e2535", border: "1px solid #2a3140", borderRadius: 4 }}
              labelStyle={{ color: "#e1e6ed" }}
              itemStyle={{ color: "#c3cbd6" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8b95a5" }} />
            {protocols.map((proto, i) => (
              <Area
                key={proto}
                type="monotone"
                dataKey={proto}
                stackId="1"
                stroke={COLORS[i % COLORS.length]}
                fill={`url(#grad-${i})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrafficChart;