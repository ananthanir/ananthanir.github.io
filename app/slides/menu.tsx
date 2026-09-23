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
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col items-center justify-center px-10 lg:px-20">
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal key={card.id} delay={i * 100}>
            <button
              onClick={() => goTo(card.id)}
              className="group flex h-full w-full flex-col rounded-2xl border p-7 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              style={{
                borderColor: toneVar(card.tone, "border"),
                background: toneVar(card.tone, "wash"),
              }}
            >
              <span
                className="font-mono text-xs uppercase tracking-[0.3em]"
                style={{ color: toneVar(card.tone, "stroke") }}
              >
                {card.tagline}
              </span>
              <span className="text-fg mt-3 text-2xl font-semibold">{card.name}</span>
              <span className="text-muted mt-3 text-[15px] leading-relaxed">
                {card.description}
              </span>
              <span
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium"
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
