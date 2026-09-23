import type { ReactNode } from "react";

/** Shared building blocks for the deck's interactive "step through a
 *  network diagram" slides (Fabric, Besu, Corda) — ported from static
 *  HTML prototypes, so this is the one place their animation/controls
 *  plumbing lives instead of being copy-pasted per platform. */

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function animateDot(
  dot: SVGCircleElement | null,
  points: number[][],
  duration: number,
  isCancelled: () => boolean,
) {
  if (!dot) return Promise.resolve();
  return new Promise<void>((resolve) => {
    dot.style.opacity = "1";
    const segLens: number[] = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const l = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
      segLens.push(l);
      total += l;
    }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (isCancelled()) {
        dot.style.opacity = "0";
        resolve();
        return;
      }
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const distT = progress * total;
      let acc = 0;
      let seg = 0;
      for (; seg < segLens.length - 1; seg++) {
        if (acc + segLens[seg] >= distT) break;
        acc += segLens[seg];
      }
      const segProg = Math.min((distT - acc) / (segLens[seg] || 1), 1);
      const [x1, y1] = points[seg];
      const [x2, y2] = points[seg + 1];
      dot.setAttribute("cx", String(x1 + (x2 - x1) * segProg));
      dot.setAttribute("cy", String(y1 + (y2 - y1) * segProg));
      if (progress < 1) requestAnimationFrame(frame);
      else {
        dot.style.opacity = "0";
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

export function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3.5 py-1.5 text-sm transition disabled:pointer-events-none disabled:opacity-35 ${
        primary ? "btn-primary" : "btn"
      }`}
    >
      {children}
    </button>
  );
}

export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="ml-auto flex items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? 9 : 7,
            height: i === current ? 9 : 7,
            background: i === current ? "var(--step-now)" : i < current ? "var(--step-done)" : "var(--step-todo)",
          }}
        />
      ))}
    </div>
  );
}
