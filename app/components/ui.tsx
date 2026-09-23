import type { CSSProperties, ReactNode } from "react";

/** Every slide receives this; `goTo` jumps to a slide by its id. */
export type SlideProps = {
  goTo: (id: string) => void;
};

/** Semantic accent colors. Each resolves to different hex values per
 *  theme via CSS variables — see globals.css. */
export type Tone =
  | "sky"
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "orange"
  | "slate";

type ToneProp = "stroke" | "text" | "wash" | "border" | "glow" | "strong-wash" | "strong-text";

/** Reference a tone's CSS variable, e.g. toneVar("cyan", "stroke"). Usable
 *  directly in inline styles and raw SVG attributes — no hook needed, the
 *  browser resolves it against the current [data-theme]. */
export function toneVar(tone: Tone, prop: ToneProp): string {
  return `var(--c-${tone}-${prop})`;
}

/** Fades + slides children in when the slide mounts. Delay in ms staggers items. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`reveal ${className}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

/** Standard slide frame: kicker line, big title, content area. */
export function SlideShell({
  kicker,
  title,
  accent = "sky",
  children,
}: {
  kicker: string;
  title: ReactNode;
  accent?: Tone;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col px-10 pb-16 pt-10 lg:px-20 lg:pt-14">
      <Reveal>
        <div
          className="font-mono text-xs uppercase tracking-[0.35em]"
          style={{ color: toneVar(accent, "stroke") }}
        >
          {kicker}
        </div>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="text-fg mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">
          {title}
        </h2>
      </Reveal>
      <div className="mt-8 min-h-0 flex-1 lg:mt-10">{children}</div>
    </div>
  );
}

/** Small rounded label chip. */
export function Chip({
  children,
  tone = "sky",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm ${className}`}
      style={{
        borderColor: toneVar(tone, "border"),
        background: toneVar(tone, "wash"),
        color: toneVar(tone, "stroke"),
      }}
    >
      {children}
    </span>
  );
}

/** Pill-shaped external link — opens in a new tab. */
export function LinkPill({
  href,
  tone = "sky",
  children,
  className = "",
}: {
  href: string;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`row-hover inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${className}`}
      style={{
        borderColor: toneVar(tone, "border"),
        background: toneVar(tone, "wash"),
        color: toneVar(tone, "stroke"),
      }}
    >
      {children}
      <span aria-hidden className="text-xs opacity-70">
        ↗
      </span>
    </a>
  );
}

/** Translucent bordered card. Pass `tone` for a role-tinted card (like the
 *  CA/peer/channel boxes in the reference diagram); omit for a neutral one. */
export function Panel({
  children,
  tone,
  className = "",
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border ${tone ? "" : "surface"} ${className}`}
      style={{
        ...(tone
          ? { borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }
          : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Bullet with colored dot, bold lead and muted body. */
export function Point({
  title,
  children,
  delay = 0,
  tone = "sky",
}: {
  title: string;
  children: ReactNode;
  delay?: number;
  tone?: Tone;
}) {
  return (
    <Reveal delay={delay} className="flex gap-4">
      <span
        className="mt-[9px] h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: toneVar(tone, "stroke"),
          boxShadow: `0 0 12px ${toneVar(tone, "glow")}`,
        }}
      />
      <div>
        <div className="text-fg text-lg font-semibold leading-snug">{title}</div>
        <div className="text-muted mt-1 text-[15px] leading-relaxed">
          {children}
        </div>
      </div>
    </Reveal>
  );
}

/** Animated downward connector for vertical flow diagrams. */
export function ArrowDown({
  delay = 0,
  tone = "sky",
}: {
  delay?: number;
  tone?: Tone;
}) {
  const color = toneVar(tone, "stroke");
  return (
    <Reveal delay={delay} className="flex justify-center py-0.5">
      <svg width="20" height="30" viewBox="0 0 20 30" aria-hidden>
        <line
          x1="10" y1="0" x2="10" y2="21"
          stroke={color} strokeWidth="2" className="flow-line"
        />
        <path
          d="M4 19 L10 28 L16 19"
          fill="none" stroke={color} strokeWidth="2"
        />
      </svg>
    </Reveal>
  );
}
