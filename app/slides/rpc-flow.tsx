"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Note } from "../components/chain-ui";
import { Btn } from "../components/flow-kit";
import { Segmented } from "../components/pipeline";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import {
  BLOCK_TAGS,
  KNOWN_SELECTORS,
  TX_TYPES,
  curlCommand,
  describeFetchError,
  extraDataText,
  fmtEth,
  fmtGwei,
  fmtInt,
  fmtTimestamp,
  hexToBigInt,
  isTxHash,
  normalizeBlockParam,
  outcomeOf,
  parseNodeUrl,
  rpcCall,
  type RpcResult,
} from "../lib/jsonrpc";

const ACCENT: Tone = "cyan";

const NODES = [
  { label: "Hoodi (public)", url: "https://ethereum-hoodi-rpc.publicnode.com" },
  { label: "Sepolia (public)", url: "https://ethereum-sepolia-rpc.publicnode.com" },
  { label: "Mainnet (public)", url: "https://ethereum-rpc.publicnode.com" },
  { label: "Local node", url: "http://127.0.0.1:8545" },
];

const inputClass = "text-fg w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[14px] outline-none";
const inputStyle = { borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") };

/* ---------- small session-scoped store: node URL + hand-offs between the slides ---------- */

const readStore = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStore = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode — the value just won't carry over */
  }
};
const removeStore = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

function useNodeUrl() {
  const [url, setUrl] = useState(() => readStore("rpc-url") ?? NODES[0].url);
  const update = (v: string) => {
    setUrl(v);
    writeStore("rpc-url", v);
  };
  return [url, update] as const;
}

/* ---------- shared building blocks ---------- */

