"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import { ContractBadge, ExternalLink, Note, WalletBar } from "../components/chain-ui";
import { Btn } from "../components/flow-kit";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { encodeCall, partsToHex } from "../lib/abi";
import { BANK_ADDRESS, describeBankError, fetchBankState, sendBankTx, type BankState } from "../lib/bank";
import { HOODI, explorerAddress, explorerTx, shortAddress } from "../lib/hoodi";
import { useWallet } from "../lib/wallet";

const ACCENT: Tone = "emerald";

const inputClass = "text-fg w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[14px] outline-none";
const inputStyle = { borderColor: toneVar(ACCENT, "border"), background: toneVar(ACCENT, "wash") };

const eth = (wei: bigint) => {
  const s = formatEther(wei);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};

/* ------------------------------------------------------------------ */
/* Live bank data: loads on mount, on address change, and every 20 s   */
/* ------------------------------------------------------------------ */

function useBankState(address: string | null) {
  const [tick, setTick] = useState(0);
  const key = `${address ?? ""}#${tick}`;
  const [result, setResult] = useState<{ key: string; data?: BankState; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBankState(address)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((e) => !cancelled && setResult({ key, error: describeBankError(e) }));
    return () => {
      cancelled = true;
    };
  }, [address, key]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);

  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    loading: !result || result.key !== key,
    refresh: () => setTick((n) => n + 1),
  };
}

