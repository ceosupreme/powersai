import { useEffect, useRef } from "react";

/** Procedural light-speed trails on a canvas. Stops when paused, hidden or offscreen. */
export function LightField({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, visible = true, last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const trails = Array.from({ length: 46 }, () => ({
      a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.0025 + Math.random() * 0.006,
      len: 0.04 + Math.random() * 0.12, copper: Math.random() < 0.12,
    }));
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.68, cy = h * 0.48, max = Math.hypot(w, h) * 0.75;
      // depth planes
      for (let i = 1; i <= 4; i++) {
        ctx.strokeStyle = `hsla(210, 80%, 80%, ${0.035 * i})`;
        ctx.lineWidth = 1;
        const s = (i / 4) * max * 0.5;
        ctx.strokeRect(cx - s * 1.6, cy - s, s * 3.2, s * 2);
      }
      for (const t of trails) {
        if (dt) { t.r += t.v * (0.4 + t.r) * (dt / 16.67); if (t.r > 1) { t.r = 0.02; t.a = Math.random() * Math.PI * 2; } }
        const r1 = t.r * max, r0 = Math.max(0, (t.r - t.len) * max);
        const x0 = cx + Math.cos(t.a) * r0, y0 = cy + Math.sin(t.a) * r0 * 0.62;
        const x1 = cx + Math.cos(t.a) * r1, y1 = cy + Math.sin(t.a) * r1 * 0.62;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        const c = t.copper ? "28, 75%, 62%" : "205, 95%, 88%";
        g.addColorStop(0, `hsla(${c}, 0)`);
        g.addColorStop(1, `hsla(${c}, ${0.15 + t.r * 0.55})`);
        ctx.strokeStyle = g; ctx.lineWidth = 0.6 + t.r * 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    };
    const loop = (now: number) => { const dt = last ? Math.min(now - last, 100) : 0; last = now; draw(dt); raf = requestAnimationFrame(loop); };
    const sync = () => {
      cancelAnimationFrame(raf); last = 0;
      if (!paused && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    resize(); draw(0);
    const ro = new ResizeObserver(() => { resize(); draw(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    sync();
    (canvas as HTMLCanvasElement & { __rhRunning?: () => boolean }).__rhRunning = () => !paused && visible && !document.hidden;
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [paused]);

  return <canvas ref={ref} className="rh-canvas" aria-hidden />;
}
