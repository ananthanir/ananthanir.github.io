"use client";

import { useMemo, useState } from "react";
import { Btn } from "../components/flow-kit";
import { Field, Segmented } from "../components/pipeline";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import {
  calldataGas,
  encodeCall,
  encodeReturn,
  parseDeclaration,
  partsToBytes,
  signatureBytes,
  signatureHash,
  type Arg,
  type Part,
  type ParsedSignature,
} from "../lib/abi";
import { randomAddress, toHex } from "../lib/eth";

const ACCENT: Tone = "rose";

/** One colour per argument — used for word rows, the layout bar and the hex dump. */
const ARG_TONE: Record<string, Tone> = {
  selector: "rose",
  _number: "violet",
  _numbers: "cyan",
  _data: "emerald",
  _book: "amber",
};
const toneOf = (arg: string): Tone => ARG_TONE[arg] ?? "slate";

const CONTRACT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

contract Data {
    uint number;
    uint[] numbers;
    string data;
    address[5] book;

    function setNumber(uint _number) public {
        number = _number;
    }

    function setInfo(
        uint[] memory _numbers,
        string memory _data,
        address[5] memory _book
    ) public {
        numbers = _numbers;
        data = _data;
        book = _book;
    }

    function getInfo()
        public
        view
        returns (uint[] memory, string memory, address[5] memory)
    {
        return (numbers, data, book);
    }
}`;

const SET_NUMBER_DECL = "setNumber(uint _number)";
const SET_NUMBER_SIG = "setNumber(uint256)";
const SET_INFO_DECL = "setInfo(uint[] memory _numbers, string memory _data, address[5] memory _book)";
const SET_INFO_SIG = "setInfo(uint256[],string,address[5])";
const GET_INFO_SIG = "getInfo()";
const SIG_OF = { setNumber: SET_NUMBER_SIG, setInfo: SET_INFO_SIG, getInfo: GET_INFO_SIG } as const;

const hex4 = (n: number) => `0x${n.toString(16).padStart(4, "0")}`;

function CodeBlock({ source }: { source: string }) {
  return (
    <div
      className="shrink-0 overflow-x-auto rounded-lg border py-2 font-mono text-[12.5px] leading-6"
      style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
    >
      {source.split("\n").map((line, i) => (
        <div key={i} className="flex min-w-max pr-3">
          <span className="text-muted-2 w-9 shrink-0 select-none pr-3 text-right">{i + 1}</span>
          <span className="text-fg whitespace-pre">{line || " "}</span>
        </div>
      ))}
    </div>
  );
}

function Note({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div
      className="rounded-lg border p-3 text-sm"
      style={{
        borderColor: toneVar(error ? "rose" : "slate", "border"),
        background: toneVar(error ? "rose" : "slate", "wash"),
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · How a function selector is made                           */
/* ------------------------------------------------------------------ */

const PRESETS = [
  { label: "setNumber", text: SET_NUMBER_DECL },
  { label: "setInfo", text: SET_INFO_DECL },
  { label: "getInfo", text: "getInfo()" },
  { label: "ERC-20 transfer", text: "transfer(address to, uint amount)" },
];

const SELECTOR_STEPS = [
  "The function’s name and parameter types identify it. Parameter names, data locations (memory / calldata), visibility and return values play no part.",
  "Canonical form: the name, then the comma-separated types in parentheses — no spaces, no names, no data locations, and uint is always spelled uint256.",
  "Hash the signature’s UTF-8 bytes with Keccak-256.",
  "Keep the first 4 bytes. Every call to this function starts with them — the contract’s dispatcher compares them against each function’s selector to decide which code to run.",
];

function CanonicalView({ p }: { p: Extract<ParsedSignature, { ok: true }> }) {
  return (
    <div className="space-y-2">
      <div
        className="break-all rounded-lg border p-3 font-mono text-[15px] font-semibold"
        style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
      >
        <span style={{ color: toneVar(ACCENT, "stroke") }}>{p.canonical}</span>
      </div>
      {p.params.length === 0 ? (
        <div className="text-muted-2 text-sm">No parameters, so the signature is just the name and ().</div>
      ) : (
        <div className="space-y-1">
          {p.params.map((prm, i) => {
            const first = prm.original.trim().split(/\s+/)[0];
            const changed = first !== prm.type;
            return (
              <div key={i} className="flex flex-wrap items-baseline gap-x-3 font-mono text-[12.5px]">
                <span className="text-muted-2 min-w-0 break-all">{prm.original}</span>
                <span className="text-muted-2">→</span>
                <span
                  className="font-semibold"
                  style={{
                    color: toneVar(ACCENT, "stroke"),
                    textDecoration: changed ? "underline" : undefined,
                  }}
                >
                  {prm.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {p.warnings.map((w) => (
        <Note key={w} error>
          {w}
        </Note>
      ))}
    </div>
  );
}

function HashView({ signature }: { signature: string }) {
  const hash = toHex(signatureHash(signature));
  return (
    <div className="space-y-2">
      <div className="text-muted-2 font-mono text-[10px] uppercase tracking-[0.25em]">
        Signature as UTF-8 bytes ({signatureBytes(signature).length})
      </div>
      <div
        className="break-all rounded-lg border p-3 font-mono text-[12px]"
        style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
      >
        <span className="text-muted">{toHex(signatureBytes(signature))}</span>
      </div>
      <div className="text-muted-2 font-mono text-[10px] uppercase tracking-[0.25em]">
        keccak256 → 32 bytes
      </div>
      <div
        className="break-all rounded-lg border p-3 font-mono text-[13px]"
        style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
      >
        <span style={{ color: toneVar(ACCENT, "stroke"), fontWeight: 700 }}>{hash.slice(0, 8)}</span>
        <span className="text-fg">{hash.slice(8)}</span>
      </div>
    </div>
  );
}

function SelectorView({ signature }: { signature: string }) {
  const selector = toHex(signatureHash(signature).slice(0, 4));
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "strong-wash") }}
    >
      <div className="text-fg break-all font-mono text-2xl font-semibold">0x{selector}</div>
      <div className="text-muted-2 mt-1 font-mono text-xs">
        calldata for {signature} begins with these 4 bytes
      </div>
    </div>
  );
}

export function SelectorSlide(_: SlideProps) {
  const [decl, setDecl] = useState(SET_NUMBER_DECL);
  const [step, setStep] = useState(-1);
  const parsed = useMemo(() => parseDeclaration(decl), [decl]);
  const advance = (n: number) => setStep((s) => Math.max(s, n));

  const failed = (
    <Note error>{parsed.ok ? "" : parsed.error}</Note>
  );

  return (
    <SlideShell
      kicker="Calldata · Interactive"
      title={
        <>
          The function <span className="text-grad-cool">selector</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            A transaction’s <span className="text-fg">calldata</span> tells a contract which function to run
            and with what arguments. The first 4 bytes name the function — here is how they’re made, for
            this contract:
          </div>

          <CodeBlock source={CONTRACT_SOURCE} />

          <Field label="Function declaration — edit it" index={0} step={step} tone={ACCENT} alwaysOn>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setDecl(p.text)}
                    className="rounded-full border px-3 py-1 font-mono text-xs transition"
                    style={{
                      borderColor: toneVar(ACCENT, "border"),
                      background: decl === p.text ? toneVar(ACCENT, "strong-wash") : "transparent",
                      color: toneVar(ACCENT, "stroke"),
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={decl}
                onChange={(e) => setDecl(e.target.value)}
                rows={2}
                spellCheck={false}
                aria-label="Function declaration"
                className="text-fg w-full resize-none rounded-lg border bg-transparent p-3 font-mono text-[14px] leading-relaxed outline-none"
                style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
              />
              {!parsed.ok && failed}
            </div>
          </Field>

          <Field
            label="Canonical signature — types only"
            index={1}
            step={step}
            tone={ACCENT}
            actions={
              <Btn primary onClick={() => advance(1)} disabled={!parsed.ok}>
                Generate
              </Btn>
            }
          >
            {parsed.ok ? <CanonicalView p={parsed} /> : failed}
          </Field>

          <Field
            label="Keccak-256 of the signature"
            index={2}
            step={step}
            tone={ACCENT}
            actions={
              <Btn onClick={() => advance(2)} disabled={!parsed.ok || step < 1}>
                Generate
              </Btn>
            }
          >
            {parsed.ok ? <HashView signature={parsed.canonical} /> : failed}
          </Field>

          <Field
            label="Selector — the first 4 bytes"
            index={3}
            step={step}
            tone={ACCENT}
            actions={
              <Btn onClick={() => advance(3)} disabled={!parsed.ok || step < 2}>
                Generate
              </Btn>
            }
          >
            {parsed.ok ? <SelectorView signature={parsed.canonical} /> : failed}
          </Field>

          <div className="text-muted min-h-[48px] text-base leading-relaxed">
            {step >= 0
              ? SELECTOR_STEPS[step]
              : "Press each step’s “Generate” button in order — or edit the declaration first and watch the selector change."}
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · How the arguments are encoded                             */
/* ------------------------------------------------------------------ */

const SECTION_LABEL: Record<string, string> = {
  selector: "Selector",
  head: "Head — one slot per argument: the value itself if it has a fixed size, otherwise an offset",
  tail: "Tail — the dynamic data, in argument order: a length, then the contents",
};

/** A 32-byte word with its zero padding dimmed. */
function PaddedHex({ part }: { part: Part }) {
  const h = toHex(part.bytes);
  let lead = 0;
  let trail = 0;
  if (part.pad === "left") while (lead < h.length && h[lead] === "0") lead++;
  if (part.pad === "right") while (trail < h.length && h[h.length - 1 - trail] === "0") trail++;
  lead -= lead % 2;
  trail -= trail % 2;
  return (
    <>
      <span className="text-muted-2 opacity-60">{h.slice(0, lead)}</span>
      <span className="text-fg">{h.slice(lead, h.length - trail)}</span>
      <span className="text-muted-2 opacity-60">{trail ? h.slice(h.length - trail) : ""}</span>
    </>
  );
}

function EncodingView({ title, parts, showGas }: { title: string; parts: Part[]; showGas?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const bytes = partsToBytes(parts);
  const hex = toHex(bytes);
  const gas = calldataGas(bytes);

  const pointerFor = new Map(parts.filter((p) => p.pointsTo !== undefined).map((p) => [p.pointsTo as number, p.pos]));
  const selected = sel === null ? null : (parts.find((p) => p.pos === sel) ?? null);
  const related = new Set<number>();
  if (selected) {
    if (selected.pointsTo !== undefined) related.add(selected.pointsTo);
    const from = pointerFor.get(selected.pos);
    if (from !== undefined) related.add(from);
  }
  const legend = [...new Set(parts.map((p) => p.arg))];

  const copy = () => {
    navigator.clipboard?.writeText(`0x${hex}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-fg font-mono text-sm font-semibold break-all">{title}</div>
        <div className="text-muted-2 font-mono text-xs">
          {bytes.length} bytes
          {showGas && ` · calldata gas ${gas.gas} (${gas.nonZero}×16 + ${gas.zero}×4)`}
        </div>
      </div>

      <div
        className="flex h-5 w-full overflow-hidden rounded-md border"
        style={{ borderColor: toneVar(ACCENT, "border") }}
        role="img"
        aria-label="Layout of the encoded data"
      >
        {parts.map((p) => (
          <div
            key={p.pos}
            title={`${hex4(p.pos)}  ${p.label}`}
            style={{
              width: `${(p.bytes.length / bytes.length) * 100}%`,
              background: toneVar(toneOf(p.arg), "stroke"),
              opacity: p.kind === "offset" ? 0.5 : p.kind === "length" ? 0.75 : 1,
              borderRight: "1px solid var(--bg)",
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        {legend.map((a) => (
          <span key={a} className="text-muted-2 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: toneVar(toneOf(a), "stroke") }} />
            {a}
          </span>
        ))}
        <span className="text-muted-2">· faded = offset / length words · click an offset to see where it points</span>
      </div>

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: toneVar(ACCENT, "border") }}>
        {parts.map((p, i) => {
          const t = toneOf(p.arg);
          const isSel = sel === p.pos;
          const isRelated = related.has(p.pos);
          const pointedFrom = pointerFor.get(p.pos);
          const header = p.section && p.section !== parts[i - 1]?.section ? SECTION_LABEL[p.section] : null;
          return (
            <div key={p.pos}>
              {header && (
                <div
                  className="text-muted-2 border-b px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
                  style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
                >
                  {header}
                </div>
              )}
              <button
                onClick={() => setSel(isSel ? null : p.pos)}
                className="flex w-full flex-col gap-1 border-l-[3px] px-2.5 py-1.5 text-left sm:flex-row sm:items-start sm:gap-3"
                style={{
                  borderLeftColor: toneVar(t, "stroke"),
                  background: isSel || isRelated ? toneVar(t, "strong-wash") : undefined,
                }}
              >
                <span className="text-muted-2 w-14 shrink-0 font-mono text-[11px]">{hex4(p.pos)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-all font-mono text-[12px]">
                    <PaddedHex part={p} />
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug">
                    <span className="text-fg font-medium">{p.label}</span>{" "}
                    <span className="text-muted-2">— {p.note}</span>
                  </span>
                </span>
                {p.pointsTo !== undefined && (
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: toneVar(t, "stroke") }}>
                    → {hex4(p.pointsTo)}
                  </span>
                )}
                {pointedFrom !== undefined && (
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: toneVar(t, "stroke") }}>
                    ← {hex4(pointedFrom)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2">
        <div
          className="max-h-40 min-w-0 flex-1 overflow-y-auto break-all rounded-lg border p-3 font-mono text-[11.5px] leading-relaxed"
          style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
        >
          <span className="text-muted-2">0x</span>
          {parts.map((p) => (
            <span key={p.pos} style={{ color: toneVar(toneOf(p.arg), "stroke") }}>
              {toHex(p.bytes)}
            </span>
          ))}
        </div>
        <Btn onClick={copy}>{copied ? "Copied" : "Copy"}</Btn>
      </div>
    </div>
  );
}

function StoredValues({
  numbers,
  data,
  book,
  valid,
}: {
  numbers: bigint[];
  data: string;
  book: string[];
  valid: boolean;
}) {
  const short = (a: string) => `${a.trim().slice(0, 6)}…${a.trim().slice(-4)}`;
  return (
    <div
      className="rounded-lg border p-3 font-mono text-[12px] leading-relaxed"
      style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
    >
      <div className="text-muted-2 mb-1 text-[10px] uppercase tracking-wide">
        Stored by the last setInfo — change them under setInfo
      </div>
      {valid ? (
        <div className="space-y-0.5 break-all">
          <div>
            <span className="text-muted-2">numbers </span>[{numbers.join(", ")}]
          </div>
          <div>
            <span className="text-muted-2">data    </span>“{data}”
          </div>
          <div>
            <span className="text-muted-2">book    </span>[{book.map(short).join(", ")}]
          </div>
        </div>
      ) : (
        <div style={{ color: toneVar("rose", "stroke") }}>The stored values aren’t valid.</div>
      )}
    </div>
  );
}

const DEFAULT_BOOK = ["1", "2", "3", "4", "5"].map((d) => `0x${d.repeat(40)}`);

function parseUints(text: string): { values: bigint[]; error: string | null } {
  const values: bigint[] = [];
  for (const raw of text.split(",")) {
    const t = raw.trim();
    if (!t) continue;
    if (!/^\d+$/.test(t)) return { values, error: `“${t}” isn’t a whole number.` };
    const v = BigInt(t);
    if (v >= 2n ** 256n) return { values, error: `${t.slice(0, 10)}… doesn’t fit in a uint256.` };
    if (values.length >= 8) return { values, error: "Up to 8 numbers in this demo." };
    values.push(v);
  }
  return { values, error: null };
}

function parseUint(text: string): { value: bigint | null; error: string | null } {
  const t = text.trim();
  if (!t) return { value: null, error: "Enter a number." };
  if (!/^\d+$/.test(t)) return { value: null, error: `“${t}” isn’t a whole number.` };
  const v = BigInt(t);
  if (v >= 2n ** 256n) return { value: null, error: "That doesn’t fit in a uint256." };
  return { value: v, error: null };
}

const checkAddress = (s: string): string | null =>
  /^(0x)?[0-9a-fA-F]{40}$/.test(s.trim()) ? null : "an address is 0x followed by 40 hex characters";

type FnId = "setNumber" | "setInfo" | "getInfo";
const FN_OPTIONS: { value: FnId; label: string }[] = [
  { value: "setNumber", label: "setNumber(…)" },
  { value: "setInfo", label: "setInfo(…)" },
  { value: "getInfo", label: "getInfo()" },
];

const inputClass = "text-fg w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[13px] outline-none";

export function EncodingSlide(_: SlideProps) {
  const [fn, setFn] = useState<FnId>("setNumber");
  const [numberText, setNumberText] = useState("42");
  const [numbersText, setNumbersText] = useState("11, 22, 33");
  const [data, setData] = useState("hello, calldata");
  const [book, setBook] = useState(DEFAULT_BOOK);

  const single = parseUint(numberText);
  const nums = parseUints(numbersText);
  const addressErrors = book.map(checkAddress);
  const ready = !nums.error && addressErrors.every((e) => e === null);

  const args: Arg[] | null = ready
    ? [
        { name: "_numbers", type: "uint256[]", value: nums.values },
        { name: "_data", type: "string", value: data },
        { name: "_book", type: "address[5]", value: book.map((a) => a.trim()) },
      ]
    : null;

  const call =
    fn === "setNumber"
      ? single.value !== null
        ? encodeCall(SET_NUMBER_SIG, [{ name: "_number", type: "uint256", value: single.value }])
        : null
      : fn === "getInfo"
        ? encodeCall(GET_INFO_SIG, [])
        : args
          ? encodeCall(SET_INFO_SIG, args)
          : null;
  const returned = fn === "getInfo" && args ? encodeReturn(args) : null;

  const field = "space-y-1";
  const label = "text-muted-2 font-mono text-[11px]";

  return (
    <SlideShell
      kicker="Calldata · Interactive"
      title={
        <>
          Encoding the <span className="text-grad-cool">arguments</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented options={FN_OPTIONS} value={fn} onChange={setFn} tone={ACCENT} ariaLabel="Function" />
            <div className="text-muted-2 break-all font-mono text-xs">{SIG_OF[fn]}</div>
          </div>

          {fn === "setNumber" ? (
            <>
              <div className="text-muted text-base leading-relaxed">
                The simplest case: a <span className="font-mono text-sm">uint256</span> has a fixed size, so it is written
                in place as a single 32-byte word — no offset and no tail. It is padded with zeros on the left.
              </div>
              <div className={field}>
                <div className={label}>_number — uint256</div>
                <input
                  value={numberText}
                  onChange={(e) => setNumberText(e.target.value)}
                  spellCheck={false}
                  inputMode="numeric"
                  aria-label="Number"
                  className={inputClass}
                  style={{ borderColor: toneVar("violet", "border"), background: toneVar("violet", "wash") }}
                />
                {single.error && (
                  <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                    {single.error}
                  </div>
                )}
              </div>
            </>
          ) : fn === "setInfo" ? (
            <>
          <div className="text-muted text-base leading-relaxed">
            After the selector come the arguments, built from 32-byte words.{" "}
            <span className="text-fg">Fixed-size values</span> (like <span className="font-mono text-sm">address[5]</span>) are
            written in place. <span className="text-fg">Dynamic ones</span> (<span className="font-mono text-sm">uint256[]</span>,{" "}
            <span className="font-mono text-sm">string</span>) leave an offset in the head and put their length and contents in
            the tail. Numbers and addresses are padded on the left, text on the right.
          </div>


          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className={field}>
              <div className={label}>_numbers — uint256[] (comma-separated)</div>
              <input
                value={numbersText}
                onChange={(e) => setNumbersText(e.target.value)}
                spellCheck={false}
                inputMode="numeric"
                aria-label="Numbers"
                className={inputClass}
                style={{ borderColor: toneVar("cyan", "border"), background: toneVar("cyan", "wash") }}
              />
              {nums.error && (
                <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                  {nums.error}
                </div>
              )}
            </div>
            <div className={field}>
              <div className={label}>_data — string</div>
              <input
                value={data}
                maxLength={200}
                onChange={(e) => setData(e.target.value)}
                spellCheck={false}
                aria-label="Data"
                className={inputClass}
                style={{ borderColor: toneVar("emerald", "border"), background: toneVar("emerald", "wash") }}
              />
              <div className="text-muted-2 text-xs">{new TextEncoder().encode(data).length} bytes in UTF-8</div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className={label}>_book — address[5]</div>
              <div className="flex gap-2">
                <Btn onClick={() => setBook(Array.from({ length: 5 }, () => `0x${toHex(randomAddress())}`))}>
                  Random addresses
                </Btn>
                <Btn onClick={() => setBook(DEFAULT_BOOK)}>Reset</Btn>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {book.map((addr, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-2 w-14 shrink-0 font-mono text-[11px]">[{i}]</span>
                    <input
                      value={addr}
                      onChange={(e) => setBook((b) => b.map((x, j) => (j === i ? e.target.value : x)))}
                      spellCheck={false}
                      aria-label={`Address ${i}`}
                      className={inputClass}
                      style={{
                        borderColor: toneVar(addressErrors[i] ? "rose" : "amber", "border"),
                        background: toneVar("amber", "wash"),
                      }}
                    />
                  </div>
                  {addressErrors[i] && (
                    <div className="pl-16 text-xs" style={{ color: toneVar("rose", "stroke") }}>
                      {addressErrors[i]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

            </>
          ) : (
            <>
              <div className="text-muted text-base leading-relaxed">
                <span className="font-mono text-sm">getInfo()</span> takes no arguments, so its calldata is just the 4-byte
                selector. What it <span className="text-fg">returns</span> is encoded with the same head-and-tail rules as
                arguments — only without a selector in front.
              </div>
              <StoredValues numbers={nums.values} data={data} book={book} valid={ready} />
            </>
          )}

          {fn === "getInfo" ? (
            <>
              {call && <EncodingView title="Calldata for getInfo() — just the selector" parts={call} showGas />}
              {returned ? (
                <EncodingView title="Return data — (uint256[], string, address[5])" parts={returned} />
              ) : (
                <Note error>The stored values aren’t valid — fix them under setInfo to see the return data.</Note>
              )}
            </>
          ) : call ? (
            <EncodingView title={`Calldata for ${SIG_OF[fn]}`} parts={call} showGas />
          ) : (
            <Note error>Fix the highlighted input to see the encoding.</Note>
          )}
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
