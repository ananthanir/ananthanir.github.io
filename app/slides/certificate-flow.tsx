"use client";

import { useState } from "react";
import { ContractBadge, ExternalLink, Note, WalletBar } from "../components/chain-ui";
import { Btn } from "../components/flow-kit";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { encodeCall, partsToHex } from "../lib/abi";
import {
  CONTRACT_ADDRESS,
  fetchCertificate,
  fetchCertificateWithRetry,
  issueCertificate,
  type Certificate,
} from "../lib/certichain";
import { HOODI, describeError, explorerAddress, explorerTx, shortAddress } from "../lib/hoodi";
import { useWallet } from "../lib/wallet";

const ACCENT: Tone = "violet";

const inputClass = "text-fg w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[14px] outline-none";
const inputStyle = { borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") };

function CertificateCard({ cert, caption }: { cert: Certificate; caption: string }) {
  const dash = (v: string) => v || "—";
  return (
    <div
      className="rounded-2xl border-2 p-6 text-center sm:p-8"
      style={{ borderColor: toneVar(ACCENT, "stroke"), background: toneVar(ACCENT, "wash") }}
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.35em]" style={{ color: toneVar(ACCENT, "stroke") }}>
        Certificate of completion
      </div>
      <div className="text-fg mt-4 break-words text-2xl font-semibold sm:text-3xl">{dash(cert.name)}</div>
      <div className="text-muted mt-3 text-sm">has successfully completed</div>
      <div className="text-fg mt-1 break-words text-lg font-medium">{dash(cert.courseName)}</div>
      <div className="text-muted mt-5 flex flex-wrap justify-center gap-x-8 gap-y-1 font-mono text-xs">
        <span>Issued {dash(cert.issueDate)}</span>
        <span className="break-all">ID {dash(cert.certificateId)}</span>
      </div>
      <div
        className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full border px-4 py-1.5 text-xs"
        style={{ borderColor: toneVar("emerald", "border"), color: toneVar("emerald", "stroke") }}
      >
        <span>✓ {caption}</span>
        <ExternalLink tone={ACCENT} href={explorerAddress(CONTRACT_ADDRESS)}>{shortAddress(CONTRACT_ADDRESS)}</ExternalLink>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Verify                                                    */
/* ------------------------------------------------------------------ */

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; cert: Certificate }
  | { kind: "missing"; id: string }
  | { kind: "error"; message: string };

export function VerifySlide(_: SlideProps) {
  const [id, setId] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const key = id.trim();
  const loading = state.kind === "loading";

  const search = async () => {
    if (!key || loading) return;
    setState({ kind: "loading" });
    try {
      const cert = await fetchCertificate(key);
      setState(cert ? { kind: "found", cert } : { kind: "missing", id: key });
    } catch (e) {
      setState({ kind: "error", message: describeError(e) });
    }
  };

  const calldata = key
    ? partsToHex(encodeCall("certificates(string)", [{ name: "key", type: "string", value: key }]))
    : null;

  return (
    <SlideShell
      kicker="Certificates · Hoodi testnet"
      title={
        <>
          Verify a <span className="text-grad-cool">certificate</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Enter a certificate ID to look it up straight from the blockchain. Reading is free and needs no wallet —
            any node can answer.
          </div>
          <ContractBadge label="CertiChain" address={CONTRACT_ADDRESS} tone={ACCENT} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
              }}
              spellCheck={false}
              placeholder="Certificate ID, e.g. KBA-2026-0001"
              aria-label="Certificate ID"
              className={inputClass}
              style={inputStyle}
            />
            <Btn primary onClick={search} disabled={!key || loading}>
              {loading ? "Searching…" : "Search"}
            </Btn>
          </div>

          {state.kind === "found" && <CertificateCard cert={state.cert} caption="Verified on-chain · contract" />}
          {state.kind === "missing" && (
            <Note tone="amber">
              No certificate is stored under <span className="font-mono">“{state.id}”</span>. IDs must match exactly —
              including capitals and spaces.
            </Note>
          )}
          {state.kind === "error" && (
            <Note tone="rose">Couldn’t reach the Hoodi network: {state.message}</Note>
          )}

          {calldata && (
            <details className="text-sm">
              <summary className="text-muted-2 cursor-pointer font-mono text-xs uppercase tracking-[0.2em]">
                Under the hood — the call this sends
              </summary>
              <div className="text-muted mt-2 space-y-2 leading-relaxed">
                <p>
                  Search runs <span className="font-mono">certificates(string)</span> as an{" "}
                  <span className="font-mono">eth_call</span>: a node executes the contract’s code against its current
                  state and returns the result. Nothing is written, so it costs no gas.
                </p>
                <div
                  className="break-all rounded-lg border p-3 font-mono text-[12px]"
                  style={inputStyle}
                >
                  <div>
                    <span className="text-muted-2">to </span>
                    <ExternalLink href={explorerAddress(CONTRACT_ADDRESS)} tone={ACCENT}>
                      {CONTRACT_ADDRESS}
                    </ExternalLink>
                  </div>
                  <div>
                    <span className="text-muted-2">data </span>
                    <span style={{ color: toneVar(ACCENT, "stroke"), fontWeight: 700 }}>0x{calldata.slice(0, 8)}</span>
                    {calldata.slice(8)}
                  </div>
                </div>
              </div>
            </details>
          )}
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · Issue                                                     */
/* ------------------------------------------------------------------ */

type Phase =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "pending"; hash: string }
  | { kind: "done"; hash: string; blockNumber: number; cert: Certificate | null }
  | { kind: "error"; message: string };

export function IssueSlide(_: SlideProps) {
  const wallet = useWallet();
  const [name, setName] = useState("");
  const [certId, setCertId] = useState("");
  const [course, setCourse] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const filled = [name, certId, course, date].every((v) => v.trim() !== "");
  const onHoodi = wallet.chainId === HOODI.chainId;
  const busy = phase.kind === "confirming" || phase.kind === "pending";
  const canSend = filled && !!wallet.account && onHoodi && !busy;

  const blocker = !filled
    ? "Fill in all four fields."
    : !wallet.account
      ? "Connect MetaMask first."
      : !onHoodi
        ? "Switch MetaMask to the Hoodi testnet."
        : null;

  const issue = async () => {
    const cert: Certificate = {
      name: name.trim(),
      certificateId: certId.trim(),
      courseName: course.trim(),
      issueDate: date.trim(),
    };
    setPhase({ kind: "confirming" });
    try {
      // The contract has no "already exists" check — a repeated ID silently overwrites.
      const existing = await fetchCertificate(cert.certificateId).catch(() => null);
      if (
        existing &&
        !window.confirm(
          `A certificate with ID “${cert.certificateId}” already exists (issued to ${existing.name}). Issuing again will overwrite it. Continue?`,
        )
      ) {
        setPhase({ kind: "idle" });
        return;
      }
      const { hash, blockNumber } = await issueCertificate(cert, (h) => setPhase({ kind: "pending", hash: h }));
      setPhase({ kind: "done", hash, blockNumber, cert: null });
      const stored = await fetchCertificateWithRetry(cert.certificateId).catch(() => null);
      setPhase({ kind: "done", hash, blockNumber, cert: stored });
    } catch (e) {
      setPhase({ kind: "error", message: describeError(e) });
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, hint?: string) => (
    <div className="space-y-1">
      <div className="text-muted-2 font-mono text-[11px]">{label}</div>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        disabled={busy}
        spellCheck={false}
        placeholder={placeholder}
        aria-label={label}
        className={inputClass}
        style={inputStyle}
      />
      {hint && <div className="text-muted-2 text-xs">{hint}</div>}
    </div>
  );

  return (
    <SlideShell
      kicker="Certificates · Hoodi testnet"
      title={
        <>
          Issue a <span className="text-grad-cool">certificate</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Writing to the blockchain is a transaction: MetaMask signs it, you pay a little gas in Hoodi test ETH, and
            once it’s mined the certificate is public and permanent.
          </div>
          <ContractBadge label="CertiChain" address={CONTRACT_ADDRESS} tone={ACCENT} />

          <WalletBar wallet={wallet} tone={ACCENT} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {field("name", name, setName, "Asha Menon")}
            {field("course_name", course, setCourse, "Blockchain Fundamentals")}
            {field("certificate_id — the key", certId, setCertId, "KBA-2026-0001", "Anyone can look it up by this ID.")}
            {field("issue_date", date, setDate, "2026-09-25")}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Btn primary onClick={issue} disabled={!canSend}>
              {busy ? "Working…" : "Issue certificate"}
            </Btn>
            {blocker && !busy && <span className="text-muted-2 text-sm">{blocker}</span>}
          </div>

          {phase.kind === "confirming" && <Note>Check MetaMask and confirm the transaction…</Note>}
          {phase.kind === "pending" && (
            <Note tone="amber">
              Transaction sent — waiting for it to be mined.{" "}
              <ExternalLink tone={ACCENT} href={explorerTx(phase.hash)}>View on explorer</ExternalLink>
            </Note>
          )}
          {phase.kind === "done" && (
            <>
              <Note tone="emerald">
                Confirmed in block {phase.blockNumber}.{" "}
                <ExternalLink tone={ACCENT} href={explorerTx(phase.hash)}>View transaction</ExternalLink>
              </Note>
              {phase.cert ? (
                <CertificateCard cert={phase.cert} caption="Read back from the chain · contract" />
              ) : (
                <Note>
                  The transaction is confirmed, but the read node hasn’t returned the record yet — try the Verify slide in a
                  few seconds.
                </Note>
              )}
            </>
          )}
          {phase.kind === "error" && <Note tone="rose">{phase.message}</Note>}

          <div className="text-muted-2 text-xs leading-relaxed">
            This is a demo contract: it has no access control, so anyone can issue a certificate, and issuing an ID that
            already exists overwrites the old record. It needs Hoodi test ETH for gas.
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
