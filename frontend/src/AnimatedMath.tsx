import { useEffect, useMemo, useRef } from 'react';

/**
 * Simple animated "mathy" visualization:
 * - Particles orbiting around centers
 * - Animated equations overlay
 */
export default function AnimatedMath() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const particles = useMemo(() => {
    return new Array(40).fill(0).map((_, i) => ({
      baseR: 20 + (i % 10) * 8,
      speed: 0.005 + (i % 7) * 0.002,
      angle: (i / 40) * Math.PI * 2,
      size: 2 + (i % 3),
      hue: 260 + (i % 20),
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    //push

    function resize() {
      // Guard again inside the callback to satisfy TS in nested scopes
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop() {
      if (!canvas || !ctx) return;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // center
      const cx = width / 2;
      const cy = height / 2;

      // draw soft grid
      ctx.strokeStyle = 'rgba(80,60,160,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // particles orbit
      particles.forEach((p, idx) => {
        p.angle += p.speed;
        const r = p.baseR + 6 * Math.sin((idx + performance.now() / 400) * 0.05);
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, 0.8)`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // title text
      ctx.fillStyle = 'rgba(55, 48, 163, 0.8)';
      ctx.font = 'bold 18px ui-sans-serif, system-ui, -apple-system';
      ctx.fillText('Optimizing seat allocation', 16, 28);

      // math-like overlay
      ctx.fillStyle = 'rgba(79, 70, 229, 0.8)';
      ctx.font = '14px ui-sans-serif, system-ui, -apple-system';
      ctx.fillText('minimize Σ (capacity_i - party_i)', 16, height - 36);
      ctx.fillText('subject to party_i ≤ capacity_i and unique assignment', 16, height - 16);

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [particles]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

