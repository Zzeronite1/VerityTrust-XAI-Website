import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  color: string;
}

export const CyberBackgroundCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse coordinates for subtle interactive attraction
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Particle pool: keep count balanced for 60fps performance
    const particleCount = Math.min(Math.floor((width * height) / 22000), 55);
    const colors = ['#06b6d4', '#3b82f6', '#6366f1', '#10b981'];

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 0.8,
        baseAlpha: Math.random() * 0.35 + 0.15,
        alpha: Math.random() * 0.35 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // High-tech scanning line that sweeps down periodically
    let scanLineY = 0;
    const scanLineSpeed = 0.8;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Sweep ambient horizontal scanning beam
      scanLineY += scanLineSpeed;
      if (scanLineY > height + 100) {
        scanLineY = -100;
      }

      // Draw subtle ambient scan beam
      const scanGradient = ctx.createLinearGradient(0, scanLineY - 40, 0, scanLineY + 40);
      scanGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
      scanGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.035)');
      scanGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanLineY - 40, width, 80);

      // Connect close particles with delicate glowing telemetry vectors
      const maxDistance = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const edgeAlpha = (1 - dist / maxDistance) * 0.18;
            ctx.strokeStyle = `rgba(59, 130, 246, ${edgeAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Mouse proximity reaction
        if (mouse.active) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            const force = (1 - mdist / 140) * 0.3;
            p.x += (mdx / mdist) * force * 4;
            p.y += (mdy / mdist) * force * 4;
            p.alpha = Math.min(p.baseAlpha * 2.2, 0.85);

            // Draw interaction line
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - mdist / 140) * 0.25})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          } else {
            p.alpha = p.baseAlpha;
          }
        } else {
          p.alpha = p.baseAlpha;
        }

        // Draw particle dot with soft outer glow
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Aurora Ambient Radiant Mesh Blobs */}
      <div className="absolute top-[-10%] left-[15%] w-[45rem] h-[45rem] rounded-full bg-blue-600/10 blur-[140px] animate-pulse-glow" />
      <div className="absolute top-[25%] right-[5%] w-[35rem] h-[35rem] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[30%] w-[40rem] h-[40rem] rounded-full bg-indigo-600/10 blur-[150px]" />

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-35" />

      {/* Dynamic Canvas with Particles and Telemetry Vectors */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Radial vignette mask to make center content readable */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at 50% 30%, transparent 20%, rgba(2, 6, 23, 0.75) 85%)'
        }}
      />
    </div>
  );
};
