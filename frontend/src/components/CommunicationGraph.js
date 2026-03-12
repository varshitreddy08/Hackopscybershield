import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api";
import ForceGraph2D from "react-force-graph-2d";

function CommunicationGraph() {
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 350,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const fetchData = () => {
    api
      .get("/traffic")
      .then((res) => {
        const data = res.data;
        const nodeMap = new Map();
        const links = [];
        const linkCount = {};

        data.forEach((packet) => {
          if (!nodeMap.has(packet.source_ip)) {
            nodeMap.set(packet.source_ip, { id: packet.source_ip, count: 0 });
          }
          if (!nodeMap.has(packet.destination_ip)) {
            nodeMap.set(packet.destination_ip, { id: packet.destination_ip, count: 0 });
          }
          nodeMap.get(packet.source_ip).count += 1;
          nodeMap.get(packet.destination_ip).count += 1;

          const key = `${packet.source_ip}->${packet.destination_ip}`;
          linkCount[key] = (linkCount[key] || 0) + 1;
        });

        Object.entries(linkCount).forEach(([key, count]) => {
          const [src, tgt] = key.split("->");
          links.push({ source: src, target: tgt, value: count });
        });

        setGraph({
          nodes: [...nodeMap.values()],
          links,
        });
      })
      .catch((err) => console.error(err));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const paintNode = useCallback((node, ctx) => {
    const size = Math.max(3, Math.min(node.count * 0.5, 12));
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.count > 20 ? "#ef4444" : node.count > 10 ? "#f97316" : "#3b82f6";
    ctx.fill();

    ctx.font = "3px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#8b95a5";
    ctx.fillText(node.id, node.x, node.y + size + 4);
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">Network Communication Graph</div>
      <div ref={containerRef} style={{ background: "#141a26" }}>
        {graph.nodes.length > 0 && (
          <ForceGraph2D
            graphData={graph}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#141a26"
            nodeCanvasObject={paintNode}
            linkColor={() => "rgba(59,130,246,0.2)"}
            linkWidth={(link) => Math.max(0.5, Math.min(link.value * 0.3, 3))}
            nodeLabel={(n) => `${n.id} (${n.count} packets)`}
          />
        )}
        {graph.nodes.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>
            No communication data available
          </div>
        )}
      </div>
    </div>
  );
}

export default CommunicationGraph;