import type { ReactNode } from "react";
import { toneVar, type Tone } from "./ui";

/** Shared footprint so a step's box doesn't change size — or shift the rest of
 *  the layout — once its value is generated. */
export const BLOCK_SIZE = "min-h-[88px] p-3";

export function PendingBlock({ tone }: { tone: Tone }) {
  return (
    <div
      className={`${BLOCK_SIZE} text-muted-2 flex items-center rounded-lg border border-dashed font-mono text-[13px]`}
      style={{ borderColor: toneVar(tone, "border") }}
    >
      pending…
    </div>
  );
}

/** Small numbered circle used to label pipeline steps. */
export function StepBadge({ n, tone }: { n: number; tone: Tone }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
      style={{
        background: toneVar(tone, "wash"),
        borderColor: toneVar(tone, "border"),
        color: toneVar(tone, "stroke"),
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      {n}
    </span>
  );
}

/** One row of a pipeline — numbered label + its own action button(s), value
 *  hidden behind a "pending…" placeholder until that step has been run. */
export function Field({
  label,
  index,
  step,
  tone,
  actions,
  alwaysOn,
  children,
}: {
  label: string;
  index: number;
  step: number;
  tone: Tone;
  actions?: ReactNode;
  alwaysOn?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StepBadge n={index + 1} tone={tone} />
          <div className="text-muted-2 truncate font-mono text-xs uppercase tracking-[0.25em]">{label}</div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-1.5">{alwaysOn || step >= index ? children : <PendingBlock tone={tone} />}</div>
    </div>
  );
}

/** Pill-shaped segmented toggle, e.g. optimizer off / on. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone: Tone;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: toneVar(tone, "border") }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className="rounded-full px-3 py-1 text-xs font-medium transition"
          style={{
            background: o.value === value ? toneVar(tone, "strong-wash") : "transparent",
            color: toneVar(tone, "stroke"),
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
