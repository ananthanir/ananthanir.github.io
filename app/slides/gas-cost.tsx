"use client";

import { useState } from "react";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { formatUnits, parseUnits } from "../lib/units";

const ACCENT: Tone = "orange";

const TX_TYPES = [
  { id: "transfer", label: "ETH transfer", gas: "21000", exact: true },
  { id: "erc20", label: "ERC-20 transfer", gas: "65000", exact: false },
  { id: "swap", label: "Swap (Uniswap-style)", gas: "150000", exact: false },
];

const INT_RE = /^\d*$/;
const DEC_RE = /^\d*\.?\d*$/;

function Field({
  label,
  hint,
  value,
  onChange,
  pattern,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  pattern: RegExp;
}) {
  return (
    <div>
      <div className="text-muted-2 font-mono text-xs uppercase tracking-[0.25em]">{label}</div>
      <input
        value={value}
        onChange={(e) => {
          if (pattern.test(e.target.value)) onChange(e.target.value);
        }}
        spellCheck={false}
        inputMode="decimal"
        aria-label={label}
        className="text-fg mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[15px] outline-none"
        style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
      />
      {hint && <div className="text-muted-2 mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export function GasCostSlide(_: SlideProps) {
  const [gasLimit, setGasLimit] = useState("21000");
  const [baseFee, setBaseFee] = useState("20");
  const [priorityFee, setPriorityFee] = useState("2");

  const gasLimitUnits = BigInt(gasLimit || "0");
  const baseFeeWeiPerGas = parseUnits(baseFee, 9);
  const priorityFeeWeiPerGas = parseUnits(priorityFee, 9);
  const gasPriceWeiPerGas = baseFeeWeiPerGas + priorityFeeWeiPerGas;
  const totalFeeWei = gasLimitUnits * gasPriceWeiPerGas;

  return (
    <SlideShell
      kicker="Ether · Interactive"
      title={
        <>
          Tx cost <span className="text-grad-cool">calculation</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-6 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Every transaction pays <span className="text-fg font-semibold">gas used × gas price</span>.
            Since EIP-1559, gas price is a base fee (burned) plus a priority fee (tip to the validator).
          </div>

          <div>
            <div className="text-muted-2 mb-2 font-mono text-xs uppercase tracking-[0.25em]">
              Transaction type
            </div>
            <div className="flex flex-wrap gap-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setGasLimit(t.gas)}
                  className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition"
                  style={{
                    borderColor: toneVar(ACCENT, "border"),
                    background: gasLimit === t.gas ? toneVar(ACCENT, "strong-wash") : "transparent",
                    color: toneVar(ACCENT, "stroke"),
                  }}
                >
                  {t.label} · {t.exact ? "" : "~"}
                  {Number(t.gas).toLocaleString()} gas
                </button>
              ))}
            </div>
            <div className="text-muted-2 mt-2 text-xs leading-relaxed">
              Only a plain ETH transfer has a fixed cost (exactly 21,000 gas, set by the protocol).
              ERC-20 transfers and swaps run contract code, so their gas use varies by
              implementation — the figures above are typical, not exact.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Gas used (limit)" value={gasLimit} onChange={setGasLimit} pattern={INT_RE} />
            <Field
              label="Base fee (Gwei)"
              hint="set by the network, burned"
              value={baseFee}
              onChange={setBaseFee}
              pattern={DEC_RE}
            />
            <Field
              label="Priority fee (Gwei)"
              hint="tip to the validator"
              value={priorityFee}
              onChange={setPriorityFee}
              pattern={DEC_RE}
            />
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "strong-wash") }}
          >
            <div className="text-muted-2 font-mono text-xs uppercase tracking-[0.25em]">
              {gasLimit || "0"} gas × {formatUnits(gasPriceWeiPerGas, 9)} Gwei/gas
            </div>
            <div className="text-fg mt-2 text-2xl font-semibold">{formatUnits(totalFeeWei, 18)} ETH</div>
            <div className="text-muted mt-1 font-mono text-sm">
              {formatUnits(totalFeeWei, 9)} Gwei · {totalFeeWei.toString()} wei
            </div>
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
