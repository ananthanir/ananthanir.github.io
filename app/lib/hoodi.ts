import { JsonRpcProvider, isError } from "ethers";

/** The Hoodi testnet: chain parameters, explorer links, and read-only RPC access
 *  shared by every on-chain demo. Reads go through public nodes (no wallet);
 *  writes are signed by the user's MetaMask. */

export const HOODI = {
  chainId: 560048,
  chainIdHex: "0x88bb0",
  name: "Hoodi Testnet",
  /** tried in order — the first that answers wins */
  rpcUrls: ["https://ethereum-hoodi-rpc.publicnode.com", "https://rpc.hoodi.ethpandaops.io"],
  explorer: "https://hoodi.etherscan.io",
};

export const explorerAddress = (address: string) => `${HOODI.explorer}/address/${address}`;
export const explorerTx = (hash: string) => `${HOODI.explorer}/tx/${hash}`;
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Runs `fn` against a public Hoodi node, falling back to the next node on failure. */
export async function withReadProvider<T>(fn: (provider: JsonRpcProvider) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of HOODI.rpcUrls) {
    const provider = new JsonRpcProvider(url, HOODI.chainId, { staticNetwork: true });
    try {
      return await fn(provider);
    } catch (e) {
      lastError = e;
    } finally {
      provider.destroy();
    }
  }
  throw lastError;
}

export function describeError(e: unknown): string {
  if (isError(e, "ACTION_REJECTED")) return "You rejected the request in MetaMask.";
  if (isError(e, "INSUFFICIENT_FUNDS")) return "Not enough Hoodi ETH in this account to pay for gas.";
  const err = e as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? "Something went wrong.";
}
