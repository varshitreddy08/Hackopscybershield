import { useState, useRef } from "react";
import api from "../api";
import supabase from "../supabaseClient";

function UploadPCAP() {
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;

    const formData = new FormData();
    formData.append("pcap", file);
    if (uid) formData.append("user_id", uid);

    setUploading(true);
    setStatus("");

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus(`✓ ${res.data.packets_inserted} packets analyzed from ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus("✗ Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-area">
      <button
        className="upload-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Analyzing..." : "Upload PCAP File"}
      </button>
      <input
        ref={fileRef}
        type="file"
        onChange={uploadFile}
        accept=".pcap,.pcapng,.cap"
        style={{ display: "none" }}
      />
      {status && (
        <span className="upload-status" style={{ color: status.startsWith("✗") ? "#ef4444" : "#22c55e" }}>
          {status}
        </span>
      )}
    </div>
  );
}

export default UploadPCAP;