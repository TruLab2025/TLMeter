"use client";

import React, { useEffect, useRef } from "react";

const FREQ_LABELS = [
  { label: "Bass", hz: "40 Hz" },
  { label: "Low-Mid", hz: "250 Hz" },
  { label: "Mid", hz: "1 kHz" },
  { label: "Presence", hz: "4 kHz" },
  { label: "Air", hz: "12 kHz" },
];

const ORIGINAL_SPECTRUM = [0.78, 0.68, 0.48, 0.4, 0.3];

type Point = [number, number];

type SpectralBalanceProProps = {
  spectrum?: number[];
  progressTop?: number;
  progressBottom?: number;
};

type CurveOptions = {
  alpha: number;
  width: number;
  gradient?: boolean;
  color?: string;
  glow?: boolean;
  glowBlur?: number;
  glowColor?: string;
};

function getCatmullRomSplinePoints(
  data: number[],
  width: number,
  height: number,
  margin: number,
  segments = 16
): Point[] {
  const step = width / (data.length - 1);
  const pts: Point[] = data.map((value, index) => [
    index * step,
    height - value * (height - margin),
  ]);

  pts.unshift(pts[0]);
  pts.push(pts[pts.length - 1]);

  const result: Point[] = [];

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    for (let t = 0; t <= segments; t++) {
      const st = t / segments;
      const tt = st * st;
      const ttt = tt * st;
      const q1 = -0.5 * ttt + tt - 0.5 * st;
      const q2 = 1.5 * ttt - 2.5 * tt + 1;
      const q3 = -1.5 * ttt + 2 * tt + 0.5 * st;
      const q4 = 0.5 * ttt - 0.5 * tt;
      const x = q1 * p0[0] + q2 * p1[0] + q3 * p2[0] + q4 * p3[0];
      const y = q1 * p0[1] + q2 * p1[1] + q3 * p2[1] + q4 * p3[1];
      result.push([x, y]);
    }
  }

  return result;
}

function mainGradient(ctx: CanvasRenderingContext2D, width: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#2EE6FF");
  gradient.addColorStop(0.4, "#5F8BFF");
  gradient.addColorStop(0.7, "#9C56FF");
  gradient.addColorStop(1, "#FF2ED1");
  return gradient;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let y = 0; y <= height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let x = 0; x <= width; x += 220) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFillProgress(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  height: number,
  progress: number,
  colorStops: Array<[number, string]>,
  alpha: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], height);

  const maxIndex = Math.floor(points.length * progress);

  for (let i = 0; i < maxIndex; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }

  if (progress < 1 && maxIndex < points.length - 1) {
    const t = progress * points.length - maxIndex;
    const currentPoint = points[Math.min(maxIndex, points.length - 1)];
    const nextPoint = points[Math.min(maxIndex + 1, points.length - 1)];
    const [x1, y1] = currentPoint;
    const [x2, y2] = nextPoint;
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }

  ctx.lineTo(points[maxIndex > 0 ? maxIndex - 1 : 0][0], height);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  for (const stop of colorStops) {
    gradient.addColorStop(stop[0], stop[1]);
  }

  ctx.globalAlpha = alpha;
  ctx.filter = "blur(16px)";
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.filter = "none";
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawCurveProgress(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  progress: number,
  opts: CurveOptions
) {
  ctx.save();
  ctx.globalAlpha = opts.alpha;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  const maxIndex = Math.floor(points.length * progress);

  for (let i = 1; i < maxIndex; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }

  if (progress < 1 && maxIndex < points.length - 1) {
    const t = progress * points.length - maxIndex;
    const currentPoint = points[Math.min(maxIndex, points.length - 1)];
    const nextPoint = points[Math.min(maxIndex + 1, points.length - 1)];
    const [x1, y1] = currentPoint;
    const [x2, y2] = nextPoint;
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }

  ctx.strokeStyle = opts.gradient ? mainGradient(ctx, width) : opts.color ?? "#fff";
  ctx.lineWidth = opts.width;

  if (opts.glow) {
    ctx.shadowBlur = opts.glowBlur ?? 0;
    ctx.shadowColor = opts.glowColor ?? "transparent";
  }

  ctx.stroke();
  ctx.restore();
}

export default function SpectralBalancePro({
  spectrum = [],
  progressTop = 1,
  progressBottom = 1,
}: SpectralBalanceProProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = 1100;
  const height = 420;
  const margin = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const optimized = spectrum.length === 5 ? spectrum : [0.52, 0.6, 0.72, 0.8, 0.84];
    const originalPoints = getCatmullRomSplinePoints(ORIGINAL_SPECTRUM, width, height, margin, 18);
    const optimizedPoints = getCatmullRomSplinePoints(optimized, width, height, margin, 18);

    drawFillProgress(
      ctx,
      originalPoints,
      width,
      height,
      progressBottom,
      [
        [0, "#2EE6FF"],
        [0.4, "#5F8BFF"],
        [0.7, "#9C56FF"],
        [1, "#FF2ED1"],
      ],
      0.28
    );
    drawFillProgress(
      ctx,
      optimizedPoints,
      width,
      height,
      progressTop,
      [
        [0, "#2EE6FF"],
        [0.4, "#5F8BFF"],
        [0.7, "#9C56FF"],
        [1, "#FF2ED1"],
      ],
      0.11
    );

    drawGrid(ctx, width, height);

    drawCurveProgress(ctx, originalPoints, width, progressBottom, {
      gradient: false,
      color: "#7FE3FF",
      alpha: 0.28,
      width: 2,
      glow: true,
      glowBlur: 1.5,
      glowColor: "#2EE6FF",
    });
    drawCurveProgress(ctx, optimizedPoints, width, progressTop, {
      gradient: true,
      alpha: 0.06,
      width: 10,
      glow: true,
      glowBlur: 4,
      glowColor: "#A056FF",
    });
    drawCurveProgress(ctx, optimizedPoints, width, progressTop, {
      gradient: true,
      alpha: 0.1,
      width: 3,
      glow: true,
      glowBlur: 2,
      glowColor: "#A056FF",
    });
    drawCurveProgress(ctx, optimizedPoints, width, progressTop, {
      gradient: true,
      alpha: 1,
      width: 3.5,
      glow: false,
    });
    drawCurveProgress(ctx, optimizedPoints, width, progressTop, {
      gradient: false,
      color: "rgba(255,255,255,0.13)",
      alpha: 1,
      width: 1,
      glow: false,
    });
  }, [progressBottom, progressTop, spectrum]);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 18,
          boxShadow: "0 4px 32px #000a",
          background: "#060B14",
        }}
      />

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 10,
          fontSize: 14,
          color: "#b7d6f7",
          fontWeight: 600,
          letterSpacing: 0.2,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {FREQ_LABELS.map((item) => (
          <div key={item.label} style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: "nowrap" }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "#7fa7d6", fontWeight: 400 }}>{item.hz}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
