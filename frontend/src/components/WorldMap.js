import { useEffect, useState } from "react";
import api from "../api";
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#ec4899", "#14b8a6",
  "#a855f7", "#eab308", "#ef4444", "#06b6d4", "#84cc16",
];

function WorldMap() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
    api
      .get("/traffic")
      .then((res) => {
        const traffic = res.data;

        // Aggregate by destination IP
        const ipCount = {};
        traffic.forEach((t) => {
          const ip = t.destination_ip;
          ipCount[ip] = (ipCount[ip] || 0) + (t.packet_count || 1);
        });

        const sorted = Object.entries(ipCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20);

        const treeData = sorted.map(([ip, count], i) => ({
          name: ip,
          size: count,
          fill: COLORS[i % COLORS.length],
        }));

        setData(treeData);
      })
      .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const CustomContent = (props) => {
    const { x, y, width, height, name, fill } = props;
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#141a26" strokeWidth={2} rx={3} />
        {width > 50 && height > 30 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 5} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
              {name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={10}>
              {props.size} pkts
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">Endpoint Traffic Distribution</div>
      <div className="panel-body">
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<CustomContent />}
          >
            <Tooltip
              contentStyle={{
                background: "#1e2535",
                border: "1px solid #2a3140",
                borderRadius: 4,
              }}
              formatter={(val) => [`${val} packets`, "Traffic"]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default WorldMap;