import { keccak256, toHex } from "./eth";

/** Function selectors and ABI argument encoding, written from the ABI spec:
 *  static types are written in place; dynamic types put an offset in the
 *  "head" and their data (length + contents) in the "tail". Every encoding
 *  step is kept as a labelled 32-byte word so the slides can show it. */

const utf8 = (s: string) => new TextEncoder().encode(s);

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function uint256Word(n: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = n;
  for (let i = 31; i >= 0 && v > 0n; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Signatures → selectors                                              */
/* ------------------------------------------------------------------ */

const MODIFIERS = /\b(memory|calldata|storage|payable|indexed)\b/g;
const ALIASES: Record<string, string> = {
  uint: "uint256",
  int: "int256",
  byte: "bytes1",
  fixed: "fixed128x18",
  ufixed: "ufixed128x18",
};
const KNOWN_BASE = /^(u?int\d*|address|bool|string|bytes\d*|u?fixed(\d+x\d+)?|function)$/;

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== "" || out.length > 0) out.push(cur);
  return out.map((x) => x.trim());
}

function matchingParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    if (s[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** One parameter → its canonical type: drops the name and data location,
 *  spells `uint` as `uint256`. Returns any warning about the type too. */
function canonicalType(param: string, warnings: string[]): string {
  const p = param.replace(MODIFIERS, " ").replace(/\s+/g, " ").trim();
  if (!p) throw new Error("A parameter is empty.");
  let base: string;
  let rest: string;
  if (p.startsWith("(")) {
    const end = matchingParen(p, 0);
    if (end < 0) throw new Error("Unbalanced parentheses in a tuple type.");
    base = `(${splitTopLevel(p.slice(1, end)).map((x) => canonicalType(x, warnings)).join(",")})`;
    rest = p.slice(end + 1).trim();
  } else {
    const m = /^([A-Za-z_$][\w$]*)/.exec(p);
    if (!m) throw new Error(`Can’t read a type from “${p}”.`);
    base = ALIASES[m[1]] ?? m[1];
    if (!KNOWN_BASE.test(base)) {
      warnings.push(`“${m[1]}” isn’t a built-in type — a struct or contract type would need its tuple form.`);
    }
    rest = p.slice(m[1].length).trim();
  }
  const dims = /^((?:\[\d*\])*)/.exec(rest)?.[1] ?? "";
  return base + dims;
}

export type ParsedParam = { original: string; type: string };
export type ParsedSignature =
  | { ok: true; name: string; params: ParsedParam[]; canonical: string; warnings: string[] }
  | { ok: false; error: string };

/** Accepts a Solidity function header (`function f(uint x) public …`) or a
 *  bare `f(uint x)`; ignores visibility, mutability and returns. */
export function parseDeclaration(text: string): ParsedSignature {
  const t = text.trim().replace(/^function\s+/, "");
  const open = t.indexOf("(");
  if (open < 1) return { ok: false, error: "Write it like name(type arg, …)." };
  const name = t.slice(0, open).trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return { ok: false, error: `“${name}” isn’t a valid function name.` };
  const close = matchingParen(t, open);
  if (close < 0) return { ok: false, error: "Missing the closing parenthesis." };
  const warnings: string[] = [];
  try {
    const params = splitTopLevel(t.slice(open + 1, close)).map((original) => ({
      original,
      type: canonicalType(original, warnings),
    }));
    return { ok: true, name, params, canonical: `${name}(${params.map((p) => p.type).join(",")})`, warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn’t parse the parameters." };
  }
}

export function signatureBytes(signature: string): Uint8Array {
  return utf8(signature);
}

export function signatureHash(signature: string): Uint8Array {
  return keccak256(utf8(signature));
}

export function selectorOf(signature: string): Uint8Array {
  return signatureHash(signature).slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Argument encoding                                                   */
/* ------------------------------------------------------------------ */

export type PartKind = "selector" | "offset" | "static" | "length" | "data";
export type Section = "selector" | "head" | "tail";

/** One labelled piece of encoded data: the 4-byte selector or a 32-byte word. */
export type Part = {
  kind: PartKind;
  section?: Section;
  /** which argument it belongs to (drives colouring) */
  arg: string;
  label: string;
  note: string;
  bytes: Uint8Array;
  /** which end holds zero padding */
  pad: "left" | "right" | "none";
  /** absolute byte position in the encoded data */
  pos: number;
  /** offsets only: absolute position of the data this offset points to */
  pointsTo?: number;
};

export type Arg = { name: string; type: string; value: unknown };

type Item = { type: string; value: unknown; arg: string; label: string };

function part(
  kind: PartKind,
  arg: string,
  label: string,
  note: string,
  bytes: Uint8Array,
  pad: Part["pad"],
): Part {
  return { kind, arg, label, note, bytes, pad, pos: 0 };
}

const arrayOf = (t: string) => {
  const m = /^(.*)\[(\d*)\]$/.exec(t);
  return m ? { elem: m[1], len: m[2] === "" ? null : Number(m[2]) } : null;
};

export function isDynamic(type: string): boolean {
  if (type === "string" || type === "bytes") return true;
  const a = arrayOf(type);
  return a ? a.len === null || isDynamic(a.elem) : false;
}

function staticWords(type: string): number {
  const a = arrayOf(type);
  return a ? (a.len as number) * staticWords(a.elem) : 1;
}

function encodeBasic(type: string, value: unknown): { bytes: Uint8Array; pad: Part["pad"]; note: string } {
  if (type === "address") {
    const bytes = new Uint8Array(32);
    bytes.set(hexToBytes(String(value).replace(/^0x/i, "").toLowerCase()), 12);
    return { bytes, pad: "left", note: "address — 20 bytes, left-padded with 12 zero bytes" };
  }
  if (type === "bool") {
    return { bytes: uint256Word(value ? 1n : 0n), pad: "left", note: "bool — 0 or 1, left-padded" };
  }
  if (/^uint\d*$/.test(type)) {
    return { bytes: uint256Word(BigInt(value as bigint)), pad: "left", note: `${type} — big-endian, left-padded to 32 bytes` };
  }
  if (/^int\d*$/.test(type)) {
    const v = BigInt(value as bigint);
    return { bytes: uint256Word(v < 0n ? (1n << 256n) + v : v), pad: "left", note: `${type} — two’s complement, sign-extended` };
  }
  const fixed = /^bytes(\d+)$/.exec(type);
  if (fixed) {
    const bytes = new Uint8Array(32);
    bytes.set(hexToBytes(String(value).replace(/^0x/i, "")));
    return { bytes, pad: "right", note: `${type} — right-padded with zero bytes` };
  }
  throw new Error(`Unsupported type ${type}`);
}

function encodeStatic(item: Item): Part[] {
  const a = arrayOf(item.type);
  if (a && a.len !== null) {
    return (item.value as unknown[]).flatMap((v, i) =>
      encodeStatic({ type: a.elem, value: v, arg: item.arg, label: `${item.label}[${i}]` }),
    );
  }
  const { bytes, pad, note } = encodeBasic(item.type, item.value);
  return [part("static", item.arg, item.label, note, bytes, pad)];
}

/** The tail data of a dynamic value; `base` is its absolute start position. */
function encodeDynamic(item: Item, base: number): Part[] {
  const { type, value, arg, label } = item;
  if (type === "string" || type === "bytes") {
    const data = type === "string" ? utf8(String(value)) : hexToBytes(String(value).replace(/^0x/i, ""));
    const parts = [
      part("length", arg, `${label}.length`, `${type} length, in bytes`, uint256Word(BigInt(data.length)), "left"),
    ];
    for (let i = 0; i < data.length; i += 32) {
      const chunk = new Uint8Array(32);
      chunk.set(data.slice(i, i + 32));
      const last = Math.min(i + 32, data.length);
      parts.push(
        part(
          "data",
          arg,
          `${label} bytes ${i}–${last - 1}`,
          type === "string" ? "UTF-8 text, right-padded with zero bytes" : "raw bytes, right-padded with zero bytes",
          chunk,
          "right",
        ),
      );
    }
    return parts;
  }
  const a = arrayOf(type)!;
  const items = (value as unknown[]).map((v, i) => ({ type: a.elem, value: v, arg, label: `${label}[${i}]` }));
  if (a.len === null) {
    return [
      part("length", arg, `${label}.length`, "number of elements", uint256Word(BigInt(items.length)), "left"),
      ...encodeTuple(items, base + 32, "the array’s elements", false),
    ];
  }
  return encodeTuple(items, base, "the array’s elements", false);
}

/** Head/tail encoding of a list of values. Offsets are counted from `base`. */
function encodeTuple(items: Item[], base: number, scope: string, top: boolean): Part[] {
  const headSize = items.reduce((n, it) => n + (isDynamic(it.type) ? 32 : staticWords(it.type) * 32), 0);
  let cursor = headSize;
  const head: Part[] = [];
  const tail: Part[] = [];
  for (const it of items) {
    if (isDynamic(it.type)) {
      const data = encodeDynamic(it, base + cursor);
      const offset = part(
        "offset",
        it.arg,
        `${it.label} offset`,
        `where ${it.label}’s data starts: ${cursor} (0x${cursor.toString(16)}) bytes from the start of ${scope}`,
        uint256Word(BigInt(cursor)),
        "left",
      );
      offset.pointsTo = base + cursor;
      head.push(offset);
      tail.push(...data);
      cursor += data.reduce((n, p) => n + p.bytes.length, 0);
    } else {
      head.push(...encodeStatic(it));
    }
  }
  if (top) {
    head.forEach((p) => (p.section = "head"));
    tail.forEach((p) => (p.section = "tail"));
  }
  return [...head, ...tail];
}

function finalize(parts: Part[]): Part[] {
  let pos = 0;
  for (const p of parts) {
    p.pos = pos;
    pos += p.bytes.length;
  }
  return parts;
}

const toItems = (args: Arg[]): Item[] => args.map((a) => ({ type: a.type, value: a.value, arg: a.name, label: a.name }));

/** Calldata for `signature(args…)`: 4-byte selector followed by the encoded arguments. */
export function encodeCall(signature: string, args: Arg[]): Part[] {
  const selector = part(
    "selector",
    "selector",
    signature,
    "first 4 bytes of keccak256 of the signature",
    selectorOf(signature),
    "none",
  );
  selector.section = "selector";
  return finalize([selector, ...encodeTuple(toItems(args), 4, "the arguments", true)]);
}

/** Return data for a function returning `args` — encoded exactly like arguments, with no selector. */
export function encodeReturn(args: Arg[]): Part[] {
  return finalize(encodeTuple(toItems(args), 0, "the return data", true));
}

export function partsToBytes(parts: Part[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.bytes.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p.bytes, at);
    at += p.bytes.length;
  }
  return out;
}

export function partsToHex(parts: Part[]): string {
  return toHex(partsToBytes(parts));
}

/** Calldata gas since EIP-2028: 4 per zero byte, 16 per non-zero byte. */
export function calldataGas(bytes: Uint8Array): { zero: number; nonZero: number; gas: number } {
  let zero = 0;
  for (const b of bytes) if (b === 0) zero++;
  const nonZero = bytes.length - zero;
  return { zero, nonZero, gas: zero * 4 + nonZero * 16 };
}
