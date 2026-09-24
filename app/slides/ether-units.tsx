"use client";

import { useState } from "react";
import { Btn } from "../components/flow-kit";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { ETHER_UNITS, formatUnits, parseUnits } from "../lib/units";

const ACCENT: Tone = "emerald";

function numRegex(decimals: number): RegExp {
  // wei is atomic — no decimal point allowed there
  return decimals === 0 ? /^\d*$/ : /^\d*\.?\d*$/;
}

export function EtherUnitsSlide(_: SlideProps) {
  const [unitId, setUnitId] = useState("ether");
  const [wei, setWei] = useState(10n ** 18n);
  const [input, setInput] = useState(() => formatUnits(10n ** 18n, 18));

  const unit = ETHER_UNITS.find((u) => u.id === unitId)!;
  const others = ETHER_UNITS.filter((u) => u.id !== unitId);

  const setAmount = (nextWei: bigint, id: string) => {
    const u = ETHER_UNITS.find((x) => x.id === id)!;
    setUnitId(id);
    setWei(nextWei);
    setInput(formatUnits(nextWei, u.decimals));
  };

  const handleInputChange = (raw: string) => {
    if (!numRegex(unit.decimals).test(raw)) return;
    setInput(raw);
    setWei(parseUnits(raw, unit.decimals));
  };

  const selectUnit = (id: string) => {
    const u = ETHER_UNITS.find((x) => x.id === id)!;
    setUnitId(id);
    setInput(formatUnits(wei, u.decimals));
  };

  return (
    <SlideShell
      kicker="Ether · Interactive"
      title={
        <>
          Ether <span className="text-grad-cool">denominations</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-6 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Enter an amount in wei, Gwei, or Ether — the other two update instantly. Wei is the
            atomic unit; Gwei and Ether are just names for 10⁹ and 10¹⁸ wei.
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {ETHER_UNITS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUnit(u.id)}
                  className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition"
                  style={{
                    borderColor: toneVar(ACCENT, "border"),
                    background: u.id === unitId ? toneVar(ACCENT, "strong-wash") : "transparent",
                    color: toneVar(ACCENT, "stroke"),
                  }}
                >
                  {u.name}
                  {u.alt ? ` (${u.alt})` : ""}
                </button>
              ))}
            </div>
            <input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              spellCheck={false}
              inputMode="decimal"
              aria-label={`Amount in ${unit.name}`}
              className="text-fg w-full rounded-lg border bg-transparent px-4 py-3 font-mono text-xl outline-none"
              style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
            />
            {unit.note && <div className="text-muted-2 mt-1.5 text-xs">{unit.note}</div>}
          </div>

          <div className="grid flex-1 grid-cols-1 content-start gap-4 sm:grid-cols-2">
            {others.map((u) => (
              <div key={u.id}>
                <div className="text-muted-2 font-mono text-xs uppercase tracking-[0.25em]">
                  {u.name}
                  {u.alt ? ` — ${u.alt}` : ""}
                </div>
                <div
                  className="mt-1.5 break-all rounded-lg border p-3 font-mono text-[15px] leading-relaxed"
                  style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
                >
                  {formatUnits(wei, u.decimals)}
                </div>
                {u.note && <div className="text-muted-2 mt-1 text-xs">{u.note}</div>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn primary onClick={() => setAmount(10n ** 18n, "ether")}>1 Ether</Btn>
            <Btn onClick={() => setAmount(10n ** 9n, "gwei")}>1 Gwei</Btn>
            <Btn onClick={() => setAmount(21000n * 30n * 10n ** 9n, "ether")}>
              21,000 gas @ 30 Gwei
            </Btn>
            <Btn onClick={() => setAmount(0n, unitId)}>0</Btn>
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
