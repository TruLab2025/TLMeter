"use client";
import React, { useRef, useEffect, useState } from "react";

const FREQ_LABELS = [
  { label: "Bass", hz: "40 Hz" },
  { label: "Low-Mid", hz: "250 Hz" },
  { label: "Mid", hz: "1 kHz" },
  { label: "Presence", hz: "4 kHz" },
  { label: "Air", hz: "12 kHz" }
];

function getCatmullRomCurve(data, W, H, margin) {
  let step = W / (data.length - 1);
  return data.map((v, i) => [i * step, H - v * (H - margin)]);
}

function getCatmullRomSplinePoints(data, W, H, margin, segments = 16) {
  // Zwraca gęsto interpolowane punkty Catmull-Rom (do gładkiej animacji)
  let step = W / (data.length - 1);
  let pts = data.map((v, i) => [i * step, H - v * (H - margin)]);
  // Dodaj punkty kontrolne na końcach
  pts.unshift(pts[0]);
  pts.push(pts[pts.length - 1]);
  let res = [];
  for (let i = 1; i < pts.length - 2; i++) {
    let p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    for (let t = 0; t <= segments; t++) {
      let st = t / segments;
      let tt = st * st, ttt = tt * st;
      let q1 = -0.5 * ttt + tt - 0.5 * st;
      let q2 = 1.5 * ttt - 2.5 * tt + 1;
      let q3 = -1.5 * ttt + 2 * tt + 0.5 * st;
      let q4 = 0.5 * ttt - 0.5 * tt;
      let x = q1 * p0[0] + q2 * p1[0] + q3 * p2[0] + q4 * p3[0];
      let y = q1 * p0[1] + q2 * p1[1] + q3 * p2[1] + q4 * p3[1];
      res.push([x, y]);
    }
  }
  return res;
}

