import { formatEther, formatUnits } from "ethers";

/** A tiny JSON-RPC 2.0 client plus the helpers the explorer slides need.
 *  Calls are made straight from the browser to whatever node URL the user pastes. */

export type RpcResult = {
  /** the exact JSON body that was POSTed */
  request: { jsonrpc: "2.0"; id: number; method: string; params: unknown[] };
  status: number;
  ms: number;
  /** response text exactly as the node sent it */
  raw: string;
  /** parsed response, if it was JSON */
  body: unknown;
};

export function parseNodeUrl(text: string): { url: string | null; error: string | null } {
  const t = text.trim();
  if (!t) return { url: null, error: null };
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return { url: null, error: "The URL must start with http:// or https://." };
    return { url: u.href, error: null };
  } catch {
    return { url: null, error: "That doesn’t look like a URL — try https://…" };
  }
}

export async function rpcCall(url: string, method: string, params: unknown[], id = 1): Promise<RpcResult> {
  const request = { jsonrpc: "2.0" as const, id, method, params };
  const started = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const raw = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = undefined;
  }
  return { request, status: res.status, ms: Math.round(performance.now() - started), raw, body };
}

/** Why a `fetch` to a node can fail before any response arrives. */
export function describeFetchError(url: string, e: unknown): string {
  const isHttpFromHttps =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http:") &&
    !/^http:\/\/(localhost|127\.0\.0\.1)/.test(url);
  if (isHttpFromHttps) {
    return "This page is served over https, so the browser blocks calls to a plain http:// node. Use an https:// URL.";
  }
  if (e instanceof TypeError) {
    return "The browser couldn’t reach that node. Common causes: the URL is wrong, the node is offline, or it doesn’t allow requests from web pages (CORS — a local node needs its CORS/allowed-origins option enabled).";
  }
  return e instanceof Error ? e.message : "The request failed.";
}

/* ------------------------------------------------------------------ */
/* Parameters: JSON-RPC quantities are hex strings without leading 0s  */
/* ------------------------------------------------------------------ */

export const BLOCK_TAGS = ["latest", "safe", "finalized", "earliest", "pending"] as const;

export function toQuantity(n: bigint): string {
  return `0x${n.toString(16)}`;
}

/** Turns what a person types ("latest", 1234, 0x4d2) into the value the node expects. */
export function normalizeBlockParam(text: string): { value: string | null; error: string | null } {
  const t = text.trim();
  if (!t) return { value: null, error: null };
  if ((BLOCK_TAGS as readonly string[]).includes(t.toLowerCase())) return { value: t.toLowerCase(), error: null };
  if (/^\d+$/.test(t)) return { value: toQuantity(BigInt(t)), error: null };
  if (/^0x[0-9a-fA-F]+$/.test(t)) return { value: toQuantity(BigInt(t)), error: null };
  return { value: null, error: "Use a block number (123 or 0x7b) or a tag: latest, safe, finalized, earliest, pending." };
}

export const isTxHash = (s: string) => /^0x[0-9a-fA-F]{64}$/.test(s.trim());

/* ------------------------------------------------------------------ */
/* Reading responses                                                   */
/* ------------------------------------------------------------------ */

export type RpcOutcome =
  | { kind: "result"; result: unknown }
  | { kind: "error"; code: number; message: string }
  | { kind: "invalid"; message: string };

export function outcomeOf(r: RpcResult): RpcOutcome {
  const b = r.body as { result?: unknown; error?: { code?: number; message?: string } } | undefined;
  if (!b || typeof b !== "object") {
    return { kind: "invalid", message: `HTTP ${r.status} — the node didn’t return JSON.` };
  }
  if (b.error) return { kind: "error", code: b.error.code ?? 0, message: b.error.message ?? "Unknown error" };
  if ("result" in b) return { kind: "result", result: b.result };
  return { kind: "invalid", message: "The response has neither a result nor an error." };
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-fA-F]*$/.test(v);

export function hexToBigInt(v: unknown): bigint | null {
  return isHex(v) && v.length > 2 ? BigInt(v) : v === "0x" ? 0n : null;
}

export const fmtInt = (n: bigint) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function fmtEth(v: unknown): string {
  const n = hexToBigInt(v);
  if (n === null) return "—";
  const s = formatEther(n);
  return `${s.endsWith(".0") ? s.slice(0, -2) : s} ETH`;
}

export function fmtGwei(v: unknown): string {
  const n = hexToBigInt(v);
  if (n === null) return "—";
  const s = formatUnits(n, "gwei");
  return `${s.endsWith(".0") ? s.slice(0, -2) : s} gwei`;
}

export function fmtTimestamp(v: unknown): string {
  const n = hexToBigInt(v);
  return n === null ? "—" : new Date(Number(n) * 1000).toUTCString();
}

/** extraData is usually a short text tag (client name / builder); show it if it reads as text. */
export function extraDataText(v: unknown): string | null {
  if (!isHex(v) || v.length <= 2) return null;
  const bytes = v.slice(2).match(/.{2}/g)!.map((h) => parseInt(h, 16));
  return bytes.every((b) => b >= 32 && b < 127) ? String.fromCharCode(...bytes) : null;
}

export const TX_TYPES: Record<number, string> = {
  0: "legacy",
  1: "access list (EIP-2930)",
  2: "dynamic fee (EIP-1559)",
  3: "blob (EIP-4844)",
  4: "set-code (EIP-7702)",
};

/** A few selectors worth naming when they show up in a transaction's input. */
export const KNOWN_SELECTORS: Record<string, string> = {
  a9059cbb: "transfer(address,uint256)",
  "23b872dd": "transferFrom(address,address,uint256)",
  "095ea7b3": "approve(address,uint256)",
  "70a08231": "balanceOf(address)",
  d0e30db0: "deposit()",
  "2e1a7d4d": "withdraw(uint256)",
  "12065fe0": "getBalance()",
  "6f9fb98a": "getContractBalance()",
  "222907a1": "issue_cert(string,string,string,string)",
  "8f2b91ea": "certificates(string)",
};

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function curlCommand(url: string, request: RpcResult["request"]): string {
  return `curl -s -X POST -H 'content-type: application/json' --data ${shellQuote(JSON.stringify(request))} ${shellQuote(url)}`;
}
