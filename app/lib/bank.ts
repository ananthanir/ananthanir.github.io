import { BrowserProvider, Contract, Interface, isError, type EventLog, type InterfaceAbi, type JsonRpcProvider } from "ethers";
import { describeError, shortAddress, withReadProvider } from "./hoodi";

/** SimpleBank on the Hoodi testnet: deposit ETH, withdraw only what you put in. */

export const BANK_ADDRESS = "0x54cd73D7db8e684Feef9c04405Cae817f7637712";

export const BANK_ABI: InterfaceAbi = [
  { inputs: [], name: "deposit", outputs: [], stateMutability: "payable", type: "function" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const iface = new Interface(BANK_ABI);

export type Activity = {
  kind: "Deposited" | "Withdrawn";
  user: string;
  amount: bigint;
  blockNumber: number;
  logIndex: number;
  hash: string;
};

export type BankState = {
  /** the address the per-user numbers belong to */
  address: string | null;
  /** all ETH held by the contract */
  contractBalance: bigint;
  /** what `address` has deposited in the bank */
  userBalance: bigint | null;
  /** `address`'s ETH in its own wallet */
  walletBalance: bigint | null;
  /** recent Deposited / Withdrawn events; null if the node refused the log query */
  activity: Activity[] | null;
};

/** `getBalance()` reads `balances[msg.sender]`, so to ask about any address we
 *  run the same read-only call *as* that address. */
async function readUserBalance(provider: JsonRpcProvider, address: string): Promise<bigint> {
  const raw = await provider.call({ to: BANK_ADDRESS, from: address, data: iface.encodeFunctionData("getBalance") });
  return iface.decodeFunctionResult("getBalance", raw)[0] as bigint;
}

async function readActivity(provider: JsonRpcProvider, bank: Contract): Promise<Activity[]> {
  const latest = await provider.getBlockNumber();
  // public nodes cap how many blocks one log query may span, so back off if refused
  for (const span of [20000, 5000, 1000]) {
    try {
      const from = Math.max(0, latest - span);
      const [deposits, withdrawals] = await Promise.all([
        bank.queryFilter(bank.filters.Deposited(), from, latest),
        bank.queryFilter(bank.filters.Withdrawn(), from, latest),
      ]);
      return [...deposits, ...withdrawals]
        .map((log) => {
          const e = log as EventLog;
          return {
            kind: e.eventName as Activity["kind"],
            user: e.args.user as string,
            amount: e.args.amount as bigint,
            blockNumber: e.blockNumber,
            logIndex: e.index,
            hash: e.transactionHash,
          };
        })
        .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
        .slice(0, 10);
    } catch {
      // try a smaller range
    }
  }
  throw new Error("activity unavailable");
}

export async function fetchBankState(address: string | null): Promise<BankState> {
  return withReadProvider(async (provider) => {
    const bank = new Contract(BANK_ADDRESS, BANK_ABI, provider);
    const [contractBalance, userBalance, walletBalance, activity] = await Promise.all([
      bank.getContractBalance() as Promise<bigint>,
      address ? readUserBalance(provider, address) : Promise.resolve(null),
      address ? provider.getBalance(address) : Promise.resolve(null),
      readActivity(provider, bank).catch(() => null),
    ]);
    return { address, contractBalance, userBalance, walletBalance, activity };
  });
}

/** Sends `deposit()` (with `amountWei` attached as msg.value) or `withdraw(amountWei)`
 *  through the user's wallet. `onSent` fires once the hash exists, before mining. */
export async function sendBankTx(
  kind: "deposit" | "withdraw",
  amountWei: bigint,
  onSent: (hash: string) => void,
): Promise<{ hash: string; blockNumber: number }> {
  if (!window.ethereum) throw new Error("MetaMask isn’t available in this browser.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const bank = new Contract(BANK_ADDRESS, BANK_ABI, signer);
  const tx = kind === "deposit" ? await bank.deposit({ value: amountWei }) : await bank.withdraw(amountWei);
  onSent(tx.hash);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("The transaction failed on-chain.");
  return { hash: tx.hash, blockNumber: receipt.blockNumber };
}

/** A view call that reverts with no reason means the address isn't running this contract. */
export function describeBankError(e: unknown): string {
  if (isError(e, "CALL_EXCEPTION") && !e.reason) {
    return `The contract at ${shortAddress(BANK_ADDRESS)} didn’t answer like SimpleBank — check that this is the deployed bank’s address.`;
  }
  return describeError(e);
}
