import { useEffect, useRef } from "react";

function CyberBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    let gridLines = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
      initGrid();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const initGrid = () => {
      gridLines = [];
      const spacing = 60;
      for (let x = 0; x < canvas.width; x += spacing) {
        gridLines.push({ x1: x, y1: 0, x2: x, y2: canvas.height, type: "v" });
      }
      for (let y = 0; y < canvas.height; y += spacing) {
        gridLines.push({ x1: 0, y1: y, x2: canvas.width, y2: y, type: "h" });
      }
    };

    let time = 0;

    const draw = () => {
      time += 0.005;
      ctx.fillStyle = "rgba(11, 14, 20, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid with perspective wave
      gridLines.forEach((line) => {
        const wave = Math.sin(time + (line.type === "v" ? line.x1 : line.y1) * 0.01) * 0.3;
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.03 + wave * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      });

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.fill();
      });

      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Scanning line effect
      const scanY = (time * 80) % canvas.height;
      const gradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0)");
      gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.06)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 20, canvas.width, 40);

      // Hex data rain effect (sparse)
      if (Math.random() < 0.03) {
        const chars = "0123456789ABCDEF";
        const x = Math.random() * canvas.width;
        ctx.font = "10px monospace";
        ctx.fillStyle = `rgba(34, 197, 94, ${Math.random() * 0.3 + 0.1})`;
        let str = "";
        for (let k = 0; k < 8; k++) str += chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(str, x, Math.random() * canvas.height);
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default CyberBackground;
