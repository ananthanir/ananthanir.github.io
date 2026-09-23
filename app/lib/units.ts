/** Convert between a decimal string in some Ether denomination and integer
 *  wei (the atomic, always-whole-number unit) — string/BigInt math, so large
 *  values (up to 10^18 wei per ether and beyond) never lose precision the
 *  way floating point would. */

export function parseUnits(value: string, decimals: number): bigint {
  const v = value.trim();
  if (v === "" || v === ".") return 0n;
  const negative = v.startsWith("-");
  const unsigned = negative ? v.slice(1) : v;
  const [wholePart, fracPart = ""] = unsigned.split(".");
  const whole = wholePart === "" ? "0" : wholePart;
  const frac = fracPart.slice(0, decimals).padEnd(decimals, "0");
  const result = BigInt(whole + frac);
  return negative ? -result : result;
}

export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const frac = abs % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  const s = fracStr ? `${whole}.${fracStr}` : whole.toString();
  return negative ? `-${s}` : s;
}

export type EtherUnit = {
  id: string;
  name: string;
  alt?: string;
  /** power of ten relative to wei */
  decimals: number;
  note?: string;
};

export const ETHER_UNITS: EtherUnit[] = [
  { id: "wei", name: "Wei", decimals: 0, note: "the atomic unit — always a whole number" },
  { id: "gwei", name: "Gwei", alt: "Shannon", decimals: 9, note: "what gas prices are quoted in" },
  { id: "ether", name: "Ether", alt: "ETH", decimals: 18 },
];
