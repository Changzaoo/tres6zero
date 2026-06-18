import { useEffect, useRef } from 'react';

/**
 * Camada imersiva FIXA por trás da página inteira.
 * Campo de esferas com física em tempo real (canvas 2D) que:
 *  - colide e desvia dos painéis de vidro (.six3-glass) lendo o DOM;
 *  - é repelido pelo mouse / toque;
 *  - quica nas bordas da tela;
 * + gradiente quente que some ao rolar. Adaptado para mobile (menos
 * partículas, toque) e respeita "prefers-reduced-motion".
 *
 * variant:
 *  - "full"   → vitrine (landing, públicas, auth): gradiente quente + colisão com painéis.
 *  - "subtle" → dentro do app: mais calmo, menos partículas, sem colisão, brilho discreto.
 */

type Variant = 'full' | 'subtle';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: [number, number, number];
  drift: number;
  driftSpeed: number;
};

const PALETTE: [number, number, number][] = [
  [99, 140, 255], // azul marca
  [59, 109, 255], // azul marca forte
  [139, 92, 246], // violeta
  [167, 139, 250], // violeta claro
  [255, 138, 77], // pêssego
  [255, 95, 158], // rosa
];

export function ImmersiveBackground({ variant = 'full' }: { variant?: Variant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);

  // Gradiente quente que desaparece ao sair do hero (apenas na variante "full").
  useEffect(() => {
    if (variant !== 'full') return;
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.9));
        if (gradientRef.current) gradientRef.current.style.opacity = String(0.12 + fade * 0.88);
        frame = 0;
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [variant]);

  // Motor de partículas interativo.
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d', { alpha: true });
    if (!context) return;
    const cnv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const subtle = variant === 'subtle';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;

    cnv.style.opacity = subtle ? '0.5' : '1';

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = 1;
    let particles: Particle[] = [];
    let rects: { left: number; right: number; top: number; bottom: number }[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let frameCount = 0;
    let last = performance.now();

    function spawn(): Particle {
      const r = (isMobile ? 6 : 8) + Math.random() * (isMobile ? 13 : 20);
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        r,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        drift: Math.random() * Math.PI * 2,
        driftSpeed: (Math.random() - 0.5) * 1.4,
      };
    }

    function initParticles() {
      const density = subtle ? (isMobile ? 90000 : 62000) : isMobile ? 42000 : 26000;
      const cap = subtle ? (isMobile ? 9 : 16) : isMobile ? 16 : 36;
      const count = Math.max(6, Math.min(cap, Math.round((W * H) / density)));
      particles = Array.from({ length: count }, spawn);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      cnv.width = Math.floor(W * dpr);
      cnv.height = Math.floor(H * dpr);
      cnv.style.width = `${W}px`;
      cnv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function refreshRects() {
      const els = document.querySelectorAll<HTMLElement>('.six3-glass');
      const out: typeof rects = [];
      els.forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.bottom > -60 && b.top < H + 60 && b.width > 40 && b.height > 40) {
          out.push({ left: b.left, right: b.right, top: b.top, bottom: b.bottom });
        }
      });
      rects = out;
    }

    function draw(p: Particle) {
      const [r, g, b] = p.color;
      const glow = p.r * 3.2;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
      grad.addColorStop(0.25, `rgba(${r},${g},${b},0.45)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();
      // brilho especular para sensação de esfera 3D
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.28, p.y - p.r * 0.28, p.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) draw(p);
      ctx.globalCompositeOperation = 'source-over';
    }

    const maxSpeed = subtle ? 60 : isMobile ? 90 : 130;
    const minSpeed = subtle ? 10 : isMobile ? 14 : 22;
    const mouseRadius = subtle ? 120 : isMobile ? 100 : 165;
    const mouseForce = subtle ? 800 : 1300;
    const wander = subtle ? 14 : 22;

    function step(now: number) {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!subtle && frameCount % 6 === 0) refreshRects();
      frameCount++;

      for (const p of particles) {
        // perambulação suave (mantém vivo, nunca estático)
        p.drift += p.driftSpeed * dt;
        p.vx += Math.cos(p.drift) * wander * dt;
        p.vy += Math.sin(p.drift) * wander * dt;

        // repulsão do mouse / toque
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mouseRadius * mouseRadius) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / mouseRadius) * mouseForce;
            p.vx += (dx / d) * f * dt;
            p.vy += (dy / d) * f * dt;
          }
        }

        // colisão com os painéis (desviar para fora) — só na variante "full"
        if (!subtle) {
          for (const rc of rects) {
            if (p.x > rc.left - p.r && p.x < rc.right + p.r && p.y > rc.top - p.r && p.y < rc.bottom + p.r) {
              const dl = p.x - (rc.left - p.r);
              const dr = rc.right + p.r - p.x;
              const dtop = p.y - (rc.top - p.r);
              const db = rc.bottom + p.r - p.y;
              const m = Math.min(dl, dr, dtop, db);
              const kick = 240;
              if (m === dl) {
                p.x = rc.left - p.r;
                p.vx = -Math.abs(p.vx) * 0.7 - kick * dt;
              } else if (m === dr) {
                p.x = rc.right + p.r;
                p.vx = Math.abs(p.vx) * 0.7 + kick * dt;
              } else if (m === dtop) {
                p.y = rc.top - p.r;
                p.vy = -Math.abs(p.vy) * 0.7 - kick * dt;
              } else {
                p.y = rc.bottom + p.r;
                p.vy = Math.abs(p.vy) * 0.7 + kick * dt;
              }
            }
          }
        }

        // atrito + limites de velocidade
        p.vx *= 0.996;
        p.vy *= 0.996;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > maxSpeed) {
          p.vx = (p.vx / sp) * maxSpeed;
          p.vy = (p.vy / sp) * maxSpeed;
        } else if (sp < minSpeed) {
          const boost = (minSpeed - sp) * 0.6;
          p.vx += Math.cos(p.drift) * boost;
          p.vy += Math.sin(p.drift) * boost;
        }

        // integração
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // bordas da tela
        if (p.x < p.r) {
          p.x = p.r;
          p.vx = Math.abs(p.vx) * 0.82;
        } else if (p.x > W - p.r) {
          p.x = W - p.r;
          p.vx = -Math.abs(p.vx) * 0.82;
        }
        if (p.y < p.r) {
          p.y = p.r;
          p.vy = Math.abs(p.vy) * 0.82;
        } else if (p.y > H - p.r) {
          p.y = H - p.r;
          p.vy = -Math.abs(p.vy) * 0.82;
        }
      }

      render();
      raf = requestAnimationFrame(step);
    }

    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerLeave);
    window.addEventListener('pointercancel', onPointerLeave);

    if (reduceMotion) {
      if (!subtle) refreshRects();
      render();
    } else {
      raf = requestAnimationFrame(step);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerMove);
      window.removeEventListener('pointerup', onPointerLeave);
      window.removeEventListener('pointercancel', onPointerLeave);
    };
  }, [variant]);

  return (
    <div className="immersive-bg" aria-hidden="true">
      <div ref={gradientRef} className={variant === 'subtle' ? 'immersive-gradient-subtle' : 'hero3d-gradient'} />
      <div className="immersive-vignette" />
      <div className="hero3d-grain" />
      <canvas ref={canvasRef} className="immersive-canvas" />
    </div>
  );
}
