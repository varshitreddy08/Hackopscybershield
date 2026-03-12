import { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ec4899", "#14b8a6"];

function CommunicationFrequency() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
    api
      .get("/analysis/partyB")
      .then((res) => {
        setData(
          res.data.map((d) => ({
            ip: d.destination_ip,
            count: d.communication_count,
          }))
        );
      })
      .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">Top Communication Partners (Party B)</div>
      <div className="panel-body">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis
              type="number"
              stroke="#4a5568"
              tick={{ fill: "#8b95a5", fontSize: 11 }}
            />
            <YAxis
              dataKey="ip"
              type="category"
              width={120}
              stroke="#4a5568"
              tick={{ fill: "#8b95a5", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "#1e2535",
                border: "1px solid #2a3140",
                borderRadius: 4,
              }}
              labelStyle={{ color: "#e1e6ed" }}
              itemStyle={{ color: "#c3cbd6" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CommunicationFrequency;
