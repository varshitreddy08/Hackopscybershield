import { useState, useEffect, useRef } from "react";
import supabase from "../supabaseClient";

/* ── 3D Floating Particles Canvas ── */
function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 600 + 100,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.6,
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    const project = (p) => {
      const scale = 500 / (500 + p.z);
      return {
        sx: w / 2 + (p.x - w / 2) * scale,
        sy: h / 2 + (p.y - h / 2) * scale,
        scale,
      };
    };

    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 15, 0.15)";
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        if (p.z < 50 || p.z > 800) p.vz *= -1;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const { sx, sy, scale } = project(p);
        const r = Math.max(1, 3 * scale);
        const alpha = Math.min(1, scale * 1.2);

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.7})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.08})`;
        ctx.fill();
      }

      // Draw lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const a = project(particles[i]);
        for (let j = i + 1; j < particles.length; j++) {
          const b = project(particles[j]);
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.12 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, background: "#05050f" }}
    />
  );
}

/* ── CSS Keyframes (injected once) ── */
const styleId = "hackops-login-keyframes";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const sheet = document.createElement("style");
  sheet.id = styleId;
  sheet.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    @keyframes hackops-card-in {
      0%   { opacity: 0; transform: perspective(800px) rotateX(8deg) translateY(40px) scale(0.95); }
      100% { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0) scale(1); }
    }
    @keyframes hackops-float {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-8px); }
    }
    @keyframes hackops-glow-pulse {
      0%, 100% { box-shadow: 0 0 40px rgba(239,68,68,0.06), 0 20px 60px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 60px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.5); }
    }
    @keyframes hackops-scan {
      0%   { top: -2px; }
      100% { top: 100%; }
    }
  `;
  document.head.appendChild(sheet);
}

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <ParticleBackground />

      {/* Radial gradient overlay */}
      <div style={styles.radialOverlay} />

      <div style={styles.card}>
        {/* Scanning line effect */}
        <div style={styles.scanLine} />

        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIconWrap}>
            <span style={styles.logoIcon}>◆</span>
          </div>
          <span style={styles.logoText}>HackOps</span>
        </div>

        <h2 style={styles.title}>Network Traffic Analysis</h2>
        <p style={styles.subtitle}>
          Deanonymisation of Encrypted Communications
        </p>

        <div style={styles.divider} />

        <p style={styles.desc}>
          Sign in to access your forensic dashboard, analyze PCAP files,
          and view your investigation history.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#ef4444";
            e.currentTarget.style.borderColor = "#ef4444";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(239,68,68,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "#dc2626";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" style={{ marginRight: 12 }}>
            <path
              fill="#fff"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#fff"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fff"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#fff"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Connecting..." : "Sign in with Google"}
        </button>

        <div style={styles.footer}>
          <span style={styles.footerDot} />
          Secure authentication via Supabase
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#05050f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  radialOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 60%)",
    pointerEvents: "none",
    zIndex: 1,
  },
  card: {
    background: "rgba(12, 12, 20, 0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    borderRadius: 16,
    padding: "56px 52px",
    maxWidth: 520,
    width: "92%",
    minHeight: 480,
    textAlign: "center",
    position: "relative",
    zIndex: 2,
    animation: "hackops-card-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, hackops-glow-pulse 4s ease-in-out infinite",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 2,
    background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)",
    animation: "hackops-scan 3s linear infinite",
    pointerEvents: "none",
    zIndex: 3,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 28,
    animation: "hackops-float 3s ease-in-out infinite",
  },
  logoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #dc2626, #991b1b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
  },
  logoIcon: {
    color: "#fff",
    fontSize: 24,
  },
  logoText: {
    color: "#f1f1f1",
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: -0.5,
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    color: "#e1e6ed",
    fontSize: 22,
    fontWeight: 600,
    margin: "0 0 8px",
    letterSpacing: -0.3,
    fontFamily: "'Inter', sans-serif",
  },
  subtitle: {
    color: "#6b4444",
    fontSize: 14,
    margin: 0,
    fontWeight: 400,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #dc2626, transparent)",
    margin: "28px 0",
  },
  desc: {
    color: "#8b95a5",
    fontSize: 14,
    lineHeight: 1.8,
    marginBottom: 32,
    fontWeight: 400,
  },
  error: {
    background: "rgba(42, 10, 10, 0.8)",
    color: "#fca5a5",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 18,
    border: "1px solid rgba(239,68,68,0.2)",
  },
  googleBtn: {
    width: "100%",
    padding: "16px 24px",
    background: "transparent",
    border: "2px solid #dc2626",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: 0.2,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    color: "#4a4a4a",
    fontSize: 12,
    fontWeight: 500,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
    boxShadow: "0 0 8px rgba(34,197,94,0.4)",
  },
};

export default LoginPage;
