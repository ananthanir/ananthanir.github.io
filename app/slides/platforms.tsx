import {
  ArrowDown,
  Chip,
  LinkPill,
  Panel,
  Point,
  Reveal,
  SlideShell,
  toneVar,
  type SlideProps,
  type Tone,
} from "../components/ui";

/* ------------------------------------------------------------------ */
/* 4 · Hyperledger Fabric                                              */
/* ------------------------------------------------------------------ */

export function FabricSlide(_: SlideProps) {
  const flow = [
    {
      step: "1 · Propose",
      text: "Client SDK sends the transaction proposal to endorsing peers",
    },
    {
      step: "2 · Endorse",
      text: "Peers simulate chaincode, sign the read/write set (no ledger change yet)",
    },
    {
      step: "3 · Order",
      text: "Ordering service (Raft) sequences transactions into blocks",
    },
    {
      step: "4 · Validate & Commit",
      text: "Every peer checks endorsement policy, then updates world state",
    },
  ];
  return (
    <SlideShell
      kicker="Platforms · 01"
      title={
        <>
          Hyperledger <span className="text-grad-cool">Fabric</span>
        </>
      }
      accent="cyan"
    >
      <div className="grid h-full grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Point title="Modular by design" delay={200} tone="cyan">
            Open-source under the Linux Foundation. Pluggable consensus,
            identity and databases — no native cryptocurrency required.
          </Point>
          <Point title="Identity: MSP + Fabric CA" delay={320} tone="cyan">
            Every actor holds an X.509 certificate. Membership Service
            Providers map certs to organisations and roles.
          </Point>
          <Point title="Channels & private data" delay={440} tone="cyan">
            A channel is a private ledger between a subset of members. Private
            data collections share secrets peer-to-peer, keeping only hashes
            on-chain.
          </Point>
          <Point title="Chaincode" delay={560} tone="cyan">
            Smart contracts in Go, Java or Node.js, governed by endorsement
            policies (e.g. “Org1 AND Org2 must sign”).
          </Point>
        </div>

        {/* Execute → Order → Validate flow */}
        <div className="flex flex-col justify-center">
          <Reveal delay={250}>
            <div className="text-muted-2 mb-3 text-center font-mono text-xs uppercase tracking-[0.3em]">
              Execute → Order → Validate
            </div>
          </Reveal>
          <div className="flex flex-col">
            {flow.map((f, i) => (
              <div key={f.step}>
                <Reveal delay={350 + i * 260} className="reveal-scale">
                  <Panel className="px-5 py-3.5" tone="cyan">
                    <div
                      className="font-mono text-sm font-semibold"
                      style={{ color: toneVar("cyan", "stroke") }}
                    >
                      {f.step}
                    </div>
                    <div className="text-muted mt-0.5 text-sm leading-relaxed">
                      {f.text}
                    </div>
                  </Panel>
                </Reveal>
                {i < flow.length - 1 && (
                  <ArrowDown delay={480 + i * 260} tone="cyan" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · Hyperledger Besu                                                */
/* ------------------------------------------------------------------ */

export function BesuSlide(_: SlideProps) {
  const stack = [
    { label: "JSON-RPC · GraphQL · WebSocket APIs", note: "standard Ethereum tooling connects here" },
    { label: "EVM — Solidity smart contracts", note: "reuse Hardhat, Remix, web3 libraries" },
    { label: "Consensus: QBFT · IBFT 2.0 · Clique PoA", note: "fast finality for consortium networks" },
    { label: "devp2p networking + permissioning", note: "node & account allowlists" },
  ];
  return (
    <SlideShell
      kicker="Platforms · 02"
      title={
        <>
          Hyperledger <span className="text-grad-cool">Besu</span>
        </>
      }
      accent="violet"
    >
      <div className="grid h-full grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Point title="Enterprise Ethereum client" delay={200} tone="violet">
            Java-based, Apache 2.0 licensed. Born at ConsenSys (Pantheon), now
            stewarded by LF Decentralized Trust.
          </Point>
          <Point title="One client, two worlds" delay={320} tone="violet">
            Runs against public Ethereum mainnet <em>and</em> private
            consortium networks — the same EVM skills transfer.
          </Point>
          <Point title="Privacy is network-level, not per-tx" delay={440} tone="violet">
            Besu deprecated its Tessera-based private transaction manager —
            privacy today comes from running a permissioned consortium
            network, not per-transaction confidentiality.
          </Point>
          <Point title="Enterprise Ethereum Alliance spec" delay={560} tone="violet">
            Implements the EEA client specification — a natural fit for
            tokenization and anything that benefits from the EVM ecosystem.
          </Point>
        </div>

        <div className="flex flex-col justify-center">
          <Reveal delay={250}>
            <div className="text-muted-2 mb-3 text-center font-mono text-xs uppercase tracking-[0.3em]">
              Besu node stack
            </div>
          </Reveal>
          <div className="space-y-2.5">
            {stack.map((s, i) => (
              <Reveal key={s.label} delay={350 + i * 220} className="reveal-scale">
                <Panel className="px-5 py-3.5" tone="violet">
                  <div className="text-[15px] font-semibold" style={{ color: toneVar("violet", "text") }}>
                    {s.label}
                  </div>
                  <div className="text-muted-2 text-sm">{s.note}</div>
                </Panel>
              </Reveal>
            ))}
          </div>
          <Reveal delay={1250}>
            <div className="text-muted mt-4 flex items-center justify-center gap-3 text-sm">
              <Chip tone="emerald">Public mainnet</Chip>
              <span className="text-muted-2 font-mono">⇄ same client ⇄</span>
              <Chip tone="violet">Private consortium</Chip>
            </div>
          </Reveal>
        </div>
      </div>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · R3 Corda                                                        */
/* ------------------------------------------------------------------ */

export function CordaSlide(_: SlideProps) {
  return (
    <SlideShell
      kicker="Platforms · 03"
      title={
        <>
          R3 <span className="text-grad-warm">Corda</span>
        </>
      }
      accent="rose"
    >
      <div className="grid h-full grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Point title="Need-to-know, not broadcast" delay={200} tone="rose">
            No global ledger. Data travels point-to-point, visible only to the
            parties of a deal — built for regulated financial markets.
          </Point>
          <Point title="States, contracts, flows" delay={320} tone="rose">
            Facts are shared state objects (UTXO-style). Contract code
            validates them; flows automate the negotiation between nodes.
          </Point>
          <Point title="Notary service" delay={440} tone="rose">
            Consensus is split: parties verify validity, a notary cluster
            guarantees uniqueness — preventing double-spends without global
            broadcast.
          </Point>
          <Point title="Legal-entity identity" delay={560} tone="rose">
            Nodes map to real legal entities via the network operator, and
            CorDapps (Kotlin / Java) can bind code to legal prose.
          </Point>
        </div>

        {/* need-to-know diagram */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 520 340" className="w-full max-w-[520px]" role="img" aria-label="Corda need-to-know model">
            {/* notary */}
            <g className="reveal" style={{ animationDelay: "900ms" }}>
              <rect x="190" y="16" width="140" height="52" rx="12" fill={toneVar("rose", "wash")} stroke={toneVar("rose", "stroke")} strokeWidth="1.5" />
              <text x="260" y="38" textAnchor="middle" fill={toneVar("rose", "text")} fontSize="15" fontWeight="600">Notary</text>
              <text x="260" y="56" textAnchor="middle" fill="var(--muted-2)" fontSize="11">uniqueness consensus</text>
            </g>
            {/* party A */}
            <g className="reveal" style={{ animationDelay: "300ms" }}>
              <rect x="28" y="150" width="150" height="70" rx="12" fill={toneVar("sky", "wash")} stroke={toneVar("sky", "stroke")} strokeWidth="1.5" />
              <text x="103" y="180" textAnchor="middle" fill={toneVar("sky", "text")} fontSize="15" fontWeight="600">Party A</text>
              <text x="103" y="200" textAnchor="middle" fill="var(--muted-2)" fontSize="11">e.g. issuing bank</text>
            </g>
            {/* party B */}
            <g className="reveal" style={{ animationDelay: "450ms" }}>
              <rect x="342" y="150" width="150" height="70" rx="12" fill={toneVar("sky", "wash")} stroke={toneVar("sky", "stroke")} strokeWidth="1.5" />
              <text x="417" y="180" textAnchor="middle" fill={toneVar("sky", "text")} fontSize="15" fontWeight="600">Party B</text>
              <text x="417" y="200" textAnchor="middle" fill="var(--muted-2)" fontSize="11">e.g. corporate</text>
            </g>
            {/* A—B transaction */}
            <line x1="178" y1="185" x2="342" y2="185" stroke={toneVar("emerald", "stroke")} strokeWidth="2" className="flow-line" />
            <g className="reveal" style={{ animationDelay: "650ms" }}>
              <text x="260" y="172" textAnchor="middle" fill={toneVar("emerald", "text")} fontSize="12" fontWeight="600">shared state · point-to-point</text>
            </g>
            {/* to notary */}
            <line x1="260" y1="150" x2="260" y2="68" stroke={toneVar("rose", "stroke")} strokeWidth="1.5" strokeDasharray="4 6" className="reveal" style={{ animationDelay: "1050ms" }} />
            <g className="reveal" style={{ animationDelay: "1150ms" }}>
              <text x="272" y="115" fill={toneVar("rose", "text")} fontSize="11">signs tx uniqueness</text>
            </g>
            {/* party C — excluded */}
            <g className="reveal" style={{ animationDelay: "1350ms" }}>
              <rect x="185" y="258" width="150" height="66" rx="12" fill="none" stroke="var(--guide-line)" strokeWidth="1.5" strokeDasharray="5 5" />
              <text x="260" y="276" textAnchor="middle" fill="var(--muted-2)" fontSize="14" fontWeight="600">Party C</text>
              <text x="260" y="296" textAnchor="middle" fill="var(--muted-2)" fontSize="11">not a participant</text>
              <text x="260" y="312" textAnchor="middle" fill="var(--muted-2)" fontSize="11">— sees nothing</text>
            </g>
          </svg>
        </div>
      </div>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* 7 · Platform comparison                                             */
/* ------------------------------------------------------------------ */

type PlatformLink = { name: string; href: string };

function LinkGroup({
  title,
  tone,
  items,
  baseDelay,
}: {
  title: string;
  tone: Tone;
  items: PlatformLink[];
  baseDelay: number;
}) {
  return (
    <div>
      <Reveal delay={baseDelay}>
        <div
          className="font-mono text-xs uppercase tracking-[0.3em]"
          style={{ color: toneVar(tone, "stroke") }}
        >
          {title}
        </div>
      </Reveal>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {items.map((item, i) => (
          <Reveal key={item.name} delay={baseDelay + 100 + i * 40} className="reveal-scale">
            <LinkPill href={item.href} tone={tone}>
              {item.name}
            </LinkPill>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function CompareSlide(_: SlideProps) {
  const rows: [string, string, string, string][] = [
    ["Ledger model", "Channel ledgers + key-value world state", "Ethereum account model", "Bilateral state objects (UTXO-style)"],
    ["Smart contracts", "Chaincode — Go · Java · Node.js", "Solidity on the EVM", "CorDapps — Kotlin · Java"],
    ["Consensus", "Endorsement policies + Raft ordering", "QBFT · IBFT 2.0 · Clique PoA", "Notary uniqueness + party validation"],
    ["Privacy", "Channels, private data collections", "Network-level only (Tessera privacy deprecated)", "Need-to-know, point-to-point"],
    ["Sweet spot", "Consortium workflows, supply chain", "Tokenization, EVM ecosystem reuse", "Financial agreements, trade finance"],
  ];
  const heads: { name: string; tone: Tone }[] = [
    { name: "Hyperledger Fabric", tone: "cyan" },
    { name: "Hyperledger Besu", tone: "violet" },
    { name: "R3 Corda", tone: "rose" },
  ];

  const l1s: PlatformLink[] = [
    { name: "Bitcoin", href: "https://bitcoin.org" },
    { name: "Ethereum", href: "https://ethereum.org" },
    { name: "BNB Chain", href: "https://www.bnbchain.org" },
    { name: "Solana", href: "https://solana.com" },
    { name: "Cardano", href: "https://cardano.org" },
    { name: "Avalanche", href: "https://www.avax.network" },
    { name: "Polkadot", href: "https://polkadot.network" },
    { name: "TON", href: "https://ton.org" },
    { name: "Sui", href: "https://sui.io" },
    { name: "NEAR", href: "https://near.org" },
    { name: "Cosmos", href: "https://cosmos.network" },
    { name: "Algorand", href: "https://algorand.co" },
  ];
  const l2s: PlatformLink[] = [
    { name: "Arbitrum", href: "https://arbitrum.io" },
    { name: "Optimism", href: "https://www.optimism.io" },
    { name: "Base", href: "https://www.base.org" },
    { name: "Polygon", href: "https://polygon.technology" },
    { name: "zkSync", href: "https://zksync.io" },
    { name: "Starknet", href: "https://www.starknet.io" },
    { name: "Linea", href: "https://linea.build" },
    { name: "Scroll", href: "https://scroll.io" },
  ];

  return (
    <SlideShell
      kicker="Platforms · Compare"
      title="Choosing a platform"
      accent="sky"
    >
      <div className="flex h-full flex-col gap-6 overflow-y-auto">
        <div className="surface overflow-hidden rounded-2xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--chrome-bg-hover)" }}>
                <th className="w-[15%] px-4 py-3" />
                {heads.map((h, i) => (
                  <th key={h.name} className="w-[28%] px-4 py-3 text-left">
                    <Reveal delay={150 + i * 120}>
                      <span className="text-[15px] font-semibold" style={{ color: toneVar(h.tone, "stroke") }}>
                        {h.name}
                      </span>
                    </Reveal>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, a, b, c], r) => (
                <tr key={label} className="row-stripe" style={{ borderTop: "1px solid var(--panel-border)" }}>
                  <td className="px-4 py-2.5 align-top">
                    <Reveal delay={450 + r * 130}>
                      <span className="text-muted-2 font-mono text-xs uppercase tracking-wider">
                        {label}
                      </span>
                    </Reveal>
                  </td>
                  {[a, b, c].map((cell, cIdx) => (
                    <td key={cIdx} className="text-fg px-4 py-2.5 align-top">
                      <Reveal delay={500 + r * 130 + cIdx * 50}>{cell}</Reveal>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <Reveal delay={1350}>
            <div className="text-muted-2 font-mono text-xs uppercase tracking-[0.3em]">
              For reference — the wider public landscape
            </div>
          </Reveal>
          <div className="mt-4 flex flex-col gap-4">
            <LinkGroup title="Public Layer 1s" tone="sky" items={l1s} baseDelay={1450} />
            <LinkGroup title="Layer 2s · Scaling" tone="violet" items={l2s} baseDelay={1900} />
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* 8 · Blockchain-as-a-Service                                         */
/* ------------------------------------------------------------------ */

export function BaasSlide(_: SlideProps) {
  const providers: { name: string; note: string; tone: Tone }[] = [
    { name: "AWS Managed Blockchain", note: "Ethereum access — Fabric framework retired", tone: "amber" },
    { name: "Oracle Blockchain Platform", note: "Fabric-based, enterprise SaaS", tone: "rose" },
    { name: "IBM Blockchain", note: "Fabric tooling & consulting", tone: "sky" },
    { name: "Kaleido", note: "Besu · Fabric · Corda, multi-cloud", tone: "violet" },
    { name: "Vishvasya (MeitY, India)", note: "India's national BaaS stack initiative", tone: "emerald" },
    { name: "Azure Blockchain Service", note: "retired 2021 — managed ≠ forever", tone: "slate" },
  ];
  return (
    <SlideShell
      kicker="Platforms · 04"
      title={
        <>
          Blockchain-as-a-Service{" "}
          <span className="text-muted-2">(BaaS)</span>
        </>
      }
      accent="emerald"
    >
      <div className="grid h-full grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <Point title="Cloud-managed blockchain infrastructure" delay={200} tone="emerald">
            The provider runs nodes, consensus, certificates, upgrades and
            monitoring. You bring smart contracts, members and applications.
          </Point>
          <Point title="Why teams use it" delay={320} tone="emerald">
            Network setup drops from weeks to hours, no dedicated DevOps for
            ledger plumbing, pay-as-you-go consortium onboarding.
          </Point>
          <Point title="Trade-offs to weigh" delay={440} tone="amber">
            Vendor lock-in, one operator hosting “decentralised” infrastructure,
            and limited control over protocol versions and patches.
          </Point>
          <Point title="A cautionary tale" delay={560} tone="rose">
            Azure Blockchain Service shut down in 2021 — consortium plans must
            include an exit and self-hosting strategy.
          </Point>
        </div>

        <div className="flex flex-col justify-center gap-2.5">
          {providers.map((p, i) => (
            <Reveal key={p.name} delay={300 + i * 150} className="reveal-scale">
              <Panel className="flex items-center justify-between px-5 py-3">
                <span className="text-[15px] font-semibold" style={{ color: toneVar(p.tone, "stroke") }}>
                  {p.name}
                </span>
                <span className="text-muted-2 ml-4 text-right text-sm">
                  {p.note}
                </span>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* 9 · Running the network on Kubernetes                               */
/* ------------------------------------------------------------------ */

function StorageIcon({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  const c = toneVar(tone, "stroke");
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="-4.5" rx="7" ry="2.3" fill="none" stroke={c} strokeWidth="1.3" />
      <ellipse cx="0" cy="0" rx="7" ry="2.3" fill="none" stroke={c} strokeWidth="1.3" />
      <ellipse cx="0" cy="4.5" rx="7" ry="2.3" fill="none" stroke={c} strokeWidth="1.3" />
    </g>
  );
}

function ClientIcon({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  const c = toneVar(tone, "stroke");
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r="9" fill="none" stroke={c} strokeWidth="1.3" />
      <circle cx="0" cy="-2.6" r="2.4" fill={c} />
      <path d="M -5 5.5 Q 0 -1 5 5.5 Z" fill={c} />
    </g>
  );
}

function VmBox({
  x, y, w, h, label, role, children,
}: {
  x: number; y: number; w: number; h: number; label: string; role: "M" | "W"; children: React.ReactNode;
}) {
  const roleTone: Tone = role === "M" ? "violet" : "cyan";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke="var(--static-line)" strokeWidth="1.3" />
      <text x={x + 10} y={y + 18} fill="var(--muted-2)" fontSize="12" fontWeight="700">{label}</text>
      <text x={x + w - 16} y={y + 18} fill={toneVar(roleTone, "stroke")} fontSize="12.5" fontWeight="800">{role}</text>
      {children}
    </g>
  );
}

function K8sPod({
  x, y, w, h, lines, storage, client,
}: {
  x: number; y: number; w: number; h: number; lines: string[]; storage?: boolean; client?: boolean;
}) {
  const startY = y + h / 2 - ((lines.length - 1) * 15) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={toneVar("amber", "wash")} stroke={toneVar("amber", "stroke")} strokeWidth="1.3" />
      {lines.map((l, i) => (
        <text key={l} x={x + w / 2} y={startY + i * 16} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill={toneVar("amber", "text")}>
          {l}
        </text>
      ))}
      {storage && <StorageIcon x={x + w - 13} y={y + h - 13} tone="amber" />}
      {client && <ClientIcon x={x + w - 13} y={y + h - 13} tone="sky" />}
    </g>
  );
}

export function K8sSetupSlide(_: SlideProps) {
  const A = "k8s-arrow";
  return (
    <SlideShell
      kicker="Platforms · 05 · Infrastructure"
      title={
        <>
          Running the network on <span className="text-grad-cool">Kubernetes</span>
        </>
      }
      accent="sky"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 flex items-center justify-center">
            <svg viewBox="0 0 860 525" className="h-full w-full" role="img" aria-label="Kubernetes deployment diagram: platform and HA proxy in front of a five-VM cluster running four validator nodes plus supporting services">
              <defs>
                <marker id={A} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="var(--static-line)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              {/* platform -> HA proxy -> cluster */}
              <g className="reveal" style={{ animationDelay: "150ms" }}>
                <rect x={350} y={8} width={160} height={46} rx={10} fill={toneVar("slate", "wash")} stroke={toneVar("slate", "stroke")} strokeWidth="1.5" />
                <text x={430} y={31} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fill={toneVar("slate", "text")}>Platform</text>
              </g>
              <line x1={430} y1={54} x2={430} y2={72} stroke="var(--static-line)" strokeWidth="1.5" markerEnd={`url(#${A})`} className="reveal" style={{ animationDelay: "260ms" }} />

              <g className="reveal" style={{ animationDelay: "320ms" }}>
                <path
                  d="M375 128 Q 362 100 392 94 Q 398 74 428 74 Q 456 74 462 94 Q 490 94 490 118 Q 490 140 462 140 L 392 140 Q 375 140 375 128 Z"
                  fill={toneVar("sky", "wash")} stroke={toneVar("sky", "stroke")} strokeWidth="1.5"
                />
                <text x={430} y={110} textAnchor="middle" dominantBaseline="central" fontSize="12.5" fontWeight="700" fill={toneVar("sky", "text")}>HA</text>
                <text x={430} y={124} textAnchor="middle" dominantBaseline="central" fontSize="12.5" fontWeight="700" fill={toneVar("sky", "text")}>Proxy</text>
              </g>
              <line x1={430} y1={142} x2={430} y2={166} stroke="var(--static-line)" strokeWidth="1.5" markerEnd={`url(#${A})`} className="reveal" style={{ animationDelay: "440ms" }} />

              {/* cluster boundary */}
              <g className="reveal" style={{ animationDelay: "500ms" }}>
                <rect x={16} y={168} width={828} height={340} rx={14} fill="none" stroke="var(--static-line)" strokeWidth="1.5" />
                <text x={30} y={190} fill="var(--muted-2)" fontSize="13" fontWeight="700">Kubernetes Cluster</text>
              </g>

              {/* legend */}
              <g className="reveal" style={{ animationDelay: "580ms" }}>
                <rect x={648} y={10} width={196} height={148} rx={12} fill={toneVar("sky", "wash")} stroke={toneVar("sky", "border")} strokeWidth="1.5" />
                <text x={664} y={30} fill={toneVar("sky", "text")} fontSize="11.5" fontWeight="800" letterSpacing="1">LEGEND</text>
                <StorageIcon x={670} y={50} tone="sky" />
                <text x={686} y={53} fill={toneVar("sky", "text")} fontSize="11">Persistent storage</text>
                <ClientIcon x={670} y={75} tone="sky" />
                <text x={686} y={78} fill={toneVar("sky", "text")} fontSize="11">Client / load balancer</text>
                <rect x={662} y={92} width={16} height={13} rx={3} fill={toneVar("amber", "wash")} stroke={toneVar("amber", "stroke")} strokeWidth="1.3" />
                <text x={686} y={99} fill={toneVar("sky", "text")} fontSize="11">Pod</text>
                <text x={664} y={121} fill={toneVar("violet", "stroke")} fontSize="12.5" fontWeight="800">M</text>
                <text x={686} y={121} fill={toneVar("sky", "text")} fontSize="11">Master node</text>
                <text x={664} y={141} fill={toneVar("cyan", "stroke")} fontSize="12.5" fontWeight="800">W</text>
                <text x={686} y={141} fill={toneVar("sky", "text")} fontSize="11">Worker node</text>
              </g>

              {/* row 1 — VM1 + VM3 (single pod, 180px) flank VM2 (double pod, 380px);
                  row total = 780px, matching row 2 below for an even layout */}
              <g className="reveal" style={{ animationDelay: "660ms" }}>
                <VmBox x={40} y={210} w={180} h={118} label="VM 1" role="M">
                  <rect x={50} y={248} width={160} height={68} rx={8} fill={toneVar("violet", "wash")} stroke={toneVar("violet", "stroke")} strokeWidth="1.3" />
                  <text x={130} y={274} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill={toneVar("violet", "text")}>Master Node</text>
                  <text x={130} y={290} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill={toneVar("violet", "text")}>Components</text>
                </VmBox>
              </g>

              <g className="reveal" style={{ animationDelay: "740ms" }}>
                <VmBox x={240} y={210} w={380} h={118} label="VM 2" role="W">
                  <K8sPod x={250} y={248} w={172} h={68} lines={["Validator", "Node 1"]} storage />
                  <K8sPod x={438} y={248} w={172} h={68} lines={["Blockchain", "API Service"]} client />
                </VmBox>
              </g>

              <g className="reveal" style={{ animationDelay: "820ms" }}>
                <VmBox x={640} y={210} w={180} h={118} label="VM 3" role="W">
                  <K8sPod x={650} y={248} w={160} h={68} lines={["Validator", "Node 2"]} storage />
                </VmBox>
              </g>

              {/* row 2 — VM4 + VM5, both 380px (double pod), total 780px */}
              <g className="reveal" style={{ animationDelay: "900ms" }}>
                <VmBox x={40} y={346} w={380} h={118} label="VM 4" role="W">
                  <K8sPod x={50} y={384} w={172} h={68} lines={["Validator", "Node 3"]} storage />
                  <K8sPod x={238} y={384} w={172} h={68} lines={["Blockchain", "Explorer"]} />
                </VmBox>
              </g>

              <g className="reveal" style={{ animationDelay: "980ms" }}>
                <VmBox x={440} y={346} w={380} h={118} label="VM 5" role="W">
                  <K8sPod x={450} y={384} w={172} h={68} lines={["Validator", "Node 4"]} storage />
                  <K8sPod x={638} y={384} w={172} h={68} lines={["Monitoring"]} />
                </VmBox>
              </g>
            </svg>
          </div>
          <Reveal delay={1150}>
            <p className="text-muted mt-4 text-sm leading-relaxed">
              Four validators, one per worker node, each with its own persistent
              volume for ledger data — this deployment shape is the same whether
              the validators are running Fabric, Besu or Corda; only the exact
              fault-tolerance math differs per protocol. The master node runs
              Kubernetes’ own control plane; the API service, explorer and
              monitoring pods ride alongside on spare workers rather than needing
              dedicated machines.
            </p>
          </Reveal>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