function drawCurve(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const xc = (p0[0] + p1[0]) / 2;
    const yc = (p0[1] + p1[1]) / 2;
    ctx.quadraticCurveTo(p0[0], p0[1], xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

function mainGradient(ctx, W) {
  let g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#2EE6FF");
  g.addColorStop(0.4, "#5F8BFF");
  g.addColorStop(0.7, "#9C56FF");
  g.addColorStop(1, "#FF2ED1");
  return g;
}

function drawGrid(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let y = 0; y <= H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x <= W; x += 220) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFillProgress(ctx, pts, W, H, progress, colorStops, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], H);
  const maxIdx = Math.floor(pts.length * progress);
  for (let i = 0; i < maxIdx; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (progress < 1 && maxIdx < pts.length - 1) {
    const t = (progress * pts.length) - maxIdx;
    const [x1, y1] = pts[maxIdx];
    const [x2, y2] = pts[maxIdx + 1];
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }
  ctx.lineTo(pts[maxIdx > 0 ? maxIdx-1 : 0][0], H);
  ctx.closePath();
  let grad = ctx.createLinearGradient(0, 0, W, 0);
  for (const stop of colorStops) grad.addColorStop(stop[0], stop[1]);
  ctx.globalAlpha = alpha;
  ctx.filter = "blur(16px)";
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.filter = "none";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawCurveProgress(ctx, pts, W, progress, opts) {
  ctx.save();
  ctx.globalAlpha = opts.alpha;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  const maxIdx = Math.floor(pts.length * progress);
  for (let i = 1; i < maxIdx; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (progress < 1 && maxIdx < pts.length - 1) {
    const t = (progress * pts.length) - maxIdx;
    const [x1, y1] = pts[maxIdx];
    const [x2, y2] = pts[maxIdx + 1];
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }
  ctx.strokeStyle = opts.gradient ? mainGradient(ctx, W) : opts.color;
  ctx.lineWidth = opts.width;
  if (opts.glow) {
    ctx.shadowBlur = opts.glowBlur;
    ctx.shadowColor = opts.glowColor;
  }
  ctx.stroke();
  ctx.restore();
}

export default function SpectralBalancePro({ spectrum = [], progressTop = 1, progressBottom = 1 }) {
  const canvasRef = useRef(null);
  const W = 1100;
  const H = 420;
  const margin = 32;
  // Nowe subtelne kształty zgodnie z promptem:
  // Bass energy: 82% vs 66%, Mid clarity: 55% vs 58%
  // Original: więcej basu, mniej mid clarity
  // Optimized: mniej basu, dip w low-mid, wzrost w mid/presence/air
  // Wyolbrzymione shape (max ~15% różnicy):
  const original = [0.78, 0.68, 0.48, 0.40, 0.30]; // cyan (Bass, Presence, Air mocno obniżone)
  const optimized = spectrum.length === 5 ? spectrum : [0.52, 0.60, 0.72, 0.80, 0.84]; // magenta (Bass, Presence, Air mocno obniżone)

  const [active, setActive] = useState("original"); // "original" lub "optimized"
  const animRef = useRef({top: null, bottom: null});
  const [playing, setPlaying] = useState(false);

  function animateLine(which) {
    let setProgress = which === "optimized" ? setProgressTop : setProgressBottom;
    let animKey = which === "optimized" ? "top" : "bottom";
    if (animRef.current[animKey]) cancelAnimationFrame(animRef.current[animKey]);
    let prog = 0;
    let last = performance.now();
    function animate(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      prog = Math.min(prog + dt * 1.5, 1);
      setProgress(prog);
      if (prog < 1) animRef.current[animKey] = requestAnimationFrame(animate);
    }
    setProgress(0);
    animRef.current[animKey] = requestAnimationFrame(animate);
  }

  function handlePlay() {
    setPlaying(true);
    if (active === "original") animateLine("bottom");
    else animateLine("optimized");
  }
  function handleStop() {
    setPlaying(false);
    setProgressTop(1);
    setProgressBottom(1);
  }
  function handleSwitch(which) {
    setActive(which);
    animateLine(which === "original" ? "bottom" : "optimized");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    // Gładkie punkty Catmull-Rom dla TL Meter
    const ptsOpt = getCatmullRomSplinePoints(optimized, W, H, margin, 18);
    const ptsOrig = getCatmullRomSplinePoints(original, W, H, margin, 18);
    // Fill pod Original (pełniejszy, bardziej nasycony, alpha 0.28)
    drawFillProgress(ctx, ptsOrig, W, H, progressBottom, [[0, "#2EE6FF"],[0.4, "#5F8BFF"],[0.7, "#9C56FF"],[1, "#FF2ED1"]], 0.28);
    // Fill pod TL Meter (bardzo przezroczysty, alpha 0.11)
    drawFillProgress(ctx, ptsOpt, W, H, progressTop, [[0, "#2EE6FF"],[0.4, "#5F8BFF"],[0.7, "#9C56FF"],[1, "#FF2ED1"]], 0.11);
    // Grid nad fill
    drawGrid(ctx, W, H);
    // Original curve (dolna linia) – bardzo subtelny glow
    drawCurveProgress(ctx, ptsOrig, W, progressBottom, {gradient: false, color: "#7FE3FF", alpha: 0.28, width: 2, glow: true, glowBlur: 1.5, glowColor: "#2EE6FF"});
    // TL Meter curve: gruba, gradient, bardzo subtelny glow
    // 1. Bloom
    drawCurveProgress(ctx, ptsOpt, W, progressTop, {gradient: true, alpha: 0.06, width: 10, glow: true, glowBlur: 4, glowColor: "#A056FF"});
    // 2. Glow
    drawCurveProgress(ctx, ptsOpt, W, progressTop, {gradient: true, alpha: 0.10, width: 3, glow: true, glowBlur: 2, glowColor: "#A056FF"});
    // 3. Main line
    drawCurveProgress(ctx, ptsOpt, W, progressTop, {gradient: true, alpha: 1, width: 3.5, glow: false});
    // 4. Highlight
    drawCurveProgress(ctx, ptsOpt, W, progressTop, {gradient: false, color: "rgba(255,255,255,0.13)", alpha: 1, width: 1, glow: false});
  }, [spectrum, progressTop, progressBottom]);

  return (
    <div style={{position:'relative', width:W, margin:'0 auto'}}>
      <canvas ref={canvasRef} width={W} height={H} style={{width:'100%', height:H, borderRadius:18, boxShadow:'0 4px 32px #000a', background:'#060B14'}} />
      {/* X axis labels */}
      <div style={{
        position:'absolute',
        left:0,
        top:H+8,
        width:'100%',
        display:'flex',
        justifyContent:'space-between',
        fontSize:16,
        color:'#b7d6f7',
        fontWeight:600,
        letterSpacing:0.2,
        pointerEvents:'none',
        userSelect:'none'
      }}>
        {FREQ_LABELS.map((f, i) => (
          <div key={f.label} style={{textAlign:'center', width:220}}>
            <div>{f.label}</div>
            <div style={{fontSize:13, color:'#7fa7d6', fontWeight:400}}>{f.hz}</div>
          </div>
        ))}
      </div>
      {/* Puste miejsce pod etykietami osi X */}
      {/* (Usunięto wiersz z kolorowymi napisami Bass ↓, Presence ↑, Air ↑) */}
    </div>
  );
}