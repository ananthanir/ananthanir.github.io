import { sha256 } from "@noble/hashes/sha2.js";
import { mnemonicToSeedSync, validateMnemonic as validate } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";

/** Real BIP-39 / BIP-32 math (via @scure/bip39 + @scure/bip32) — this is the
 *  same algorithm MetaMask uses to turn randomness into a recovery phrase,
 *  and a recovery phrase into an account's private key. Cross-checked
 *  against the well-known Hardhat/Ganache test mnemonic, whose account #0
 *  is the widely-published 0xf39Fd6e5...fFb92266. */

/** MetaMask's default: 128 bits of entropy → a 12-word mnemonic. */
export const ENTROPY_BYTES = 16;

export const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export function randomEntropy(): Uint8Array {
  const bytes = new Uint8Array(ENTROPY_BYTES);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBits(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(2).padStart(8, "0");
  return s;
}

export type MnemonicDerivation = {
  entropy: Uint8Array;
  /** SHA-256(entropy) — its first checksumBits.length bits are the checksum */
  hash: Uint8Array;
  /** entropy bits + checksum bits */
  bits: string;
  checksumBits: string;
  /** each 11-bit group, as a 0–2047 wordlist index */
  indices: number[];
  words: string[];
  mnemonic: string;
};

/** BIP-39: entropy + a checksum (the first ENT/32 bits of SHA-256(entropy))
 *  split into 11-bit groups, each indexing one of the 2048 wordlist words. */
export function deriveMnemonicFromEntropy(entropy: Uint8Array): MnemonicDerivation {
  const checksumBitLen = (entropy.length * 8) / 32;
  const hash = sha256(entropy);
  const checksumBits = bytesToBits(hash).slice(0, checksumBitLen);
  const bits = bytesToBits(entropy) + checksumBits;
  const indices: number[] = [];
  for (let i = 0; i < bits.length; i += 11) {
    indices.push(parseInt(bits.slice(i, i + 11), 2));
  }
  const words = indices.map((i) => wordlist[i]);
  return { entropy, hash, bits, checksumBits, indices, words, mnemonic: words.join(" ") };
}

export function validateMnemonic(mnemonic: string): boolean {
  return validate(mnemonic.trim(), wordlist);
}

/** PBKDF2-HMAC-SHA512(mnemonic, "mnemonic"+passphrase, 2048 rounds) → 64 bytes. */
export function mnemonicToSeed(mnemonic: string, passphrase = ""): Uint8Array {
  return mnemonicToSeedSync(mnemonic.trim(), passphrase);
}

export function deriveMasterKey(seed: Uint8Array): HDKey {
  return HDKey.fromMasterSeed(seed);
}

export function deriveChildKey(master: HDKey, path: string = ETH_DERIVATION_PATH): HDKey {
  return master.derive(path);
}

const HARDENED_OFFSET = 0x80000000;

/** BIP-44's fixed meaning for each segment of m/44'/60'/0'/0/{addressIndex} —
 *  only the last level (the account MetaMask calls "Account N+1") varies. */
function pathSegments(addressIndex: number): { index: number; hardened: boolean; label: string }[] {
  return [
    { index: 44, hardened: true, label: "purpose — BIP-44" },
    { index: 60, hardened: true, label: "coin type — Ether" },
    { index: 0, hardened: true, label: "account #0" },
    { index: 0, hardened: false, label: "change — external" },
    { index: addressIndex, hardened: false, label: `address index #${addressIndex}` },
  ];
}

export function derivationPath(addressIndex = 0): string {
  return `m/44'/60'/0'/0/${addressIndex}`;
}

export type HierarchyLevel = {
  path: string;
  label: string;
  privateKey: Uint8Array;
};

/** Walks m/44'/60'/0'/0/{addressIndex} one level at a time (via
 *  HDKey.deriveChild), so the private key at every intermediate level can be
 *  shown, not just the final one. Each level's key only ever depends on its
 *  parent — never a sibling — so only the last level changes between
 *  addressIndex 0, 1, 2, … (MetaMask's "Account 1", "Account 2", …). */
export function deriveHierarchy(seed: Uint8Array, addressIndex = 0): HierarchyLevel[] {
  let node = deriveMasterKey(seed);
  const levels: HierarchyLevel[] = [{ path: "m", label: "master", privateKey: node.privateKey! }];
  let path = "m";
  for (const seg of pathSegments(addressIndex)) {
    node = node.deriveChild(seg.hardened ? seg.index + HARDENED_OFFSET : seg.index);
    path += `/${seg.index}${seg.hardened ? "'" : ""}`;
    levels.push({ path, label: seg.label, privateKey: node.privateKey! });
  }
  return levels;
}
