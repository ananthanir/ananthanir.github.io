import { Reveal, toneVar, type SlideProps, type Tone } from "../components/ui";

type PlatformCard = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tone: Tone;
};

const CARDS: PlatformCard[] = [
  {
    id: "eth-address",
    name: "Ethereum Addresses",
    tagline: "ECDSA · Keccak-256",
    description:
      "Derive a real externally owned address and a CREATE contract address, byte by byte.",
    tone: "amber",
  },
  {
    id: "ether-units",
    name: "Ether Denominations",
    tagline: "Wei · Gwei · Ether",
    description: "Live-convert between wei and every denomination up to ether.",
    tone: "emerald",
  },
  {
    id: "gas-cost",
    name: "Tx Cost Calculation",
    tagline: "EIP-1559 · gas × price",
    description: "Calculate a transaction's total fee from gas used, base fee, and tip.",
    tone: "orange",
  },
  {
    id: "seed",
    name: "MetaMask Seed & Address",
    tagline: "BIP-39 · BIP-32/44",
    description: "Build a 12-word recovery phrase, then derive an account's address from it.",
    tone: "sky",
  },
  {
    id: "calldata",
    name: "Calldata & ABI Encoding",
    tagline: "selector · head & tail",
    description: "See how a function selector is made and how a call's arguments are encoded, word by word.",
    tone: "rose",
  },
  {
    id: "certs",
    name: "Certificate dApp",
    tagline: "Hoodi testnet · MetaMask",
    description: "Verify a certificate straight from the chain, or connect MetaMask and issue one on a live contract.",
    tone: "violet",
  },
  {
    id: "bank",
    name: "Bank dApp",
    tagline: "Hoodi testnet · deposit & withdraw",
    description: "See the bank's balance and any address's balance, then deposit and withdraw ETH through MetaMask.",
    tone: "emerald",
  },
  {
    id: "rpc",
    name: "JSON-RPC Explorer",
    tagline: "eth_getBlockByNumber · eth_getTransactionByHash",
    description: "Paste any node's JSON-RPC URL and call it yourself — raw request and response, decoded.",
    tone: "cyan",
  },
  {
    id: "fabric",
    name: "Hyperledger Fabric",
    tagline: "Channel-based · permissioned",
    description:
      "Modular consensus, MSP/CA identity, endorsement-policy driven transactions.",
    tone: "cyan",
  },
  {
    id: "besu",
    name: "Hyperledger Besu",
    tagline: "EVM-compatible · enterprise Ethereum",
    description:
      "Familiar Ethereum tooling with QBFT/IBFT consensus for permissioned networks.",
    tone: "violet",
  },
  {
    id: "corda",
    name: "R3 Corda",
    tagline: "UTXO · need-to-know",
    description:
      "Point-to-point flows and notarised states — no global broadcast of data.",
    tone: "rose",
  },
];

export function MenuSlide({ goTo }: SlideProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col items-center overflow-y-auto px-6 pb-16 pt-6 sm:px-10 sm:pt-8">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal key={card.id} delay={i * 80}>
            <button
              onClick={() => goTo(card.id)}
              className="group flex h-full w-full flex-col rounded-xl border p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{
                borderColor: toneVar(card.tone, "border"),
                background: toneVar(card.tone, "wash"),
              }}
            >
              <span
                className="font-mono text-[11px] uppercase tracking-[0.3em]"
                style={{ color: toneVar(card.tone, "stroke") }}
              >
                {card.tagline}
              </span>
              <span className="text-fg mt-2 text-lg font-semibold">{card.name}</span>
              <span className="text-muted mt-2 text-[13px] leading-relaxed">
                {card.description}
              </span>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: toneVar(card.tone, "stroke") }}
              >
                View demo
                <span aria-hidden className="transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
