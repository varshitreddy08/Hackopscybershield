import { execFile } from "child_process";

export const analyzePcap = (filePath) => {

  return new Promise((resolve, reject) => {

    // tshark command to extract metadata
    execFile("tshark", ["-r", filePath, "-T", "fields", "-e", "ip.src", "-e", "ip.dst", "-e", "_ws.col.Protocol"], (err, stdout, stderr) => {

      if (err) {
        console.error("Tshark error:", err);
        reject(err);
        return;
      }

      if (!stdout) {
        console.log("No packets found in PCAP");
        resolve([]);
        return;
      }

      const lines = stdout.split("\n");

      const packets = lines
        .filter(line => line.trim() !== "")
        .map(line => {

          const parts = line.replace(/\r/g, "").split("\t");

          return {
            source_ip: (parts[0] || "unknown").trim(),
            destination_ip: (parts[1] || "unknown").trim(),
            protocol: (parts[2] || "unknown").trim(),
            packet_count: 1
          };

        });

      resolve(packets);

    });

  });

};