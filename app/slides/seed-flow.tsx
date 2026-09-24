"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Btn } from "../components/flow-kit";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { keccak256, publicKeyFromPrivate, toHex } from "../lib/eth";
import {
  deriveHierarchy,
  deriveMnemonicFromEntropy,
  derivationPath,
  mnemonicToSeed,
  randomEntropy,
  validateMnemonic,
  type HierarchyLevel,
  type MnemonicDerivation,
} from "../lib/hdwallet";

const ACCENT: Tone = "sky";

/** Shared footprint so a step's box doesn't change size — or shift the
 *  rest of the layout — once its value is generated. */
const BLOCK_SIZE = "min-h-[88px] p-3";

function HexBlock({
  hex,
  tone,
  highlightChars,
  address,
}: {
  hex: string;
  tone: Tone;
  /** tint the first N hex characters (nibbles) — used for the checksum nibble */
  highlightChars?: number;
  address?: boolean;
}) {
  return (
    <div
      className={`${BLOCK_SIZE} flex items-center break-all rounded-lg border font-mono text-[13px] leading-relaxed`}
      style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
    >
      <div>
        {address && <span className="text-muted-2">0x</span>}
        {hex.split("").map((c, i) => (
          <span
            key={i}
            className="text-fg"
            style={
              highlightChars && i < highlightChars
                ? { color: toneVar(tone, "stroke"), fontWeight: 700 }
                : undefined
            }
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function BitBlock({ bits, tone }: { bits: string; tone: Tone }) {
  const groups = bits.match(/.{1,11}/g) ?? [];
  return (
    <div
      className={`${BLOCK_SIZE} break-all rounded-lg border font-mono text-[12px] leading-relaxed`}
      style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
    >
      {groups.map((g, i) => (
        <span key={i} className="text-fg mr-2 inline-block" style={{ opacity: i % 2 === 0 ? 1 : 0.6 }}>
          {g}
        </span>
      ))}
    </div>
  );
}

function WordGrid({ indices, words, tone }: { indices: number[]; words: string[]; tone: Tone }) {
  return (
    <div
      className={`${BLOCK_SIZE} grid grid-cols-3 gap-1.5 rounded-lg border sm:grid-cols-4`}
      style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
    >
      {words.map((w, i) => (
        <div
          key={i}
          className="flex items-baseline gap-1.5 rounded-md px-2 py-1"
          style={{ background: toneVar(tone, "strong-wash") }}
        >
          <span className="text-muted-2 font-mono text-[10px]">{indices[i]}</span>
          <span className="text-fg font-mono text-[13px]">{w}</span>
        </div>
      ))}
    </div>
  );
}

function PendingBlock({ tone }: { tone: Tone }) {
  return (
    <div
      className={`${BLOCK_SIZE} text-muted-2 flex items-center rounded-lg border border-dashed font-mono text-[13px]`}
      style={{ borderColor: toneVar(tone, "border") }}
    >
      pending…
    </div>
  );
}

/** Every level of m/44'/60'/0'/0/0, each with the private key actually
 *  derived at that point — not just the final one. Each level only ever
 *  depends on its parent, so re-rolling one changes every level below it. */
function HierarchyList({ levels, tone }: { levels: HierarchyLevel[]; tone: Tone }) {
  return (
    <div className="space-y-1.5">
      {levels.map((lvl, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2.5"
          style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
        >
          <span
            className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[12px] font-semibold"
            style={{ background: toneVar(tone, "strong-wash"), color: toneVar(tone, "stroke") }}
          >
            {lvl.path}
          </span>
          <span className="text-muted-2 shrink-0 text-[11px] uppercase tracking-wide">{lvl.label}</span>
          <span className="text-fg min-w-0 flex-1 break-all font-mono text-[12px]">{toHex(lvl.privateKey)}</span>
        </div>
      ))}
    </div>
  );
}

/** One row of the pipeline — label + its own generate button(s), value
 *  hidden behind a "pending…" placeholder until that step has been run. */
function Field({
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
  actions: ReactNode;
  alwaysOn?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
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
            {index + 1}
          </span>
          <div className="text-muted-2 truncate font-mono text-xs uppercase tracking-[0.25em]">{label}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      <div className="mt-1.5">{alwaysOn || step >= index ? children : <PendingBlock tone={tone} />}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · How the seed phrase itself is generated (BIP-39)          */
/* ------------------------------------------------------------------ */

const SEED_STEPS = [
  {
    desc: "16 bytes from a cryptographically secure RNG — MetaMask (and this demo) use the Web Crypto API.",
  },
  {
    desc: "Hash the entropy with SHA-256. For 128-bit entropy the checksum is its first 4 bits — exactly one hex digit.",
  },
  {
    desc: "Append the checksum bits to the entropy: 128 + 4 = 132 bits, which splits evenly into twelve 11-bit groups.",
  },
  {
    desc: "Each 11-bit group is a number from 0–2047 — an index into the fixed, public BIP-39 wordlist. MetaMask shows you these 12 words to write down.",
  },
];

export function SeedPhraseSlide(_: SlideProps) {
  const [data, setData] = useState<MnemonicDerivation>(() => deriveMnemonicFromEntropy(randomEntropy()));
  const [step, setStep] = useState(-1);

  const regenerate = () => {
    setData(deriveMnemonicFromEntropy(randomEntropy()));
    setStep(0);
  };

  const checksumChars = data.checksumBits.length / 4;

  return (
    <SlideShell
      kicker="MetaMask · Interactive"
      title={
        <>
          Seed phrase <span className="text-grad-cool">(BIP-39)</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            This is exactly how MetaMask creates a new 12-word recovery phrase — 128 bits of
            randomness, a checksum, then a lookup into the standard 2048-word BIP-39 list.
          </div>

          <div className="grid flex-1 grid-cols-1 content-start gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <Field
                label="Entropy — 128 random bits (16 bytes)"
                index={0}
                step={step}
                tone={ACCENT}
                actions={<Btn primary onClick={regenerate}>Generate</Btn>}
              >
                <HexBlock hex={toHex(data.entropy)} tone={ACCENT} />
              </Field>
              <Field
                label="SHA-256(entropy) — checksum is its first hex digit"
                index={1}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(1)} disabled={step < 0}>Generate</Btn>}
              >
                <HexBlock hex={toHex(data.hash)} tone={ACCENT} highlightChars={checksumChars} />
              </Field>
            </div>
            <div className="space-y-5">
              <Field
                label="132 bits → twelve 11-bit groups"
                index={2}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(2)} disabled={step < 1}>Generate</Btn>}
              >
                <BitBlock bits={data.bits} tone={ACCENT} />
              </Field>
              <Field
                label="Index (0–2047) → word — the mnemonic"
                index={3}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(3)} disabled={step < 2}>Generate</Btn>}
              >
                <WordGrid indices={data.indices} words={data.words} tone={ACCENT} />
              </Field>
            </div>
          </div>

          <div className="text-muted min-h-[48px] text-base leading-relaxed">
            {step >= 0
              ? SEED_STEPS[step].desc
              : "Press each step's “Generate” button in order to see how a recovery phrase is built."}
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · Deriving the account address from the seed (BIP-32/44)    */
/* ------------------------------------------------------------------ */

export function SeedAddressSlide(_: SlideProps) {
  const [mnemonic, setMnemonic] = useState(() => deriveMnemonicFromEntropy(randomEntropy()).mnemonic);
  const [mnemonicInput, setMnemonicInput] = useState(mnemonic);
  const [mnemonicError, setMnemonicError] = useState<string | null>(null);
  const [addressIndex, setAddressIndex] = useState(0);
  const [step, setStep] = useState(-1);

  const regenerate = () => {
    const fresh = deriveMnemonicFromEntropy(randomEntropy()).mnemonic;
    setMnemonic(fresh);
    setMnemonicInput(fresh);
    setMnemonicError(null);
    setAddressIndex(0);
    setStep(0);
  };

  const applyMnemonic = () => {
    const trimmed = mnemonicInput.trim().replace(/\s+/g, " ").toLowerCase();
    if (!validateMnemonic(trimmed)) {
      setMnemonicError("Enter a valid 12-word BIP-39 mnemonic — its checksum must match too.");
      return;
    }
    setMnemonic(trimmed);
    setMnemonicInput(trimmed);
    setMnemonicError(null);
    setAddressIndex(0);
    setStep(0);
  };

  // Step 4's "Generate" reveals the first address; once revealed, pressing it
  // again walks to the next account — same phrase, next address index — just
  // like clicking "Add account" in MetaMask.
  const generateAddress = () => {
    if (step < 3) setStep(3);
    else setAddressIndex((i) => i + 1);
  };

  const pipeline = useMemo(() => {
    const seed = mnemonicToSeed(mnemonic);
    const hierarchy = deriveHierarchy(seed, addressIndex);
    const priv = hierarchy[hierarchy.length - 1].privateKey;
    const pub = publicKeyFromPrivate(priv);
    const hash = keccak256(pub);
    const address = hash.slice(-20);
    return { seed, hierarchy, priv, address };
  }, [mnemonic, addressIndex]);

  return (
    <SlideShell
      kicker="MetaMask · Interactive"
      title={
        <>
          Address from <span className="text-grad-cool">seed</span> (BIP-32/44)
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            One recovery phrase can regenerate every account MetaMask ever showed you — the
            phrase alone determines all of it, deterministically.
          </div>

          <div>
            <Field
              label="Mnemonic (BIP-39)"
              index={0}
              step={step}
              tone={ACCENT}
              alwaysOn
              actions={<Btn primary onClick={regenerate}>Generate</Btn>}
            >
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                onBlur={applyMnemonic}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyMnemonic();
                  }
                }}
                spellCheck={false}
                rows={2}
                aria-label="Mnemonic"
                className={`${BLOCK_SIZE} text-fg w-full resize-none rounded-lg border bg-transparent font-mono text-[15px] leading-relaxed outline-none`}
                style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
              />
            </Field>
            {mnemonicError && (
              <div className="mt-1.5 text-xs" style={{ color: toneVar("rose", "stroke") }}>
                {mnemonicError}
              </div>
            )}
          </div>

          <Field
            label="Seed — PBKDF2-HMAC-SHA512, 2048 rounds, 64 bytes"
            index={1}
            step={step}
            tone={ACCENT}
            actions={<Btn onClick={() => setStep(1)} disabled={step < 0}>Generate</Btn>}
          >
            <HexBlock hex={toHex(pipeline.seed)} tone={ACCENT} />
          </Field>

          <Field
            label={`Derivation hierarchy — ${derivationPath(addressIndex)} (BIP-44: Ethereum, account ${addressIndex})`}
            index={2}
            step={step}
            tone={ACCENT}
            actions={<Btn onClick={() => setStep(2)} disabled={step < 1}>Generate</Btn>}
          >
            <HierarchyList levels={pipeline.hierarchy} tone={ACCENT} />
          </Field>

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
                  style={{
                    background: toneVar(ACCENT, "wash"),
                    borderColor: toneVar(ACCENT, "border"),
                    color: toneVar(ACCENT, "stroke"),
                    borderWidth: 1,
                    borderStyle: "solid",
                  }}
                >
                  4
                </span>
                <div className="text-muted-2 font-mono text-xs uppercase tracking-[0.25em]">
                  Address — keccak256(pubkey), last 20 bytes
                </div>
              </div>
              <Btn onClick={generateAddress} disabled={step < 2}>
                {step >= 3 ? "Next account" : "Generate"}
              </Btn>
            </div>
            <div className="mt-1.5">
              {step >= 3 ? (
                <div
                  className="rounded-xl border p-4"
                  style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "strong-wash") }}
                >
                  <div className="text-fg break-all font-mono text-lg font-semibold">
                    0x{toHex(pipeline.address)}
                  </div>
                  <div className="text-muted-2 mt-1 text-xs">
                    {derivationPath(addressIndex)} · account #{addressIndex}
                  </div>
                </div>
              ) : (
                <PendingBlock tone={ACCENT} />
              )}
            </div>
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
