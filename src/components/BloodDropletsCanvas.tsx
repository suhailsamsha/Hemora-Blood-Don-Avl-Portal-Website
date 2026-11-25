import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface FallingDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

interface SplashMicroDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
}

interface SurfaceRipple {
  x: number;
  y: number;
  rx: number;
  maxRx: number;
  life: number;
  maxLife: number;
  strength: number;
}

interface ImpactBloom {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface BirthHalo {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const WAVE_SEGMENTS = 160;

export function BloodDropletsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let isDark = document.documentElement.classList.contains('dark');

    function updateSize() {
      if (!canvas || !ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    updateSize();

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 1D shallow-water spring wave simulation along the blood band
    const waveHeight = new Float32Array(WAVE_SEGMENTS + 1);
    const waveVel = new Float32Array(WAVE_SEGMENTS + 1);
    const leftDeltas = new Float32Array(WAVE_SEGMENTS + 1);
    const rightDeltas = new Float32Array(WAVE_SEGMENTS + 1);

    const droplets: FallingDroplet[] = [];
    const splashes: SplashMicroDroplet[] = [];
    const ripples: SurfaceRipple[] = [];
    const blooms: ImpactBloom[] = [];
    const birthHalos: BirthHalo[] = [];

    function getBaseBandY(x: number, timeSec: number): number {
      const normX = x / Math.max(1, width);
      const primaryArc = Math.sin(normX * Math.PI * 1.35 + 0.4) * 18;
      const harmonicA = Math.sin(normX * 7.5 + timeSec * 0.85) * 4.5;
      const harmonicB = Math.cos(normX * 13.0 - timeSec * 0.6) * 2.2;
      const bandCenter = height * 0.835;
      return bandCenter + primaryArc + harmonicA + harmonicB;
    }

    function getBandThickness(x: number): number {
      const normX = x / Math.max(1, width);
      return 38 + Math.sin(normX * Math.PI) * 16;
    }

    function getSurfaceY(x: number, timeSec: number): number {
      const norm = Math.max(0, Math.min(1, x / Math.max(1, width)));
      const exactIdx = norm * WAVE_SEGMENTS;
      const i0 = Math.floor(exactIdx);
      const i1 = Math.min(WAVE_SEGMENTS, i0 + 1);
      const frac = exactIdx - i0;
      const disp = waveHeight[i0] * (1 - frac) + waveHeight[i1] * frac;
      return getBaseBandY(x, timeSec) + disp;
    }

    function injectWaveImpulse(x: number, strength: number) {
      const norm = Math.max(0, Math.min(1, x / Math.max(1, width)));
      const center = Math.round(norm * WAVE_SEGMENTS);
      for (let offset = -3; offset <= 3; offset++) {
        const idx = center + offset;
        if (idx >= 0 && idx <= WAVE_SEGMENTS) {
          const weight = Math.cos((offset / 3.5) * (Math.PI / 2));
          waveVel[idx] += strength * Math.max(0, weight);
        }
      }
    }

    function spawnDroplet(initialY?: number) {
      if (droplets.length >= 14) return;
      const margin = Math.max(24, width * 0.04);
      const x = margin + Math.random() * Math.max(40, width - margin * 2);
      const r = 1.9 + Math.random() * 1.9; // tiny 1.9px - 3.8px radius droplets
      droplets.push({
        x,
        y: initialY ?? -16 - Math.random() * (height * 0.12),
        vx: (Math.random() - 0.5) * 8,
        vy: 58 + Math.random() * 55,
        r,
        alpha: 0.85 + Math.random() * 0.15,
      });
    }

    function spawnFromClick(clickX: number, clickY: number) {
      const timeSec = performance.now() * 0.001;
      const surfY = getSurfaceY(clickX, timeSec);

      birthHalos.push({
        x: clickX,
        y: clickY,
        life: 0,
        maxLife: 0.34,
      });

      if (clickY >= surfY - 8) {
        triggerImpact(clickX, surfY, 3.3, 310);
        if (droplets.length < 36) {
          droplets.push({
            x: clickX,
            y: Math.max(8, surfY - 22),
            vx: 0,
            vy: 60,
            r: 2.6,
            alpha: 0.96,
          });
        }
        return;
      }

      if (droplets.length >= 36) {
        droplets.shift();
      }

      // Primary droplet detaching right at exact cursor click point
      droplets.push({
        x: clickX,
        y: clickY,
        vx: 0,
        vy: 30,
        r: 2.8 + Math.random() * 1.0,
        alpha: 0.98,
      });

      // 1-2 micro companion droplets trailing slightly beside the click
      const extraCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < extraCount; i++) {
        if (droplets.length >= 36) break;
        droplets.push({
          x: clickX + (Math.random() - 0.5) * 14,
          y: clickY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 18,
          vy: 12 + Math.random() * 26,
          r: 1.55 + Math.random() * 0.95,
          alpha: 0.88,
        });
      }
    }

    function triggerImpact(x: number, y: number, r: number, speed: number) {
      const energy = Math.min(1.5, (speed / 340) * (r / 2.8));
      injectWaveImpulse(x, 2.8 + energy * 3.4);

      ripples.push({
        x,
        y,
        rx: 2.5,
        maxRx: 24 + energy * 24,
        life: 0,
        maxLife: 0.75 + energy * 0.25,
        strength: 0.65 + energy * 0.35,
      });
      ripples.push({
        x,
        y,
        rx: 1.5,
        maxRx: 14 + energy * 14,
        life: 0,
        maxLife: 0.55 + energy * 0.2,
        strength: 0.45 + energy * 0.25,
      });

      blooms.push({
        x,
        y,
        radius: 16 + energy * 18,
        life: 0,
        maxLife: 0.42,
      });

      const microCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < microCount; i++) {
        const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.65;
        const launchSpeed = (48 + Math.random() * 88) * (0.7 + energy * 0.4);
        splashes.push({
          x: x + (Math.random() - 0.5) * 3,
          y: y - 1,
          vx: Math.cos(angle) * launchSpeed,
          vy: Math.sin(angle) * launchSpeed,
          r: 0.65 + Math.random() * 1.05,
          life: 0,
          maxLife: 0.42 + Math.random() * 0.28,
        });
      }
    }

