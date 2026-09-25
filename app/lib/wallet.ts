"use client";

import { useCallback, useEffect, useState } from "react";
import type { Eip1193Provider } from "ethers";
import { HOODI, describeError } from "./hoodi";

type InjectedEthereum = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: InjectedEthereum;
  }
}

/** MetaMask connection state. Reading `eth_accounts` on mount (which never
 *  prompts) lets a slide pick up a connection made earlier in the session. */
export function useWallet() {
  const [available, setAvailable] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    const onAccounts = (accounts: unknown) =>
      setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null);
    const onChain = (id: unknown) => setChainId(typeof id === "string" ? parseInt(id, 16) : null);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(true);
    eth.request({ method: "eth_accounts" }).then(onAccounts).catch(() => {});
    eth.request({ method: "eth_chainId" }).then(onChain).catch(() => {});
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setError(null);
    try {
      const accounts: unknown = await eth.request({ method: "eth_requestAccounts" });
      setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null);
      const id: unknown = await eth.request({ method: "eth_chainId" });
      setChainId(typeof id === "string" ? parseInt(id, 16) : null);
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  /** Switches MetaMask to Hoodi, adding the network first if it doesn't know it. */
  const switchToHoodi = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setError(null);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HOODI.chainIdHex }] });
    } catch (e) {
      if ((e as { code?: number }).code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: HOODI.chainIdHex,
                chainName: HOODI.name,
                nativeCurrency: { name: "Hoodi Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: HOODI.rpcUrls,
                blockExplorerUrls: [HOODI.explorer],
              },
            ],
          });
        } catch (addError) {
          setError(describeError(addError));
        }
      } else {
        setError(describeError(e));
      }
    }
  }, []);

  return { available, account, chainId, error, connect, switchToHoodi };
}

export type Wallet = ReturnType<typeof useWallet>;
