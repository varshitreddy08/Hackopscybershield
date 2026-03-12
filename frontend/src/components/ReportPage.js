import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function ReportPage() {
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);

    try {
      const [trafficRes, partyBRes, suspiciousRes] = await Promise.allSettled([
        api.get("/traffic"),
        api.get("/analysis/partyB"),
        api.get("/analysis/suspicious"),
      ]);

      const traffic = trafficRes.status === "fulfilled" ? trafficRes.value.data : [];
      const partyB = partyBRes.status === "fulfilled" ? partyBRes.value.data : [];
      const suspicious = suspiciousRes.status === "fulfilled" ? suspiciousRes.value.data : [];

      // Compute stats
      const endpoints = new Set();
      const protocols = {};
      const ipPairCount = {};

      traffic.forEach((t) => {
        endpoints.add(t.source_ip);
        endpoints.add(t.destination_ip);
        protocols[t.protocol] = (protocols[t.protocol] || 0) + 1;
        const pair = `${t.source_ip} → ${t.destination_ip}`;
        ipPairCount[pair] = (ipPairCount[pair] || 0) + 1;
      });

      const topPairs = Object.entries(ipPairCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      // Build PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFillColor(23, 29, 43);
      doc.rect(0, 0, pageWidth, 45, "F");
      doc.setTextColor(225, 230, 237);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Network Forensics Report", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(139, 149, 165);
      doc.text("Deanonymisation of Encrypted Communications", pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
      y += 18;

      // Summary Section
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1. Executive Summary", 14, y);
      y += 8;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const summaryLines = [
        `Total Packets Captured: ${traffic.length}`,
        `Unique Communication Endpoints: ${endpoints.size}`,
        `Protocols Detected: ${Object.keys(protocols).length} (${Object.keys(protocols).join(", ")})`,
        `Suspicious Endpoints Flagged: ${suspicious.length}`,
        `Top Communication Partners Identified: ${partyB.length}`,
      ];

      summaryLines.forEach((line) => {
        doc.text(line, 14, y);
        y += 6;
      });
      y += 6;

      // Protocol Breakdown
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("2. Protocol Distribution", 14, y);
      y += 4;

      const protocolEntries = Object.entries(protocols).sort((a, b) => b[1] - a[1]);
      if (protocolEntries.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Protocol", "Packet Count", "Percentage"]],
          body: protocolEntries.map(([proto, count]) => [
              proto,
              count.toString(),
              traffic.length > 0 ? `${((count / traffic.length) * 100).toFixed(1)}%` : "0%",
            ]),
          theme: "grid",
          headStyles: { fillColor: [30, 37, 53], textColor: [225, 230, 237], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No protocol data available. Upload a PCAP file to analyze.", 14, y + 6);
        y += 14;
      }

      // Party B Analysis
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("3. Top Communication Partners (Party B)", 14, y);
      y += 4;

      if (partyB.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Rank", "Destination IP", "Communication Count", "Risk Assessment"]],
          body: partyB.map((p, i) => [
            (i + 1).toString(),
            p.destination_ip,
            p.communication_count.toString(),
            p.communication_count > 100 ? "HIGH" : p.communication_count > 50 ? "MEDIUM" : "LOW",
          ]),
          theme: "grid",
          headStyles: { fillColor: [30, 37, 53], textColor: [225, 230, 237], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No communication partners identified. Upload a PCAP file first.", 14, y + 6);
        y += 14;
      }

      // Suspicious IPs
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(239, 68, 68);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("4. Suspicious Endpoint Detection", 14, y);
      y += 4;

      if (suspicious.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Destination IP", "Communication Count", "Severity"]],
          body: suspicious.map((s) => [
            s.destination_ip,
            s.communication_count.toString(),
            s.communication_count > 100 ? "HIGH" : "MEDIUM",
          ]),
          theme: "grid",
          headStyles: { fillColor: [127, 29, 29], textColor: [252, 165, 165], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No suspicious endpoints detected above threshold.", 14, y + 6);
        y += 14;
      }

      // Top Communication Pairs
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(59, 130, 246);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("5. Top Communication Pairs", 14, y);
      y += 4;

      if (topPairs.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["#", "Communication Path", "Sessions"]],
          body: topPairs.map(([pair, count], i) => [
            (i + 1).toString(),
            pair,
            count.toString(),
          ]),
          theme: "grid",
          headStyles: { fillColor: [30, 37, 53], textColor: [225, 230, 237], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      } else {
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No communication pairs recorded yet.", 14, y + 6);
        y += 14;
      }

      // Findings & Recommendations
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(34, 197, 94);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("6. Key Findings & Recommendations", 14, y);
      y += 8;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const findings = [];

      if (partyB.length > 0) {
        findings.push(
          `• Primary communication partner identified: ${partyB[0].destination_ip} with ${partyB[0].communication_count} sessions.`
        );
      }

      if (suspicious.length > 0) {
        findings.push(
          `• ${suspicious.length} endpoint(s) flagged as suspicious due to high communication frequency.`
        );
        findings.push(
          `• Recommend further investigation of: ${suspicious.map((s) => s.destination_ip).join(", ")}`
        );
      }

      findings.push(
        `• ${Object.keys(protocols).length} protocol(s) observed — analyze non-standard protocols for covert channels.`
      );
      findings.push(
        `• Communication metadata analysis completed without decryption — compliant with lawful forensic guidelines.`
      );
      findings.push(
        `• Recommend correlating timing patterns with known activity windows of suspects.`
      );

      findings.forEach((f) => {
        const lines = doc.splitTextToSize(f, pageWidth - 28);
        lines.forEach((line) => {
          doc.text(line, 14, y);
          y += 5;
        });
        y += 2;
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(139, 149, 165);
        doc.text(
          `HackOps Report — Page ${i} of ${totalPages} — CONFIDENTIAL`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save("HackOps_Report.pdf");
    } catch (err) {
      console.error("Report generation failed:", err);
      alert("Failed to generate report. An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <span>◆</span>
          <h1>HackOps</h1>
        </div>
        <div className="navbar-links">
          <Link to="/">Dashboard</Link>
          <Link to="/analysis">Analysis</Link>
          <Link to="/endpoints">Endpoints</Link>
          <Link to="/report" style={{ color: "#e1e6ed" }}>Report</Link>
        </div>
      </nav>

      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div className="panel">
          <div className="panel-header">Forensic Investigation Report</div>
          <div className="panel-body" style={{ padding: "30px" }}>
            <h3 style={{ color: "#e1e6ed", marginBottom: 16 }}>
              Generate PDF Report
            </h3>
            <p style={{ color: "#8b95a5", lineHeight: 1.7, marginBottom: 24 }}>
              This report includes a comprehensive analysis of all captured network traffic
              metadata, communication partners (Party B), suspicious endpoint detection,
              protocol distribution, top communication pairs, and actionable forensic recommendations.
              <br /><br />
              No encrypted content is decrypted — only metadata is analyzed in compliance
              with lawful forensic investigation standards.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
              <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
                <div className="stat-label">Sections</div>
                <div className="stat-value blue">6</div>
              </div>
              <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
                <div className="stat-label">Format</div>
                <div className="stat-value green" style={{ fontSize: 28 }}>PDF</div>
              </div>
              <div className="stat-card" style={{ flex: 1, minWidth: 150 }}>
                <div className="stat-label">Classification</div>
                <div className="stat-value orange" style={{ fontSize: 20 }}>CONFIDENTIAL</div>
              </div>
            </div>

            <h4 style={{ color: "#e1e6ed", marginBottom: 12 }}>Report Contents:</h4>
            <ul style={{ color: "#8b95a5", lineHeight: 2, paddingLeft: 20 }}>
              <li>Executive Summary with key metrics</li>
              <li>Protocol Distribution Analysis</li>
              <li>Top Communication Partners (Party B Identification)</li>
              <li>Suspicious Endpoint Detection with severity</li>
              <li>Top Communication Pairs forensic table</li>
              <li>Key Findings & Recommendations</li>
            </ul>

            <button
              className="upload-btn"
              onClick={generateReport}
              disabled={generating}
              style={{
                marginTop: 24,
                padding: "12px 32px",
                fontSize: 15,
                ...(generating ? { opacity: 0.6, cursor: "not-allowed" } : {}),
              }}
            >
              {generating ? "Generating Report..." : "Download PDF Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportPage;