function NodeField({ url, onChange }: { url: string; onChange: (v: string) => void }) {
  const parsed = parseNodeUrl(url);
  return (
    <div className="space-y-2">
      <div className="text-muted-2 font-mono text-[11px]">JSON-RPC URL of the node</div>
      <input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="https://… (paste your node or provider URL)"
        aria-label="JSON-RPC URL"
        className={inputClass}
        style={inputStyle}
      />
      {parsed.error && (
        <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
          {parsed.error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {NODES.map((n) => (
          <button
            key={n.url}
            onClick={() => onChange(n.url)}
            className="rounded-full border px-3 py-1 font-mono text-xs transition"
            style={{
              borderColor: toneVar(ACCENT, "border"),
              background: url.trim() === n.url ? toneVar(ACCENT, "strong-wash") : "transparent",
              color: toneVar(ACCENT, "stroke"),
            }}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const DISPLAY_LIMIT = 30000;

function CodeBox({ title, text, note }: { title: string; text: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  const shown = text.length > DISPLAY_LIMIT ? `${text.slice(0, DISPLAY_LIMIT)}\n… (cut for display — Copy has all ${fmtInt(BigInt(text.length))} characters)` : text;
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="shrink-0 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-2 font-mono text-[11px] uppercase tracking-[0.25em]">
          {title}
          {note && <span className="normal-case tracking-normal"> · {note}</span>}
        </div>
        <Btn onClick={copy}>{copied ? "Copied" : "Copy"}</Btn>
      </div>
      <pre
        className="max-h-72 overflow-auto rounded-lg border p-3 font-mono text-[12px] leading-relaxed"
        style={inputStyle}
      >
        {shown}
      </pre>
    </div>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: toneVar(ACCENT, "border") }}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-col gap-0.5 border-b px-3 py-1.5 last:border-b-0 sm:flex-row sm:gap-4"
          style={{ borderColor: toneVar(ACCENT, "border") }}
        >
          <span className="text-muted-2 w-44 shrink-0 font-mono text-[11px] sm:pt-0.5">{k}</span>
          <span className="text-fg min-w-0 break-all font-mono text-[12.5px]">{v}</span>
        </div>
      ))}
    </div>
  );
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: RpcResult }
  | { kind: "error"; message: string };

const pretty = (r: RpcResult) => (r.body !== undefined ? JSON.stringify(r.body, null, 2) : r.raw);

/** Request preview, send button and the raw response — the same for both methods. */
function CallPanel({
  nodeUrl,
  request,
  ready,
  phase,
  onSend,
  children,
}: {
  nodeUrl: string | null;
  request: RpcResult["request"];
  ready: boolean;
  phase: Phase;
  onSend: () => void;
  /** the decoded view of a successful result */
  children: (result: unknown) => ReactNode;
}) {
  const [showCurl, setShowCurl] = useState(false);
  const loading = phase.kind === "loading";
  const outcome = phase.kind === "done" ? outcomeOf(phase.result) : null;
  return (
    <>
      <CodeBox title="Request — the body POSTed to the node" text={JSON.stringify(request, null, 2)} />
      <div className="flex flex-wrap items-center gap-2">
        <Btn primary onClick={onSend} disabled={!ready || loading}>
          {loading ? "Calling…" : "Send request"}
        </Btn>
        <Btn onClick={() => setShowCurl((v) => !v)}>{showCurl ? "Hide curl" : "Show as curl"}</Btn>
      </div>
      {showCurl && nodeUrl && (
        <div
          className="shrink-0 overflow-x-auto rounded-lg border p-3 font-mono text-[12px] whitespace-pre-wrap break-all"
          style={inputStyle}
        >
          {curlCommand(nodeUrl, request)}
        </div>
      )}

      {phase.kind === "error" && <Note tone="rose">{phase.message}</Note>}
      {phase.kind === "done" && (
        <>
          <CodeBox
            title="Response — exactly what the node sent back"
            text={pretty(phase.result)}
            note={`HTTP ${phase.result.status} · ${phase.result.ms} ms`}
          />
          {outcome?.kind === "error" && (
            <Note tone="rose">
              The node returned an error <span className="font-mono">{outcome.code}</span>: {outcome.message}
            </Note>
          )}
          {outcome?.kind === "invalid" && <Note tone="rose">{outcome.message}</Note>}
          {outcome?.kind === "result" && children(outcome.result)}
        </>
      )}
    </>
  );
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "—");
const int = (v: unknown): string => {
  const n = hexToBigInt(v);
  return n === null ? "—" : fmtInt(n);
};

/* ------------------------------------------------------------------ */
/* Slide 1 · eth_getBlockByNumber                                      */
/* ------------------------------------------------------------------ */

function BlockSummary({ block, onOpenTx }: { block: Record<string, unknown>; onOpenTx: (hash: string) => void }) {
  const gasUsed = hexToBigInt(block.gasUsed);
  const gasLimit = hexToBigInt(block.gasLimit);
  const txs = Array.isArray(block.transactions) ? block.transactions : [];
  const shownTxs = txs.slice(0, 20);
  const tag = extraDataText(block.extraData);
  return (
    <div className="shrink-0 space-y-3">
      <div className="text-muted-2 font-mono text-[11px] uppercase tracking-[0.25em]">Decoded</div>
      <Rows
        rows={[
          ["number", `${int(block.number)}  (${str(block.number)})`],
          ["hash", str(block.hash)],
          ["parentHash", str(block.parentHash)],
          ["timestamp", fmtTimestamp(block.timestamp)],
          ["miner / fee recipient", str(block.miner)],
          [
            "gas used / limit",
            gasUsed !== null && gasLimit !== null && gasLimit > 0n
              ? `${fmtInt(gasUsed)} / ${fmtInt(gasLimit)}  (${(Number((gasUsed * 10000n) / gasLimit) / 100).toFixed(1)}% full)`
              : "—",
          ],
          ["baseFeePerGas", fmtGwei(block.baseFeePerGas)],
          ["extraData", tag ? `“${tag}”  (${str(block.extraData)})` : str(block.extraData)],
          ["transactions", String(txs.length)],
          ...(Array.isArray(block.withdrawals)
            ? ([["withdrawals", String(block.withdrawals.length)]] as [string, ReactNode][])
            : []),
        ]}
      />
      {txs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-muted-2 font-mono text-[11px] uppercase tracking-[0.25em]">
            Transactions — click one to look it up
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: toneVar(ACCENT, "border") }}>
            {shownTxs.map((t, i) => {
              const tx = obj(t);
              const hash = typeof t === "string" ? t : str(tx.hash);
              return (
                <button
                  key={hash + i}
                  onClick={() => onOpenTx(hash)}
                  className="row-hover flex w-full flex-col gap-0.5 border-b px-3 py-1.5 text-left last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
                  style={{ borderColor: toneVar(ACCENT, "border") }}
                >
                  <span className="text-muted-2 w-8 shrink-0 font-mono text-[11px]">{i}</span>
                  <span className="text-fg min-w-0 flex-1 break-all font-mono text-[12px]">{hash}</span>
                  {typeof t !== "string" && (
                    <span className="text-muted-2 shrink-0 font-mono text-[11px]">{fmtEth(tx.value)}</span>
                  )}
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: toneVar(ACCENT, "stroke") }}>
                    look up →
                  </span>
                </button>
              );
            })}
          </div>
          {txs.length > shownTxs.length && (
            <div className="text-muted-2 text-xs">+ {txs.length - shownTxs.length} more in the response above</div>
          )}
        </div>
      )}
    </div>
  );
}

