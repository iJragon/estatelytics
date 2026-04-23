'use client';

import { useRef, useEffect } from 'react';

// 16-second seamlessly looping 3-D node network animation.
// All animated values use integer-frequency sin/cos so the loop is
// mathematically exact — no perceptible reset at the boundary.
export default function NetworkAnimation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Alias as non-null so TypeScript doesn't complain inside closures.
    const c: CanvasRenderingContext2D = ctx;

    let W = 0, H = 0;
    let animId = 0;

    function resize() {
      if (!canvas) return;
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Seeded RNG ──────────────────────────────────────────────────────────
    function mkRng(seed: number) {
      let s = seed;
      return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
    }
    const rng = mkRng(0x9E3779B9);

    // ── Constants ───────────────────────────────────────────────────────────
    const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const TAU   = Math.PI * 2;

    const LOOP       = 16000;
    const ORBIT_R    = 195;
    const FOCAL_DIST = ORBIT_R;
    const FOCAL_SIGMA = ORBIT_R * 0.58;

    // ── Projection ──────────────────────────────────────────────────────────
    type Cam = { x: number; y: number; z: number; yaw: number; pitch: number };
    type Projected = { x: number; y: number; z: number } | null;

    function proj(wx: number, wy: number, wz: number, cam: Cam): Projected {
      const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
      const cy = Math.cos(-cam.yaw), sy = Math.sin(-cam.yaw);
      const rx = dx * cy + dz * sy, ry = dy, rz = -dx * sy + dz * cy;
      const cp = Math.cos(-cam.pitch), sp = Math.sin(-cam.pitch);
      const fz = ry * sp + rz * cp;
      if (fz < 1) return null;
      const fy = ry * cp - rz * sp;
      const focal = Math.min(W, H) * 0.9;
      return { x: rx / fz * focal + W / 2, y: -fy / fz * focal + H / 2, z: fz };
    }

    function getCam(t: number): Cam {
      const a = t * TAU;
      const yc = 12 + 11 * Math.sin(a * 2);
      return {
        x: Math.sin(a) * ORBIT_R,
        y: yc,
        z: Math.cos(a) * ORBIT_R,
        yaw:   a + Math.PI,
        pitch: -yc / (ORBIT_R * 2.1),
      };
    }

    function dofW(pz: number) {
      const d = (pz - FOCAL_DIST) / FOCAL_SIGMA;
      return clamp(Math.exp(-d * d * 0.45), 0.12, 1.0);
    }

    // ── Nodes: Fibonacci sphere ─────────────────────────────────────────────
    const N_NODES = 56;
    const PHI     = (1 + Math.sqrt(5)) / 2;

    type Node = {
      bx: number; by: number; bz: number;
      x:  number; y:  number; z:  number;
      size: number; isHub: boolean; warm: boolean;
      oFX: number; oPhX: number; oAX: number;
      oFY: number; oPhY: number; oAY: number;
      oFZ: number; oPhZ: number; oAZ: number;
    };

    const nodes: Node[] = [];
    for (let i = 0; i < N_NODES; i++) {
      const yn = 1 - 2 * (i + 0.5) / N_NODES;
      const r  = Math.sqrt(Math.max(0, 1 - yn * yn));
      const th = TAU * i / PHI;
      const radius = 32 + rng() * 62;
      const bx = Math.cos(th) * r * radius;
      const by = yn * radius * 0.48;
      const bz = Math.sin(th) * r * radius;
      const fX = 1 + Math.round(rng()), fY = 1 + Math.round(rng()), fZ = 1 + Math.round(rng());
      nodes.push({
        bx, by, bz, x: bx, y: by, z: bz,
        size: 1.6 + rng() * 4.2,
        isHub: rng() > 0.80,
        warm:  rng() > 0.88,
        oFX: fX, oPhX: rng() * TAU, oAX: 3 + rng() * 7,
        oFY: fY, oPhY: rng() * TAU, oAY: 2 + rng() * 3.5,
        oFZ: fZ, oPhZ: rng() * TAU, oAZ: 3 + rng() * 7,
      });
    }

    // ── Edges ───────────────────────────────────────────────────────────────
    type Edge = {
      a: number; b: number; len: number;
      baseA: number; fFreq: number; fPhase: number;
      hasPulse: boolean; pSpeed: number; pPhase: number;
    };

    const MAX_EDGE_DIST = 60;
    const MAX_EDGES     = 92;
    const MAX_DEG       = 5;
    const pairs: { a: number; b: number; d: number }[] = [];

    for (let i = 0; i < N_NODES; i++)
      for (let j = i + 1; j < N_NODES; j++) {
        const d = Math.hypot(nodes[i].bx - nodes[j].bx, nodes[i].by - nodes[j].by, nodes[i].bz - nodes[j].bz);
        if (d < MAX_EDGE_DIST) pairs.push({ a: i, b: j, d });
      }
    pairs.sort((a, b) => a.d - b.d);

    const degree = new Uint8Array(N_NODES);
    const edges: Edge[] = [];
    for (const p of pairs) {
      if (edges.length >= MAX_EDGES) break;
      if (degree[p.a] >= MAX_DEG || degree[p.b] >= MAX_DEG) continue;
      const fF = 1 + Math.floor(rng() * 2);
      edges.push({
        a: p.a, b: p.b, len: p.d,
        baseA:    0.08 + (1 - p.d / MAX_EDGE_DIST) * 0.38,
        fFreq:    fF,
        fPhase:   rng() * TAU,
        hasPulse: rng() > 0.30,
        pSpeed:   1 + Math.floor(rng() * 2),
        pPhase:   rng(),
      });
      degree[p.a]++; degree[p.b]++;
    }

    // ── Stars ───────────────────────────────────────────────────────────────
    const STARS = Array.from({ length: 180 }, () => ({
      x: rng(), y: rng(), r: rng() * 0.9 + 0.15, a: 0.05 + rng() * 0.25, ph: rng() * TAU,
    }));

    // ── Update ──────────────────────────────────────────────────────────────
    function updateNodes(t: number) {
      const tr = t * TAU;
      for (const n of nodes) {
        n.x = n.bx + Math.sin(tr * n.oFX + n.oPhX) * n.oAX;
        n.y = n.by + Math.sin(tr * n.oFY + n.oPhY) * n.oAY;
        n.z = n.bz + Math.sin(tr * n.oFZ + n.oPhZ) * n.oAZ;
      }
    }

    // ── Draw ────────────────────────────────────────────────────────────────
    function drawBg(t: number) {
      c.fillStyle = '#040914';
      c.fillRect(0, 0, W, H);

      const ng = c.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, Math.min(W, H) * 0.52);
      ng.addColorStop(0, 'rgba(0,45,105,0.055)');
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = ng;
      c.fillRect(0, 0, W, H);

      for (const s of STARS) {
        const tw = 0.5 + 0.5 * Math.sin(t * TAU + s.ph);
        c.beginPath();
        c.arc(s.x * W, s.y * H, s.r, 0, TAU);
        c.fillStyle = `rgba(210,230,255,${s.a * tw})`;
        c.fill();
      }
    }

    function drawNodeAt(n: Node, p: Projected, t: number) {
      if (!p) return;
      const df = dofW(p.z);
      if (df < 0.06) return;

      const tr = t * TAU;
      const breathe = 1 + 0.07 * Math.sin(tr * n.oFX + n.oPhX);
      const sc = Math.min(W, H) / 860;
      const s  = (n.isHub ? n.size * 1.9 : n.size) * sc * breathe;
      const bA = df * (n.isHub ? 0.95 : 0.82);

      const glowR = n.warm ? 'rgba(255,200,140,' : 'rgba(100,210,255,';
      const coreC = n.warm ? '#ffe0b0' : '#c8f0ff';
      const shdC  = n.warm ? 'rgba(255,160,80,0.4)' : 'rgba(0,155,220,0.4)';

      const r1 = Math.max(0.1, s * 9);
      const g1 = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r1);
      g1.addColorStop(0, `${glowR}${0.055 * df})`);
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.globalAlpha = bA * 0.45;
      c.fillStyle = g1;
      c.beginPath(); c.arc(p.x, p.y, r1, 0, TAU); c.fill();
      c.restore();

      const r2 = Math.max(0.1, s * 2.8);
      const g2 = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
      g2.addColorStop(0, `${glowR}0.65)`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.globalAlpha = bA * 0.55;
      c.shadowColor = shdC; c.shadowBlur = s * 3.5;
      c.fillStyle = g2;
      c.beginPath(); c.arc(p.x, p.y, r2, 0, TAU); c.fill();
      c.restore();

      c.save(); c.globalAlpha = bA * 0.95;
      c.shadowColor = coreC; c.shadowBlur = s * 1.8;
      c.fillStyle = coreC;
      c.beginPath(); c.arc(p.x, p.y, Math.max(0.4, s * 0.7), 0, TAU); c.fill();
      c.restore();
    }

    function drawEdge(e: Edge, pA: Projected, pB: Projected, t: number) {
      if (!pA || !pB) return;
      const avgDof = (dofW(pA.z) + dofW(pB.z)) * 0.5;
      const fadeVar = 0.30 + 0.70 * Math.max(0, Math.sin(t * TAU * e.fFreq + e.fPhase));
      const alpha   = e.baseA * fadeVar * avgDof;
      if (alpha < 0.007) return;

      const dx = pB.x - pA.x, dy = pB.y - pA.y;
      if (dx * dx + dy * dy < 1) return;

      c.save();
      c.globalAlpha = clamp(alpha, 0, 1);
      c.shadowColor = 'rgba(0,150,210,0.22)';
      c.shadowBlur  = 2.5;

      const lg = c.createLinearGradient(pA.x, pA.y, pB.x, pB.y);
      lg.addColorStop(0,    'rgba(0,170,225,0)');
      lg.addColorStop(0.10, 'rgba(0,170,225,0.88)');
      lg.addColorStop(0.90, 'rgba(0,170,225,0.88)');
      lg.addColorStop(1,    'rgba(0,170,225,0)');

      c.strokeStyle = lg;
      c.lineWidth   = 0.65;
      c.beginPath(); c.moveTo(pA.x, pA.y); c.lineTo(pB.x, pB.y); c.stroke();
      c.restore();
    }

    function drawPulse(e: Edge, pA: Projected, pB: Projected, t: number) {
      if (!e.hasPulse || !pA || !pB) return;
      const pos   = (t * e.pSpeed + e.pPhase) % 1;
      const px    = lerp(pA.x, pB.x, pos);
      const py    = lerp(pA.y, pB.y, pos);
      const dofP  = lerp(dofW(pA.z), dofW(pB.z), pos);
      const bellA = Math.sin(pos * Math.PI) * 0.92 * dofP;
      if (bellA < 0.02) return;

      c.save();
      c.globalAlpha = bellA;
      c.shadowColor = 'rgba(160,240,255,0.85)';
      c.shadowBlur  = 9;
      c.fillStyle   = 'rgba(215,248,255,0.96)';
      c.beginPath(); c.arc(px, py, 2.0, 0, TAU); c.fill();

      for (let s = 1; s <= 6; s++) {
        const tp = Math.max(0, pos - s * 0.022);
        const tx = lerp(pA.x, pB.x, tp);
        const ty = lerp(pA.y, pB.y, tp);
        c.globalAlpha = bellA * (1 - s / 6) * 0.38;
        c.beginPath(); c.arc(tx, ty, Math.max(0.1, 1.6 - s * 0.2), 0, TAU); c.fill();
      }
      c.restore();
    }

    function drawVignette() {
      const vg = c.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, H * 0.88);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.85)');
      c.fillStyle = vg;
      c.fillRect(0, 0, W, H);

      c.save(); c.globalAlpha = 0.014;
      for (let y = 0; y < H; y += 4) { c.fillStyle = '#000'; c.fillRect(0, y, W, 1.5); }
      c.restore();
    }

    function loop(now: number) {
      animId = requestAnimationFrame(loop);
      const t   = (now % LOOP) / LOOP;
      const cam = getCam(t);
      updateNodes(t);
      drawBg(t);

      const P = nodes.map(n => proj(n.x, n.y, n.z, cam));

      const edgeOrder = edges
        .map((e, i) => ({ e, i, z: ((P[e.a]?.z ?? 9999) + (P[e.b]?.z ?? 9999)) / 2 }))
        .sort((a, b) => b.z - a.z);

      const nodeOrder = nodes
        .map((_, i) => ({ i, z: P[i]?.z ?? 9999 }))
        .sort((a, b) => b.z - a.z);

      for (const { e } of edgeOrder) drawEdge(e, P[e.a], P[e.b], t);
      for (const { e } of edgeOrder) drawPulse(e, P[e.a], P[e.b], t);
      for (const { i } of nodeOrder) drawNodeAt(nodes[i], P[i], t);

      drawVignette();
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
