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

    // Detect prefers-reduced-motion to save CPU/GPU on low-end systems
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Mouse coordinates for interactive attraction
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Balanced particle count: 20 on small/low-power screens, up to 45 max on desktops
    const maxParticles = prefersReducedMotion ? 18 : Math.min(Math.floor((width * height) / 28000), 45);
    const colors = ['#06b6d4', '#3b82f6', '#6366f1', '#10b981'];

    const particles: Particle[] = [];
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0.2 : 0.4),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0.2 : 0.4),
        radius: Math.random() * 1.6 + 0.8,
        baseAlpha: Math.random() * 0.3 + 0.15,
        alpha: Math.random() * 0.3 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Scanning line that sweeps down periodically
    let scanLineY = 0;
    const scanLineSpeed = prefersReducedMotion ? 0.4 : 0.7;
    const maxDistance = 120;
    const maxDistSq = maxDistance * maxDistance;
    const mouseRadius = 130;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    let isPaused = false;
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (isPaused) return;

      ctx.clearRect(0, 0, width, height);

      // Sweep ambient horizontal scanning beam
      scanLineY += scanLineSpeed;
      if (scanLineY > height + 100) {
        scanLineY = -100;
      }

      // Draw subtle ambient scan beam
      const scanGradient = ctx.createLinearGradient(0, scanLineY - 35, 0, scanLineY + 35);
      scanGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
      scanGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.03)');
      scanGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanLineY - 35, width, 70);

      // Connect close particles - Optimized: use distSq before Math.sqrt to save thousands of calculations
      const particleLen = particles.length;
      for (let i = 0; i < particleLen; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particleLen; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const edgeAlpha = (1 - dist / maxDistance) * 0.16;
            ctx.strokeStyle = `rgba(59, 130, 246, ${edgeAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles with zero expensive canvas shadowBlur
      for (let i = 0; i < particleLen; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Smooth screen wrapping
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Mouse proximity reaction
        if (mouse.active) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdistSq = mdx * mdx + mdy * mdy;

          if (mdistSq < mouseRadiusSq) {
            const mdist = Math.sqrt(mdistSq);
            const force = (1 - mdist / mouseRadius) * 0.25;
            p.x += (mdx / mdist) * force * 3.5;
            p.y += (mdy / mdist) * force * 3.5;
            p.alpha = Math.min(p.baseAlpha * 2, 0.8);

            // Interaction line
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - mdist / mouseRadius) * 0.2})`;
            ctx.lineWidth = 0.8;
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

        // Draw particle dot - Fast double-arc method (replaces heavy Gaussian shadowBlur)
        // 1. Soft outer halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.25;
        ctx.fill();

        // 2. Crisp core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Aurora Ambient Radiant Mesh Blobs - Optimized with hardware acceleration and balanced blur */}
      <div 
        className="absolute top-[-10%] left-[15%] w-[38rem] h-[38rem] rounded-full bg-blue-600/10 blur-[90px] animate-pulse-glow" 
        style={{ willChange: 'opacity, transform' }}
      />
      <div 
        className="absolute top-[25%] right-[5%] w-[30rem] h-[30rem] rounded-full bg-cyan-500/10 blur-[80px]" 
        style={{ willChange: 'opacity, transform' }}
      />
      <div 
        className="absolute bottom-[-10%] left-[30%] w-[32rem] h-[32rem] rounded-full bg-indigo-600/10 blur-[100px]" 
        style={{ willChange: 'opacity, transform' }}
      />

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-30" />

      {/* Dynamic Canvas with Particles and Telemetry Vectors */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Radial vignette mask to make center content readable */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at 50% 30%, transparent 20%, rgba(2, 6, 23, 0.75) 85%)'
        }}
      />
    </div>
  );
};