export function BlockSlide({ goTo }: SlideProps) {
  const [url, setUrl] = useNodeUrl();
  const [handoff] = useState(() => readStore("rpc-block"));
  const [blockText, setBlockText] = useState(handoff ?? "latest");
  const [detail, setDetail] = useState<"hashes" | "full">("hashes");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const node = parseNodeUrl(url);
  const block = normalizeBlockParam(blockText);
  const request = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "eth_getBlockByNumber",
    params: [block.value ?? "<block>", detail === "full"],
  };

  const send = async () => {
    if (!node.url || block.value === null) return;
    setPhase({ kind: "loading" });
    try {
      setPhase({ kind: "done", result: await rpcCall(node.url, request.method, [block.value, detail === "full"]) });
    } catch (e) {
      setPhase({ kind: "error", message: describeFetchError(node.url, e) });
    }
  };

  // arriving from the transaction slide's "open block" — run the lookup straight away
  useEffect(() => {
    if (handoff !== null) {
      removeStore("rpc-block");
      void Promise.resolve().then(send);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SlideShell
      kicker="JSON-RPC · Interactive"
      title={
        <>
          <span className="text-grad-cool break-all">eth_getBlockByNumber</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Every Ethereum node speaks <span className="text-fg">JSON-RPC</span>: you POST a small JSON document naming a
            method and its parameters, and the node answers with a JSON result. Paste a node’s URL and call it yourself.
          </div>

          <NodeField url={url} onChange={setUrl} />

          <div className="space-y-2">
            <div className="text-muted-2 font-mono text-[11px]">block — a number or a tag</div>
            <input
              value={blockText}
              onChange={(e) => setBlockText(e.target.value)}
              spellCheck={false}
              placeholder="latest, 1234567 or 0x12d687"
              aria-label="Block number or tag"
              className={inputClass}
              style={inputStyle}
            />
            {block.error && (
              <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                {block.error}
              </div>
            )}
            {block.value !== null && block.value !== blockText.trim() && (
              <div className="text-muted-2 text-xs">
                Sent as <span className="font-mono">{block.value}</span> — block numbers travel as hex strings.
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {BLOCK_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setBlockText(t)}
                    className="rounded-full border px-3 py-1 font-mono text-xs transition"
                    style={{
                      borderColor: toneVar(ACCENT, "border"),
                      background: blockText.trim().toLowerCase() === t ? toneVar(ACCENT, "strong-wash") : "transparent",
                      color: toneVar(ACCENT, "stroke"),
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Segmented
                options={[
                  { value: "hashes", label: "hashes only" },
                  { value: "full", label: "full transactions" },
                ]}
                value={detail}
                onChange={setDetail}
                tone={ACCENT}
                ariaLabel="Transaction detail"
              />
            </div>
          </div>

          <CallPanel
            nodeUrl={node.url}
            request={request}
            ready={!!node.url && block.value !== null}
            phase={phase}
            onSend={send}
          >
            {(result) =>
              result === null ? (
                <Note tone="amber">
                  <span className="font-mono">result: null</span> — this node has no block with that number or tag (yet).
                </Note>
              ) : (
                <BlockSummary
                  block={obj(result)}
                  onOpenTx={(hash) => {
                    writeStore("rpc-tx-hash", hash);
                    goTo("rpc-tx");
                  }}
                />
              )
            }
          </CallPanel>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · eth_getTransactionByHash                                  */
/* ------------------------------------------------------------------ */

function TxSummary({ tx, onOpenBlock }: { tx: Record<string, unknown>; onOpenBlock: (n: string) => void }) {
  const pending = tx.blockNumber === null || tx.blockNumber === undefined;
  const type = hexToBigInt(tx.type);
  const input = typeof tx.input === "string" ? tx.input : "0x";
  const selector = input.length >= 10 ? input.slice(2, 10).toLowerCase() : null;
  const known = selector ? KNOWN_SELECTORS[selector] : null;
  const creation = tx.to === null;
  const rows: [string, ReactNode][] = [
    ["hash", str(tx.hash)],
    ["status", pending ? "pending — not in a block yet (still in the mempool)" : "included in a block"],
    [
      "block",
      pending ? (
        "—"
      ) : (
        <span>
          {int(tx.blockNumber)} ({str(tx.blockNumber)}){" "}
          <button
            onClick={() => onOpenBlock(str(tx.blockNumber))}
            className="underline-offset-2 hover:underline"
            style={{ color: toneVar(ACCENT, "stroke") }}
          >
            open block →
          </button>
        </span>
      ),
    ],
    ["transactionIndex", pending ? "—" : int(tx.transactionIndex)],
    ["type", type === null ? "—" : `${type} — ${TX_TYPES[Number(type)] ?? "unknown"}`],
    ["from", str(tx.from)],
    ["to", creation ? "null — this transaction creates a contract" : str(tx.to)],
    ["value", `${fmtEth(tx.value)}  (${int(tx.value)} wei)`],
    ["nonce", int(tx.nonce)],
    ["gas limit", int(tx.gas)],
    ...(tx.gasPrice !== undefined ? ([["gasPrice", fmtGwei(tx.gasPrice)]] as [string, ReactNode][]) : []),
    ...(tx.maxFeePerGas !== undefined
      ? ([
          ["maxFeePerGas", fmtGwei(tx.maxFeePerGas)],
          ["maxPriorityFeePerGas", fmtGwei(tx.maxPriorityFeePerGas)],
        ] as [string, ReactNode][])
      : []),
    ...(tx.chainId !== undefined ? ([["chainId", int(tx.chainId)]] as [string, ReactNode][]) : []),
    [
      creation ? "input (init code)" : "input (calldata)",
      input === "0x"
        ? "0x — empty: a plain ETH transfer"
        : `${(input.length - 2) / 2} bytes${
            selector && !creation ? ` · selector 0x${selector}${known ? ` = ${known}` : ""}` : ""
          }`,
    ],
  ];
  return (
    <div className="shrink-0 space-y-3">
      <div className="text-muted-2 font-mono text-[11px] uppercase tracking-[0.25em]">Decoded</div>
      <Rows rows={rows} />
      {input !== "0x" && (
        <div className="break-all rounded-lg border p-3 font-mono text-[12px]" style={inputStyle}>
          {selector && !creation ? (
            <>
              <span style={{ color: toneVar(ACCENT, "stroke"), fontWeight: 700 }}>{input.slice(0, 10)}</span>
              {input.slice(10, 1000)}
            </>
          ) : (
            input.slice(0, 1000)
          )}
          {input.length > 1000 && <span className="text-muted-2"> … ({input.length - 1000} more characters)</span>}
        </div>
      )}
    </div>
  );
}

export function TxSlide({ goTo }: SlideProps) {
  const [url, setUrl] = useNodeUrl();
  const [handoff] = useState(() => readStore("rpc-tx-hash"));
  const [hash, setHash] = useState(handoff ?? "");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const node = parseNodeUrl(url);
  const trimmed = hash.trim();
  const valid = isTxHash(trimmed);
  const request = {
    jsonrpc: "2.0" as const,
    id: 1,
    method: "eth_getTransactionByHash",
    params: [valid ? trimmed : trimmed || "<transaction hash>"],
  };

  const send = async () => {
    if (!node.url || !valid) return;
    setPhase({ kind: "loading" });
    try {
      setPhase({ kind: "done", result: await rpcCall(node.url, request.method, [trimmed]) });
    } catch (e) {
      setPhase({ kind: "error", message: describeFetchError(node.url, e) });
    }
  };

  // arriving from a block's transaction list — run the lookup straight away
  useEffect(() => {
    if (handoff !== null) {
      removeStore("rpc-tx-hash");
      void Promise.resolve().then(send);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SlideShell
      kicker="JSON-RPC · Interactive"
      title={
        <>
          <span className="text-grad-cool break-all">eth_getTransactionByHash</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            A transaction’s hash identifies it forever. Ask a node for the transaction behind a hash and it returns
            everything that was signed — plus, once it’s mined, where it landed. Get a hash by clicking a transaction on
            the previous slide, or paste one.
          </div>

          <NodeField url={url} onChange={setUrl} />

          <div className="space-y-2">
            <div className="text-muted-2 font-mono text-[11px]">transaction hash</div>
            <input
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              spellCheck={false}
              placeholder="0x… (66 characters)"
              aria-label="Transaction hash"
              className={inputClass}
              style={inputStyle}
            />
            {trimmed !== "" && !valid && (
              <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                A transaction hash is 0x followed by 64 hex characters.
              </div>
            )}
          </div>

          <CallPanel nodeUrl={node.url} request={request} ready={!!node.url && valid} phase={phase} onSend={send}>
            {(result) =>
              result === null ? (
                <Note tone="amber">
                  <span className="font-mono">result: null</span> — this node doesn’t know a transaction with that hash.
                  It may be on a different network, or not yet seen by this node.
                </Note>
              ) : (
                <TxSummary
                  tx={obj(result)}
                  onOpenBlock={(n) => {
                    writeStore("rpc-block", n);
                    goTo("rpc");
                  }}
                />
              )
            }
          </CallPanel>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
