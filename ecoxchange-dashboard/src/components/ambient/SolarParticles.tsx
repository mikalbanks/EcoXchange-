import { useEffect, useRef } from "react";

export interface ParticleConfig {
  /** Number of particles (20-40 for hero, 8-12 for header). */
  count: number;
  /** Particle color, e.g. palette.accentBrt. */
  color: string;
  minSize: number;
  maxSize: number;
  /** Drift speed in px/frame at 30fps. */
  speed: number;
  /** 'up' = energy rising (hero); 'drift' = ambient wander. */
  direction: "up" | "drift";
  /** 0.15-0.3 — very subtle. */
  opacity: number;
  /** 0 = no connections; 80-120 = subtle network lines between neighbors. */
  connectDistance: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
}

const FRAME_MS = 1000 / 30; // 30fps is plenty for ambience

/**
 * Ambient canvas particle field — photons / energy flow (Spec 03 §2.2).
 * Absolutely positioned to fill its (relative) parent. Renders nothing when
 * count is 0 or the user prefers reduced motion; pauses while the tab is
 * hidden. Purely decorative: aria-hidden, pointer-events none.
 */
export function SolarParticles(config: ParticleConfig) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || config.count <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let lastFrame = 0;
    let running = true;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
      vx:
        config.direction === "drift"
          ? (Math.random() - 0.5) * config.speed * 2
          : (Math.random() - 0.5) * config.speed * 0.4,
      vy:
        config.direction === "up"
          ? -(config.speed * (0.5 + Math.random()))
          : (Math.random() - 0.5) * config.speed * 2,
    });

    const init = () => {
      resize();
      particles = Array.from({ length: config.count }, spawn);
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (!running || now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = config.opacity;
      ctx.fillStyle = config.color;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Wrap around edges so the field is continuous.
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;
        if (p.y < -4) p.y = height + 4;
        if (p.y > height + 4) p.y = -4;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Web3-network connecting lines between nearby particles.
      if (config.connectDistance > 0) {
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < config.connectDistance) {
              ctx.globalAlpha =
                config.opacity * 0.6 * (1 - dist / config.connectDistance);
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = config.opacity;
      }
    };

    const onVisibility = () => {
      running = !document.hidden;
    };

    init();
    raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    config.count,
    config.color,
    config.minSize,
    config.maxSize,
    config.speed,
    config.direction,
    config.opacity,
    config.connectDistance,
  ]);

  if (config.count <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      data-testid="solar-particles"
    />
  );
}