function StatCard({
  label,
  wei,
  empty,
  loading,
}: {
  label: string;
  wei: bigint | null;
  /** shown when there is no value to display */
  empty: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border p-4" style={inputStyle}>
      <div className="text-muted-2 font-mono text-[10px] uppercase tracking-[0.25em]">{label}</div>
      <div className="text-fg mt-2 break-all text-2xl font-semibold">
        {wei === null ? (
          <span className="text-muted-2">{loading ? "…" : "—"}</span>
        ) : (
          <>
            {eth(wei)} <span className="text-muted-2 text-sm font-normal">ETH</span>
          </>
        )}
      </div>
      <div className="text-muted-2 mt-1 break-all font-mono text-[11px]">
        {wei === null ? empty : `${wei.toString()} wei`}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Home                                                      */
/* ------------------------------------------------------------------ */

export function BankHomeSlide(_: SlideProps) {
  const wallet = useWallet();
  const address = wallet.account;
  const { data, error, loading, refresh } = useBankState(address);
  const own = data && data.address === address ? data : null;

  return (
    <SlideShell
      kicker="Bank · Hoodi testnet"
      title={
        <>
          The <span className="text-grad-cool">bank</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            SimpleBank keeps a ledger of who deposited what. The bank’s total is read live from the blockchain, no wallet
            needed; connect MetaMask to see your own balances too.
          </div>
          <ContractBadge label="SimpleBank" address={BANK_ADDRESS} tone={ACCENT} />

          <WalletBar wallet={wallet} tone={ACCENT} />

          {error && <Note tone="rose">{error}</Note>}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              label="Bank holds"
              wei={data ? data.contractBalance : null}
              empty="all deposits, combined"
              loading={loading}
            />
            <StatCard
              label="Your deposit"
              wei={own ? own.userBalance : null}
              empty="connect MetaMask"
              loading={loading && !!address}
            />
            <StatCard
              label="Your wallet"
              wei={own ? own.walletBalance : null}
              empty="connect MetaMask"
              loading={loading && !!address}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={refresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Btn>
            <span className="text-muted-2 text-xs">updates every 20 seconds</span>
          </div>

          <div>
            <div className="text-muted-2 mb-2 font-mono text-[11px] uppercase tracking-[0.25em]">Recent activity</div>
            {!data ? (
              <div className="text-muted-2 text-sm">{loading ? "Loading…" : "—"}</div>
            ) : data.activity === null ? (
              <div className="text-muted-2 text-sm">The public node didn’t return the event log just now.</div>
            ) : data.activity.length === 0 ? (
              <div className="text-muted-2 text-sm">No deposits or withdrawals in the recent blocks.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: toneVar(ACCENT, "border") }}>
                {data.activity.map((a) => {
                  const deposit = a.kind === "Deposited";
                  const tone: Tone = deposit ? "emerald" : "amber";
                  const mine = !!address && a.user.toLowerCase() === address.toLowerCase();
                  return (
                    <div
                      key={`${a.hash}-${a.logIndex}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 font-mono text-[12px] last:border-b-0"
                      style={{ borderColor: toneVar(ACCENT, "border"), background: mine ? toneVar(tone, "wash") : undefined }}
                    >
                      <span className="w-24 shrink-0 font-semibold" style={{ color: toneVar(tone, "stroke") }}>
                        {deposit ? "↓ Deposit" : "↑ Withdraw"}
                      </span>
                      <span className="text-fg w-32 shrink-0">{eth(a.amount)} ETH</span>
                      <span className="text-muted-2">
                        <ExternalLink href={explorerAddress(a.user)} tone={ACCENT}>
                          {shortAddress(a.user)}
                        </ExternalLink>
                        {mine && " (this address)"}
                      </span>
                      <span className="text-muted-2 ml-auto">
                        block {a.blockNumber}{" "}
                        <ExternalLink href={explorerTx(a.hash)} tone={ACCENT}>
                          tx
                        </ExternalLink>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · Deposit & withdraw                                        */
/* ------------------------------------------------------------------ */

type Action = "deposit" | "withdraw";

type Phase =
  | { kind: "idle" }
  | { kind: "confirming"; action: Action }
  | { kind: "pending"; action: Action; hash: string }
  | { kind: "done"; action: Action; hash: string; blockNumber: number; amount: bigint }
  | { kind: "error"; message: string };

function parseAmount(text: string): { wei: bigint | null; error: string | null } {
  const t = text.trim();
  if (!t) return { wei: null, error: null };
  try {
    const wei = parseEther(t);
    return wei > 0n ? { wei, error: null } : { wei: null, error: "Enter an amount greater than 0." };
  } catch {
    return { wei: null, error: "Enter an amount like 0.01 (up to 18 decimals)." };
  }
}

export function BankActionsSlide(_: SlideProps) {
  const wallet = useWallet();
  const { data, refresh } = useBankState(wallet.account);
  const [depositText, setDepositText] = useState("");
  const [withdrawText, setWithdrawText] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const own = data && data.address === wallet.account ? data : null;
  const userBalance = own?.userBalance ?? null;
  const walletBalance = own?.walletBalance ?? null;
  const onHoodi = wallet.chainId === HOODI.chainId;
  const busy = phase.kind === "confirming" || phase.kind === "pending";
  const ready = !!wallet.account && onHoodi && !busy;

  const deposit = parseAmount(depositText);
  const withdraw = parseAmount(withdrawText);
  const depositError =
    deposit.error ??
    (deposit.wei !== null && walletBalance !== null && deposit.wei > walletBalance
      ? `More than this wallet holds (${eth(walletBalance)} ETH).`
      : null);
  const withdrawError =
    withdraw.error ??
    (withdraw.wei !== null && userBalance !== null && withdraw.wei > userBalance
      ? `You only have ${eth(userBalance)} ETH in the bank.`
      : null);

  const run = async (action: Action, wei: bigint) => {
    setPhase({ kind: "confirming", action });
    try {
      const { hash, blockNumber } = await sendBankTx(action, wei, (h) => setPhase({ kind: "pending", action, hash: h }));
      setPhase({ kind: "done", action, hash, blockNumber, amount: wei });
      refresh();
      setTimeout(refresh, 3000); // the read node can lag a block behind
    } catch (e) {
      setPhase({ kind: "error", message: describeBankError(e) });
    }
  };

  const hint = !wallet.account ? "Connect MetaMask first." : !onHoodi ? "Switch MetaMask to the Hoodi testnet." : null;

  const underTheHood = (title: string, to: string, value: string | null, data: string) => (
    <details className="text-sm">
      <summary className="text-muted-2 cursor-pointer font-mono text-[11px] uppercase tracking-[0.2em]">{title}</summary>
      <div className="mt-2 break-all rounded-lg border p-3 font-mono text-[12px]" style={inputStyle}>
        <div>
          <span className="text-muted-2">to </span>
          <ExternalLink href={explorerAddress(to)} tone={ACCENT}>
            {to}
          </ExternalLink>
        </div>
        <div>
          <span className="text-muted-2">value </span>
          {value ?? "0"}
        </div>
        <div>
          <span className="text-muted-2">data </span>
          <span style={{ color: toneVar(ACCENT, "stroke"), fontWeight: 700 }}>0x{data.slice(0, 8)}</span>
          {data.slice(8)}
        </div>
      </div>
    </details>
  );

  return (
    <SlideShell
      kicker="Bank · Hoodi testnet"
      title={
        <>
          Deposit &amp; <span className="text-grad-cool">withdraw</span>
        </>
      }
      accent={ACCENT}
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="text-muted text-base leading-relaxed">
            Both actions are transactions: MetaMask signs them and you pay a little gas in Hoodi test ETH. Only ETH you
            deposited yourself can be withdrawn.
          </div>
          <ContractBadge label="SimpleBank" address={BANK_ADDRESS} tone={ACCENT} />
          <WalletBar wallet={wallet} tone={ACCENT} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard label="Bank holds" wei={data ? data.contractBalance : null} empty="all deposits, combined" loading={!data} />
            <StatCard label="Your deposit" wei={userBalance} empty="connect MetaMask" loading={!!wallet.account && !own} />
            <StatCard label="Your wallet" wei={walletBalance} empty="connect MetaMask" loading={!!wallet.account && !own} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ---- deposit ---- */}
            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: toneVar("emerald", "border") }}>
              <div className="text-fg text-lg font-semibold">Deposit</div>
              <div className="text-muted text-sm leading-relaxed">
                <span className="font-mono">deposit()</span> is <span className="font-mono">payable</span>: the ETH travels
                with the call as <span className="font-mono">msg.value</span> and is added to your balance in the bank’s
                ledger.
              </div>
              <div className="space-y-1">
                <div className="text-muted-2 font-mono text-[11px]">amount (ETH)</div>
                <input
                  value={depositText}
                  onChange={(e) => setDepositText(e.target.value)}
                  disabled={busy}
                  inputMode="decimal"
                  spellCheck={false}
                  placeholder="0.01"
                  aria-label="Deposit amount in ETH"
                  className={inputClass}
                  style={inputStyle}
                />
                {depositError && (
                  <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                    {depositError}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["0.001", "0.01", "0.1"].map((v) => (
                  <Btn key={v} onClick={() => setDepositText(v)} disabled={busy}>
                    {v}
                  </Btn>
                ))}
                <Btn
                  primary
                  onClick={() => deposit.wei !== null && run("deposit", deposit.wei)}
                  disabled={!ready || deposit.wei === null || !!depositError}
                >
                  Deposit
                </Btn>
              </div>
              {deposit.wei !== null &&
                underTheHood(
                  "Under the hood — the transaction",
                  BANK_ADDRESS,
                  `${deposit.wei.toString()} wei (${eth(deposit.wei)} ETH)`,
                  partsToHex(encodeCall("deposit()", [])),
                )}
            </div>

            {/* ---- withdraw ---- */}
            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: toneVar("amber", "border") }}>
              <div className="text-fg text-lg font-semibold">Withdraw</div>
              <div className="text-muted text-sm leading-relaxed">
                <span className="font-mono">withdraw(amount)</span> pays out at most what you deposited. The contract lowers
                your balance <em>before</em> it sends the ETH, so it can’t be tricked into paying twice.
              </div>
              <div className="space-y-1">
                <div className="text-muted-2 font-mono text-[11px]">amount (ETH)</div>
                <input
                  value={withdrawText}
                  onChange={(e) => setWithdrawText(e.target.value)}
                  disabled={busy}
                  inputMode="decimal"
                  spellCheck={false}
                  placeholder="0.01"
                  aria-label="Withdraw amount in ETH"
                  className={inputClass}
                  style={inputStyle}
                />
                {withdrawError && (
                  <div className="text-xs" style={{ color: toneVar("rose", "stroke") }}>
                    {withdrawError}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Btn
                  onClick={() => userBalance !== null && setWithdrawText(eth(userBalance))}
                  disabled={busy || !userBalance}
                >
                  Max
                </Btn>
                <Btn
                  primary
                  onClick={() => withdraw.wei !== null && run("withdraw", withdraw.wei)}
                  disabled={!ready || withdraw.wei === null || !!withdrawError}
                >
                  Withdraw
                </Btn>
              </div>
              {withdraw.wei !== null &&
                underTheHood(
                  "Under the hood — the transaction",
                  BANK_ADDRESS,
                  null,
                  partsToHex(encodeCall("withdraw(uint256)", [{ name: "amount", type: "uint256", value: withdraw.wei }])),
                )}
            </div>
          </div>

          {hint && !busy && <div className="text-muted-2 text-sm">{hint}</div>}

          {phase.kind === "confirming" && <Note>Check MetaMask and confirm the {phase.action}…</Note>}
          {phase.kind === "pending" && (
            <Note tone="amber">
              Transaction sent — waiting for it to be mined.{" "}
              <ExternalLink href={explorerTx(phase.hash)} tone={ACCENT}>
                View on explorer
              </ExternalLink>
            </Note>
          )}
          {phase.kind === "done" && (
            <Note tone="emerald">
              {phase.action === "deposit" ? "Deposited" : "Withdrew"} {eth(phase.amount)} ETH — confirmed in block{" "}
              {phase.blockNumber}.{" "}
              <ExternalLink href={explorerTx(phase.hash)} tone={ACCENT}>
                View transaction
              </ExternalLink>
            </Note>
          )}
          {phase.kind === "error" && <Note tone="rose">{phase.message}</Note>}
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
