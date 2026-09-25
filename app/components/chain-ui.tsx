import type { ReactNode } from "react";
import { HOODI, explorerAddress, shortAddress } from "../lib/hoodi";
import type { Wallet } from "../lib/wallet";
import { Btn } from "./flow-kit";
import { toneVar, type Tone } from "./ui";

/** Small building blocks shared by the on-chain demos (certificates, bank). */

export function ExternalLink({ href, tone, children }: { href: string; tone: Tone; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline-offset-2 hover:underline"
      style={{ color: toneVar(tone, "stroke") }}
    >
      {children} ↗
    </a>
  );
}

export function Note({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      className="rounded-lg border p-3 text-sm leading-relaxed"
      style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
    >
      {children}
    </div>
  );
}

export function ContractBadge({ label, address, tone }: { label: string; address: string; tone: Tone }) {
  return (
    <div className="text-muted-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
      <span>{label}</span>
      <span>·</span>
      <span>{HOODI.name}</span>
      <span>·</span>
      <ExternalLink href={explorerAddress(address)} tone={tone}>
        {shortAddress(address)}
      </ExternalLink>
    </div>
  );
}

/** MetaMask status: not installed / connect / connected account + network check. */
export function WalletBar({ wallet, tone }: { wallet: Wallet; tone: Tone }) {
  const onHoodi = wallet.chainId === HOODI.chainId;
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
        style={{ borderColor: toneVar(tone, "border"), background: toneVar(tone, "wash") }}
      >
        {!wallet.available ? (
          <span className="text-muted text-sm">
            MetaMask wasn’t detected in this browser. Install the extension to send transactions.
          </span>
        ) : !wallet.account ? (
          <>
            <span className="text-muted text-sm">Not connected</span>
            <Btn primary onClick={wallet.connect}>
              Connect MetaMask
            </Btn>
          </>
        ) : (
          <>
            <span className="font-mono text-sm">
              <span className="text-muted-2">account </span>
              <ExternalLink href={explorerAddress(wallet.account)} tone={tone}>
                {shortAddress(wallet.account)}
              </ExternalLink>
              <span className="text-muted-2"> · </span>
              <span style={{ color: onHoodi ? toneVar("emerald", "stroke") : toneVar("amber", "stroke") }}>
                {onHoodi ? `✓ ${HOODI.name}` : `wrong network (chain ${wallet.chainId ?? "?"})`}
              </span>
            </span>
            {!onHoodi && <Btn onClick={wallet.switchToHoodi}>Switch to Hoodi</Btn>}
          </>
        )}
      </div>
      {wallet.error && <Note tone="rose">{wallet.error}</Note>}
    </div>
  );
}
