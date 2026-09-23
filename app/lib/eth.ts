import { getPublicKey, utils as secpUtils } from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";

/** Real secp256k1 + Keccak-256 math — every value shown on the address
 *  slides is actually computed, not scripted/fake data. */

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically random 32-byte private key, valid for secp256k1. */
export function randomPrivateKey(): Uint8Array {
  return secpUtils.randomSecretKey();
}

/** A private key is only valid if it's nonzero and less than the curve order. */
export function isValidPrivateKey(bytes: Uint8Array): boolean {
  return secpUtils.isValidSecretKey(bytes);
}

/** Uncompressed public key with the leading 0x04 marker dropped — the
 *  raw 64-byte X‖Y coordinate pair that Ethereum hashes for an address. */
export function publicKeyFromPrivate(priv: Uint8Array): Uint8Array {
  return getPublicKey(priv, false).slice(1);
}

export function keccak256(data: Uint8Array): Uint8Array {
  return keccak_256(data);
}

/** Externally Owned Address: last 20 bytes of keccak256(uncompressed pubkey). */
export function eoaAddress(pub64: Uint8Array): Uint8Array {
  return keccak256(pub64).slice(-20);
}

/* ---------- minimal RLP — just enough to encode [address, nonce] ---- */

function encodeLength(len: number, offset: number): number[] {
  if (len < 56) return [offset + len];
  let hex = len.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const lenBytes = hex.match(/.{2}/g)!.map((h) => parseInt(h, 16));
  return [offset + 55 + lenBytes.length, ...lenBytes];
}

function rlpEncodeBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
  return Uint8Array.from([...encodeLength(bytes.length, 0x80), ...bytes]);
}

function rlpEncodeList(items: Uint8Array[]): Uint8Array {
  const payload = items.reduce<number[]>((acc, item) => [...acc, ...item], []);
  return Uint8Array.from([...encodeLength(payload.length, 0xc0), ...payload]);
}

/** Nonce as the minimal big-endian byte string RLP expects (empty for 0). */
export function nonceToBytes(nonce: number): Uint8Array {
  if (nonce === 0) return new Uint8Array(0);
  let hex = nonce.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Uint8Array.from(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
}

/** RLP([sender, nonce]) — the CREATE opcode's input to keccak256. */
export function rlpSenderNonce(sender20: Uint8Array, nonce: number): Uint8Array {
  return rlpEncodeList([rlpEncodeBytes(sender20), rlpEncodeBytes(nonceToBytes(nonce))]);
}

/** CREATE contract address: last 20 bytes of keccak256(rlp([sender, nonce])). */
export function contractAddress(sender20: Uint8Array, nonce: number): Uint8Array {
  return keccak256(rlpSenderNonce(sender20, nonce)).slice(-20);
}

export function randomAddress(): Uint8Array {
  return eoaAddress(publicKeyFromPrivate(randomPrivateKey()));
}