    function drawTeardrop(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      vy: number,
      alpha: number
    ) {
      const stretch = 1 + Math.min(1.6, vy / 260);
      const tailLen = r * (2.3 * stretch);
      const themeAlpha = isDark ? alpha : alpha * 0.72;

      c.save();
      c.globalAlpha = themeAlpha;

      // Subtle motion wake above tip
      const wakeGrad = c.createLinearGradient(x, y - tailLen * 2.1, x, y);
      wakeGrad.addColorStop(0, 'rgba(179, 38, 30, 0)');
      wakeGrad.addColorStop(1, 'rgba(179, 38, 30, 0.24)');
      c.strokeStyle = wakeGrad;
      c.lineWidth = Math.max(0.8, r * 0.38);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y - tailLen * 2.0);
      c.lineTo(x, y - tailLen * 0.7);
      c.stroke();

      // Teardrop silhouette
      c.beginPath();
      c.moveTo(x, y - tailLen);
      c.bezierCurveTo(
        x + r * 0.45,
        y - tailLen * 0.35,
        x + r * 1.15,
        y - r * 0.25,
        x + r,
        y + r * 0.25
      );
      c.arc(x, y + r * 0.25, r, 0, Math.PI, false);
      c.bezierCurveTo(
        x - r * 1.15,
        y - r * 0.25,
        x - r * 0.45,
        y - tailLen * 0.35,
        x,
        y - tailLen
      );
      c.closePath();

      // 3D subsurface arterial-to-venous crimson shading
      const bodyGrad = c.createRadialGradient(
        x - r * 0.32,
        y + r * 0.05,
        r * 0.12,
        x,
        y + r * 0.15,
        r * 1.45
      );
      bodyGrad.addColorStop(0, '#FF685E');
      bodyGrad.addColorStop(0.32, '#C82820');
      bodyGrad.addColorStop(0.75, '#7A110E');
      bodyGrad.addColorStop(1, '#340404');

