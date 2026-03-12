import { useEffect, useState } from "react";
import api from "../api";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${h}${ampm}`;
});

// eslint-disable-next-line no-unused-vars
const PROTOCOLS = [];

function TimingHeatmap() {
  const [data, setData] = useState([]);
  const [protocolList, setProtocolList] = useState([]);

  useEffect(() => {
    const fetchData = () => {
    api
      .get("/traffic")
      .then((res) => {
        const traffic = res.data;

        // Simulate timing distribution from packet index patterns
        const protocolSet = new Set();
        const heatData = [];

        traffic.forEach((pkt, idx) => {
          const proto = pkt.protocol || "Other";
          protocolSet.add(proto);

          // Distribute across hours based on index pattern
          const hour = idx % 24;
          const existing = heatData.find(
            (d) => d.hour === hour && d.protocol === proto
          );
          if (existing) {
            existing.count += pkt.packet_count || 1;
          } else {
            heatData.push({
              hour,
              protocol: proto,
              count: pkt.packet_count || 1,
            });
          }
        });

        const protos = [...protocolSet];
        setProtocolList(protos);

        // Convert to scatter chart format: x = hour, y = protocol index, z = count
        const scatterData = heatData.map((d) => ({
          x: d.hour,
          y: protos.indexOf(d.protocol),
          z: d.count,
          protocol: d.protocol,
          hourLabel: HOURS[d.hour],
        }));

        setData(scatterData);
      })
      .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const maxCount = Math.max(...data.map((d) => d.z), 1);

  return (
    <div className="panel">
      <div className="panel-header">Communication Timing Analysis</div>
      <div className="panel-body">
        <ResponsiveContainer width="100%" height={Math.max(200, protocolList.length * 50 + 60)}>
          <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 23]}
              tickCount={24}
              tickFormatter={(v) => HOURS[v] || ""}
              stroke="#4a5568"
              tick={{ fill: "#8b95a5", fontSize: 10 }}
              interval={0}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-0.5, Math.max(protocolList.length - 0.5, 0.5)]}
              tickCount={protocolList.length}
              tickFormatter={(v) => protocolList[v] || ""}
              stroke="#4a5568"
              tick={{ fill: "#8b95a5", fontSize: 11 }}
              width={60}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[20, 800]}
              domain={[0, maxCount]}
            />
            <Tooltip
              contentStyle={{
                background: "#1e2535",
                border: "1px solid #2a3140",
                borderRadius: 4,
              }}
              formatter={(val, name) => {
                if (name === "z") return [val, "Packets"];
                return [val, name];
              }}
              labelFormatter={() => ""}
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: "#1e2535", border: "1px solid #2a3140", borderRadius: 4, padding: "8px 12px" }}>
                    <div style={{ color: "#e1e6ed", fontSize: 12 }}>{d.protocol} @ {d.hourLabel}</div>
                    <div style={{ color: "#3b82f6", fontSize: 13, fontWeight: 600 }}>{d.z} packets</div>
                  </div>
                );
              }}
            />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill="#3b82f6"
                  fillOpacity={0.3 + (entry.z / maxCount) * 0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TimingHeatmap;
