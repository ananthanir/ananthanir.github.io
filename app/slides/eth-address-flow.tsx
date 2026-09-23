"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Btn } from "../components/flow-kit";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import {
  isValidPrivateKey,
  keccak256,
  publicKeyFromPrivate,
  randomAddress,
  randomPrivateKey,
  rlpSenderNonce,
  toHex,
} from "../lib/eth";

/* ------------------------------------------------------------------ */
/* Ethereum address derivation — every value is really computed        */
/* (secp256k1 + Keccak-256 via @noble/*), not scripted demo data.      */
/* ------------------------------------------------------------------ */

const ACCENT: Tone = "amber";

/** Shared footprint for HexBlock and PendingBlock so a step's box doesn't
 *  change size — or shift the rest of the grid — once its value is
 *  generated. Tall enough for the longest value shown (the 128-hex-char
 *  public key) so every box renders at the same height. */
const BLOCK_SIZE = "min-h-[88px] p-3";

function HexBlock({
  bytes,
  tone,
  highlightLast,
  /** only an actual address gets the 0x prefix — private keys, public keys,
   *  hashes and RLP bytes are just shown as raw hex */
  address,
}: {
  bytes: Uint8Array;
  tone: Tone;
  /** tint the last N bytes to show which slice carries forward */
  highlightLast?: number;
  address?: boolean;
}) {
  const groups = toHex(bytes).match(/.{2}/g) ?? [];
  const highlightFrom = highlightLast ? groups.length - highlightLast : -1;
  return (
    <div
      className={`${BLOCK_SIZE} flex items-center break-all rounded-lg border font-mono text-[13px] leading-relaxed`}
      style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
    >
      <div>
        {address && <span className="text-muted-2">0x</span>}
        {groups.map((g, i) => (
          <span
            key={i}
            className="text-fg"
            style={
              highlightFrom >= 0 && i >= highlightFrom
                ? { color: toneVar(tone, "stroke"), fontWeight: 700 }
                : undefined
            }
          >
            {g}
          </span>
        ))}
      </div>
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

/** One row of the pipeline — label + its own generate button(s), value
 *  hidden behind a "pending…" placeholder until that step has been run. */
function Field({
  label,
  index,
  step,
  tone,
  actions,
  /** skip the "pending…" gate — for a field that's directly editable from the start */
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
/* Slide 1 · Externally owned address                                  */
/* ------------------------------------------------------------------ */

type Keypair = {
  priv: Uint8Array;
  pub: Uint8Array;
  hash: Uint8Array;
  address: Uint8Array;
};

function computeKeypair(priv: Uint8Array): Keypair {
  const pub = publicKeyFromPrivate(priv);
  const hash = keccak256(pub);
  const address = hash.slice(-20);
  return { priv, pub, hash, address };
}

function generateKeypair(): Keypair {
  return computeKeypair(randomPrivateKey());
}

const EOA_STEPS = [
  {
    label: "1 · Private key",
    desc: "32 cryptographically random bytes. This is the only secret — whoever holds it controls the address.",
  },
  {
    label: "2 · Public key (ECDSA)",
    desc: "Multiply the private key by the secp256k1 curve's generator point. One-way: trivial forward, computationally infeasible to reverse.",
  },
  {
    label: "3 · Keccak-256 hash",
    desc: "Hash the 64-byte public key (X‖Y coordinates, uncompressed-prefix byte dropped) with Keccak-256 to get a 32-byte digest.",
  },
  {
    label: "4 · Address",
    desc: "Keep only the last 20 bytes of the digest. Prefixed with 0x, that's the externally owned address (EOA).",
  },
];

export function EoaAddressSlide(_: SlideProps) {
  const [kp, setKp] = useState<Keypair>(() => generateKeypair());
  const [privInput, setPrivInput] = useState(() => toHex(kp.priv));
  const [privError, setPrivError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);

  const regenerate = () => {
    const next = generateKeypair();
    setKp(next);
    setPrivInput(toHex(next.priv));
    setPrivError(null);
    setStep(0);
  };

  const applyCustomPriv = () => {
    const match = /^0x?([0-9a-fA-F]{64})$/.exec(privInput.trim());
    if (!match) {
      setPrivError("Enter a 32-byte private key: 64 hex characters.");
      return;
    }
    const bytes = Uint8Array.from(match[1].match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    if (!isValidPrivateKey(bytes)) {
      setPrivError("Not a valid secp256k1 private key (must be nonzero and less than the curve order).");
      return;
    }
    const next = computeKeypair(bytes);
    setKp(next);
    setPrivInput(match[1].toLowerCase());
    setPrivError(null);
    setStep(0);
  };

  return (
    <SlideShell
      kicker="Ethereum Addresses · 01 · Interactive"
      title={
        <>
          Externally owned <span className="text-grad-cool">address</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="grid flex-1 grid-cols-1 content-start gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <Field
                  label="Private key — 32 bytes"
                  index={0}
                  step={step}
                  tone={ACCENT}
                  alwaysOn
                  actions={<Btn primary onClick={regenerate}>Generate</Btn>}
                >
                  <input
                    value={privInput}
                    onChange={(e) => setPrivInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyCustomPriv();
                    }}
                    onBlur={applyCustomPriv}
                    placeholder="type your own private key (64 hex chars) or press Generate"
                    spellCheck={false}
                    className={`${BLOCK_SIZE} text-fg flex w-full items-center break-all rounded-lg border bg-transparent font-mono text-[13px] leading-relaxed outline-none`}
                    style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
                  />
                </Field>
                {privError && (
                  <div className="mt-1.5 text-xs" style={{ color: toneVar("rose", "stroke") }}>
                    {privError}
                  </div>
                )}
              </div>
              <Field
                label="Public key — ECDSA point (X‖Y, 64 bytes)"
                index={1}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(1)} disabled={step < 0}>Generate</Btn>}
              >
                <HexBlock bytes={kp.pub} tone={ACCENT} />
              </Field>
            </div>
            <div className="space-y-5">
              <Field
                label="Keccak-256(public key) — 32 bytes"
                index={2}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(2)} disabled={step < 1}>Generate</Btn>}
              >
                <HexBlock bytes={kp.hash} tone={ACCENT} highlightLast={step >= 3 ? 20 : undefined} />
              </Field>
              <Field
                label="Address = last 20 bytes"
                index={3}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(3)} disabled={step < 2}>Generate</Btn>}
              >
                <HexBlock bytes={kp.address} tone={ACCENT} address />
              </Field>
            </div>
          </div>

          <div className="text-muted min-h-[48px] text-base leading-relaxed">
            {step >= 0
              ? EOA_STEPS[step].desc
              : "Press each step's “Generate” button in order to derive a fresh address, one stage at a time."}
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · Contract address (CREATE)                                 */
/* ------------------------------------------------------------------ */

const CONTRACT_STEPS = [
  {
    label: "1 · Sender + nonce",
    desc: "The account sending the contract-creation transaction, and its nonce — the count of transactions it has already sent.",
  },
  {
    label: "2 · RLP encode",
    desc: "Serialize [sender, nonce] with Ethereum's RLP encoding — a compact, type-length-value byte format used throughout the protocol.",
  },
  {
    label: "3 · Keccak-256 hash",
    desc: "Hash the RLP bytes with Keccak-256 to get a 32-byte digest — same hash function as an EOA, over different input bytes.",
  },
  {
    label: "4 · Contract address",
    desc: "Keep only the last 20 bytes. Because it depends on the nonce, the same sender gets a new contract address on every deployment.",
  },
];

export function ContractAddressSlide(_: SlideProps) {
  const [sender, setSender] = useState<Uint8Array>(() => randomAddress());
  const [senderInput, setSenderInput] = useState(() => "0x" + toHex(sender));
  const [senderError, setSenderError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [step, setStep] = useState(-1);

  const pipeline = useMemo(() => {
    const rlp = rlpSenderNonce(sender, nonce);
    const hash = keccak256(rlp);
    const address = hash.slice(-20);
    return { rlp, hash, address };
  }, [sender, nonce]);

  const newSender = () => {
    const addr = randomAddress();
    setSender(addr);
    setSenderInput("0x" + toHex(addr));
    setSenderError(null);
    setNonce(0);
    setStep(0);
  };

  const applyCustomSender = () => {
    const match = /^0x?([0-9a-fA-F]{40})$/.exec(senderInput.trim());
    if (!match) {
      setSenderError("Enter a 20-byte address: 0x followed by 40 hex characters.");
      return;
    }
    const bytes = Uint8Array.from(match[1].match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    setSender(bytes);
    setSenderInput("0x" + match[1].toLowerCase());
    setSenderError(null);
    setNonce(0);
    setStep(0);
  };

  const incrementNonce = () => setNonce((n) => n + 1);

  return (
    <SlideShell
      kicker="Ethereum Addresses · 02 · Interactive"
      title={
        <>
          Contract <span className="text-grad-cool">address</span> (CREATE)
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="grid flex-1 grid-cols-1 content-start gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <Field
                  label="Sender address + nonce"
                  index={0}
                  step={step}
                  tone={ACCENT}
                  alwaysOn
                  actions={
                    <>
                      <Btn primary onClick={newSender}>Generate</Btn>
                      <Btn onClick={incrementNonce}>Nonce +1</Btn>
                    </>
                  }
                >
                  <div className="space-y-2">
                    <input
                      value={senderInput}
                      onChange={(e) => setSenderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyCustomSender();
                      }}
                      onBlur={applyCustomSender}
                      placeholder="0x… (type your own address or press Generate)"
                      spellCheck={false}
                      className={`${BLOCK_SIZE} text-fg flex w-full items-center break-all rounded-lg border bg-transparent font-mono text-[13px] leading-relaxed outline-none`}
                      style={{ borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") }}
                    />
                    <div className="text-fg font-mono text-sm">nonce = {nonce}</div>
                  </div>
                </Field>
                {senderError && (
                  <div className="mt-1.5 text-xs" style={{ color: toneVar("rose", "stroke") }}>
                    {senderError}
                  </div>
                )}
              </div>
              <Field
                label="RLP([sender, nonce])"
                index={1}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(1)} disabled={step < 0}>Generate</Btn>}
              >
                <HexBlock bytes={pipeline.rlp} tone={ACCENT} />
              </Field>
            </div>
            <div className="space-y-5">
              <Field
                label="Keccak-256(RLP) — 32 bytes"
                index={2}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(2)} disabled={step < 1}>Generate</Btn>}
              >
                <HexBlock bytes={pipeline.hash} tone={ACCENT} highlightLast={step >= 3 ? 20 : undefined} />
              </Field>
              <Field
                label="Contract address = last 20 bytes"
                index={3}
                step={step}
                tone={ACCENT}
                actions={<Btn onClick={() => setStep(3)} disabled={step < 2}>Generate</Btn>}
              >
                <HexBlock bytes={pipeline.address} tone={ACCENT} address />
              </Field>
            </div>
          </div>

          <div className="text-muted min-h-[48px] text-base leading-relaxed">
            {step >= 0
              ? CONTRACT_STEPS[step].desc
              : "Press each step's “Generate” button in order to derive the next contract's address, one stage at a time."}
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