      c.shadowColor = 'rgba(179, 38, 30, 0.45)';
      c.shadowBlur = r * 2.2;
      c.fillStyle = bodyGrad;
      c.fill();
      c.shadowBlur = 0;

      // Upper-left crisp 4K specular catchlight
      c.beginPath();
      c.ellipse(x - r * 0.34, y + r * 0.02, r * 0.22, r * 0.36, -0.35, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255, 240, 240, 0.88)';
      c.fill();

      // Internal lower caustic bounce glow
      c.beginPath();
      c.arc(x + r * 0.18, y + r * 0.62, r * 0.28, 0.15, Math.PI * 0.9);
      c.strokeStyle = 'rgba(255, 130, 120, 0.55)';
      c.lineWidth = Math.max(0.6, r * 0.2);
      c.stroke();

      c.restore();
    }

    function drawBloodBand(c: CanvasRenderingContext2D, timeSec: number) {
      const step = width / WAVE_SEGMENTS;
      const topPts: Array<{ x: number; y: number }> = [];
      const botPts: Array<{ x: number; y: number }> = [];

      for (let i = 0; i <= WAVE_SEGMENTS; i++) {
        const x = i * step;
        const topY = getSurfaceY(x, timeSec);
        const thickness = getBandThickness(x);
        // Bottom edge follows gentle macro wave + slight 20% attenuated ripple
        const botY = getBaseBandY(x, timeSec) + thickness + waveHeight[i] * 0.22;
        topPts.push({ x, y: topY });
        botPts.push({ x, y: botY });
      }

      const avgTop = height * 0.79;
      const avgBot = height * 0.92;
      const opacityFactor = isDark ? 1 : 0.42;

      c.save();

      // Soft ambient crimson underglow behind the blood band
      const haloGrad = c.createLinearGradient(0, avgTop - 40, 0, avgBot + 55);
      haloGrad.addColorStop(0, 'rgba(179, 38, 30, 0)');
      haloGrad.addColorStop(0.45, `rgba(179, 38, 30, ${0.14 * opacityFactor})`);
      haloGrad.addColorStop(1, 'rgba(120, 20, 18, 0)');
      c.fillStyle = haloGrad;
      c.fillRect(0, avgTop - 40, width, avgBot - avgTop + 95);

      // Build sculpted closed band path
      c.beginPath();
      c.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) {
        const prev = topPts[i - 1];
        const curr = topPts[i];
        const midX = (prev.x + curr.x) * 0.5;
        const midY = (prev.y + curr.y) * 0.5;
        c.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      c.lineTo(topPts[topPts.length - 1].x, topPts[topPts.length - 1].y);

      for (let i = botPts.length - 1; i >= 0; i--) {
        const curr = botPts[i];
        if (i === botPts.length - 1) {
          c.lineTo(curr.x, curr.y);
        } else {
          const next = botPts[i + 1];
          const midX = (curr.x + next.x) * 0.5;
          const midY = (curr.y + next.y) * 0.5;
          c.quadraticCurveTo(next.x, next.y, midX, midY);
        }
      }
      c.closePath();

      // Deep realistic liquid blood band gradient
      const bandGrad = c.createLinearGradient(0, avgTop, 0, avgBot);
      bandGrad.addColorStop(0, `rgba(198, 40, 34, ${0.46 * opacityFactor})`);
      bandGrad.addColorStop(0.28, `rgba(138, 22, 18, ${0.62 * opacityFactor})`);
      bandGrad.addColorStop(0.72, `rgba(82, 11, 10, ${0.58 * opacityFactor})`);
      bandGrad.addColorStop(1, `rgba(48, 6, 6, ${0.22 * opacityFactor})`);

      c.fillStyle = bandGrad;
      c.fill();

      // Top meniscus specular highlight catching overhead studio light
      c.beginPath();
      c.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) {
        const prev = topPts[i - 1];
        const curr = topPts[i];
        c.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) * 0.5, (prev.y + curr.y) * 0.5);
      }
      c.lineTo(topPts[topPts.length - 1].x, topPts[topPts.length - 1].y);

      const rimGrad = c.createLinearGradient(0, 0, width, 0);
      rimGrad.addColorStop(0, `rgba(242, 139, 130, ${0.15 * opacityFactor})`);
      rimGrad.addColorStop(0.35, `rgba(255, 198, 194, ${0.52 * opacityFactor})`);
      rimGrad.addColorStop(0.65, `rgba(255, 225, 222, ${0.58 * opacityFactor})`);
      rimGrad.addColorStop(1, `rgba(242, 139, 130, ${0.18 * opacityFactor})`);

      c.strokeStyle = rimGrad;
      c.lineWidth = 1.6;
      c.stroke();

      // Subtle inner volumetric highlight ribbon just below the meniscus
      c.beginPath();
      c.moveTo(topPts[0].x, topPts[0].y + 8);
      for (let i = 1; i < topPts.length; i++) {
        const prev = topPts[i - 1];
        const curr = topPts[i];
        c.quadraticCurveTo(
          prev.x,
          prev.y + 8,
          (prev.x + curr.x) * 0.5,
          (prev.y + curr.y) * 0.5 + 8
        );
      }
      c.strokeStyle = `rgba(255, 125, 118, ${0.14 * opacityFactor})`;
      c.lineWidth = 4;
      c.stroke();

      c.restore();
    }

    function drawEffects(c: CanvasRenderingContext2D) {
      const opacityFactor = isDark ? 1 : 0.65;

      // Subsurface impact blooms
      for (const b of blooms) {
        const p = b.life / b.maxLife;
        const alpha = (1 - p) * 0.48 * opacityFactor;
        const rad = b.radius * (0.4 + p * 0.8);
        const grad = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, rad);
        grad.addColorStop(0, `rgba(255, 118, 108, ${alpha})`);
        grad.addColorStop(0.5, `rgba(179, 38, 30, ${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(179, 38, 30, 0)');
        c.fillStyle = grad;
        c.beginPath();
        c.arc(b.x, b.y, rad, 0, Math.PI * 2);
        c.fill();
      }

      // Perspective elliptical meniscus ripples
      for (const rp of ripples) {
        const p = rp.life / rp.maxLife;
        const easeOut = 1 - Math.pow(1 - p, 2.2);
        const rx = rp.rx + (rp.maxRx - rp.rx) * easeOut;
        const ry = rx * 0.26;
        const alpha = (1 - p) * rp.strength * 0.72 * opacityFactor;

        c.save();
        c.beginPath();
        c.ellipse(rp.x, rp.y + 1.5, rx, ry, 0, 0, Math.PI * 2);
        c.strokeStyle = `rgba(255, 204, 200, ${alpha})`;
        c.lineWidth = Math.max(0.6, 1.4 * (1 - p * 0.6));
        c.stroke();
        c.restore();
      }

      // Cursor click detachment rings
      for (const h of birthHalos) {
        const p = h.life / h.maxLife;
        const rad = 2 + p * 14;
        const alpha = (1 - p) * 0.55 * opacityFactor;
        c.save();
        c.beginPath();
        c.arc(h.x, h.y, rad, 0, Math.PI * 2);
        c.strokeStyle = `rgba(242, 139, 130, ${alpha})`;
        c.lineWidth = Math.max(0.6, 1.3 * (1 - p));
        c.stroke();
        c.restore();
      }

      // Micro-splash satellite droplets
      for (const s of splashes) {
        const p = s.life / s.maxLife;
        const alpha = (1 - p) * 0.92 * opacityFactor;
        c.save();
        c.globalAlpha = alpha;
        const g = c.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, 0, s.x, s.y, s.r);
        g.addColorStop(0, '#FFD4D0');
        g.addColorStop(0.45, '#D9342B');
        g.addColorStop(1, '#580B09');
        c.fillStyle = g;
        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    // Seed initial droplets across staggered heights so the effect is live immediately
    for (let i = 0; i < 6; i++) {
      spawnDroplet(Math.random() * height * 0.68);
    }

    if (reducedMotion) {
      ctx.clearRect(0, 0, width, height);
      drawBloodBand(ctx, 0);
      for (let i = 0; i < 4; i++) {
        const d = droplets[i];
        if (d) drawTeardrop(ctx, d.x, d.y, d.r, d.vy, d.alpha * 0.75);
      }
      window.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
        themeObserver.disconnect();
      };
    }

    let rafId = 0;
    let lastTime = performance.now();
    let spawnAccumulator = 0;
    let nextSpawnInterval = 0.42;

    function stepSimulation(dt: number, timeSec: number) {
      // 1D wave propagation along blood band meniscus
      const tension = 0.032;
      const dampening = 0.034;
      const spread = 0.24;

      for (let i = 0; i <= WAVE_SEGMENTS; i++) {
        const force = -tension * waveHeight[i] - dampening * waveVel[i];
        waveVel[i] += force * (dt * 60);
        waveHeight[i] += waveVel[i] * (dt * 60);
      }

      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i <= WAVE_SEGMENTS; i++) {
          if (i > 0) {
            leftDeltas[i] = spread * (waveHeight[i] - waveHeight[i - 1]);
            waveVel[i - 1] += leftDeltas[i];
          }
          if (i < WAVE_SEGMENTS) {
            rightDeltas[i] = spread * (waveHeight[i] - waveHeight[i + 1]);
            waveVel[i + 1] += rightDeltas[i];
          }
        }
        for (let i = 0; i <= WAVE_SEGMENTS; i++) {
          if (i > 0) waveHeight[i - 1] += leftDeltas[i];
          if (i < WAVE_SEGMENTS) waveHeight[i + 1] += rightDeltas[i];
        }
      }

      // Spawn new tiny droplets steadily
      spawnAccumulator += dt;
      if (spawnAccumulator >= nextSpawnInterval) {
        spawnAccumulator = 0;
        nextSpawnInterval = 0.32 + Math.random() * 0.46;
        spawnDroplet();
      }

      // Advance falling droplets under gravity
      const gravity = 470;
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.vy = Math.min(430, d.vy + gravity * dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;

        const surfY = getSurfaceY(d.x, timeSec);
        if (d.y + d.r >= surfY) {
          triggerImpact(d.x, surfY, d.r, d.vy);
          droplets.splice(i, 1);
        } else if (d.x < -40 || d.x > width + 40 || d.y > height + 40) {
          droplets.splice(i, 1);
        }
      }

      // Advance micro-splash droplets
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.life += dt;
        s.vy += 420 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life >= s.maxLife) {
          splashes.splice(i, 1);
        }
      }

      // Advance ripples, blooms & click birth halos
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].life += dt;
        if (ripples[i].life >= ripples[i].maxLife) {
          ripples.splice(i, 1);
        }
      }
      for (let i = blooms.length - 1; i >= 0; i--) {
        blooms[i].life += dt;
        if (blooms[i].life >= blooms[i].maxLife) {
          blooms.splice(i, 1);
        }
      }
      for (let i = birthHalos.length - 1; i >= 0; i--) {
        birthHalos[i].life += dt;
        if (birthHalos[i].life >= birthHalos[i].maxLife) {
          birthHalos.splice(i, 1);
        }
      }
    }

    function render(now: number) {
      if (document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min(0.035, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const timeSec = now * 0.001;

      stepSimulation(dt, timeSec);

      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        drawBloodBand(ctx, timeSec);
        drawEffects(ctx);
        for (const d of droplets) {
          drawTeardrop(ctx, d.x, d.y, d.r, d.vy, d.alpha);
        }
      }

      rafId = requestAnimationFrame(render);
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as Element | null;
      if (
        target &&
        target.closest(
          'button, a, input, select, textarea, label, [role="button"], [role="tab"], [role="option"], [role="listbox"], [data-glass-popover="true"]'
        )
      ) {
        return;
      }
      spawnFromClick(e.clientX, e.clientY);
    }

    rafId = requestAnimationFrame(render);
    window.addEventListener('resize', updateSize);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('pointerdown', handlePointerDown);
      themeObserver.disconnect();
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-full h-full"
    />
  );
}
