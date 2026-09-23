"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { Btn, StepDots, animateDot, sleep } from "../components/flow-kit";

/* ------------------------------------------------------------------ */
/* Fabric, step by step — one page per diagram                         */
/*     Ported from fabric_transaction_flow.html, restyled dark.        */
/* ------------------------------------------------------------------ */

type NodeId =
  | "ca1" | "ca2" | "ca3" | "caO"
  | "peer1" | "peer2" | "peer3"
  | "channel" | "orderer" | "client";

type LineId =
  | "lCa1" | "lCa2" | "lCa3" | "lCaO"
  | "lP1" | "lP2" | "lP3" | "lChOrd";

type Kind = "ca" | "peer" | "channel" | "orderer" | "client";
type Mark = "endorsed" | "committed";

/* Roles map to tones whose light-mode values are lifted straight from the
 * reference HTML (ca=amber, peer=cyan/teal, channel=violet, orderer=rose/
 * rust, client=slate) — see the tone tables in globals.css. */
const KIND_TONE: Record<Kind, Tone> = {
  ca: "amber",
  peer: "cyan",
  channel: "violet",
  orderer: "rose",
  client: "slate",
};

const NODES: Record<NodeId, { x: number; y: number; w: number; h: number; kind: Kind; title: string; sub?: string }> = {
  ca1:     { x: 50,  y: 30,  w: 120, h: 40, kind: "ca", title: "Org1-CA" },
  ca2:     { x: 190, y: 30,  w: 120, h: 40, kind: "ca", title: "Org2-CA" },
  ca3:     { x: 330, y: 30,  w: 120, h: 40, kind: "ca", title: "Org3-CA" },
  caO:     { x: 500, y: 30,  w: 150, h: 40, kind: "ca", title: "OrdererOrg-CA" },
  peer1:   { x: 45,  y: 120, w: 130, h: 54, kind: "peer", title: "Org1-Peer", sub: "Endorser · ledger" },
  peer2:   { x: 185, y: 120, w: 130, h: 54, kind: "peer", title: "Org2-Peer", sub: "Endorser · ledger" },
  peer3:   { x: 325, y: 120, w: 130, h: 54, kind: "peer", title: "Org3-Peer", sub: "Ledger only" },
  channel: { x: 45,  y: 210, w: 410, h: 46, kind: "channel", title: "Channel A" },
  orderer: { x: 180, y: 290, w: 140, h: 54, kind: "orderer", title: "Ordering service", sub: "Sequences txs" },
  client:  { x: 500, y: 130, w: 150, h: 70, kind: "client", title: "Client", sub: "Application SDK" },
};

const LINES: Record<LineId, string> = {
  lCa1:   "M110 70 L110 118",
  lCa2:   "M250 70 L250 118",
  lCa3:   "M390 70 L390 118",
  lCaO:   "M575 70 L575 90 L655 90 L655 305 L322 305",
  lP1:    "M110 174 L110 208",
  lP2:    "M250 174 L250 208",
  lP3:    "M390 174 L390 208",
  lChOrd: "M250 256 L250 288",
};

const GUIDELINES = [
  "M500 165 L500 100 L110 100 L110 118",
  "M500 175 L500 110 L250 110 L250 118",
  "M525 200 L525 330 L322 330",
  "M250 317 L250 233 L110 233 L110 147",
  "M250 317 L250 233 L250 147",
  "M250 317 L250 233 L390 233 L390 147",
];

const DOT_PATHS: Record<string, number[][]> = {
  proposal1:  [[500, 165], [500, 100], [110, 100], [110, 120]],
  proposal2:  [[500, 175], [500, 110], [250, 110], [250, 120]],
  submit:     [[525, 200], [525, 330], [322, 330]],
  broadcast1: [[250, 317], [250, 233], [110, 233], [110, 147]],
  broadcast2: [[250, 317], [250, 233], [250, 147]],
  broadcast3: [[250, 317], [250, 233], [390, 233], [390, 147]],
};
const rev = (p: number[][]) => p.slice().reverse();

/* ---------- step scripts (descriptions kept from the original) ----- */

const INTRO_HINT = "Press “Next” or “Play” to meet each participant on the channel.";
const INTRO_STEPS: { nodes: NodeId[]; lines: LineId[]; desc: string }[] = [
  { nodes: ["ca1"], lines: [], desc: "Org1-CA — the identity authority for everything in Org1." },
  { nodes: ["ca2"], lines: [], desc: "Org2-CA — a separate authority, trusted only for Org2's identities." },
  { nodes: ["ca3"], lines: [], desc: "Org3-CA — independent of the other two, issues identities for Org3 only." },
  { nodes: ["caO"], lines: [], desc: "OrdererOrg-CA — a fourth, separate authority. It issues identities only for the ordering service, never for any org's peer." },
  { nodes: ["peer1"], lines: ["lCa1"], desc: "Org1-Peer holds a copy of the ledger and is required to endorse this chaincode's transactions. Its identity was issued by Org1-CA." },
  { nodes: ["peer2"], lines: ["lCa2"], desc: "Org2-Peer is also configured as an endorser here, with its identity issued by Org2-CA." },
  { nodes: ["peer3"], lines: ["lCa3"], desc: "Org3-Peer holds a ledger copy too, but isn't required by the endorsement policy for this chaincode." },
  { nodes: ["channel"], lines: ["lP1", "lP2", "lP3"], desc: "All three peers are joined to the same channel, Channel A — they share one ledger and one chaincode." },
  { nodes: ["orderer"], lines: ["lCaO", "lChOrd"], desc: "The ordering service sequences transactions for the channel. Its identity comes from OrdererOrg-CA." },
  { nodes: ["client"], lines: [], desc: "The client is an application acting on behalf of one org — Org1, in this walkthrough — using an SDK to talk to the network." },
];

const TX_HINT = "Press “Next” or “Play” to walk through how a transaction is proposed, endorsed, ordered, and committed.";
const TX_STEPS: {
  desc: string;
  active: NodeId[];
  lines?: LineId[];
  anim?: "proposal" | "response" | "submit" | "broadcast";
}[] = [
  { desc: "Client A signs the proposal with a certificate issued by its org's CA (Org1-CA), having enrolled with it beforehand.", active: ["client", "ca1"] },
  { desc: "The signed proposal is sent to the peers required by the endorsement policy — Org1-Peer and Org2-Peer. Org3-Peer isn't targeted, since it isn't part of this policy.", active: ["peer1", "peer2"], anim: "proposal" },
  { desc: "Each peer checks the proposal is well-formed, hasn't been submitted before, and that the client's signature and write authorization check out against Org1-CA — then simulates the transaction and signs the result with its own org's certificate.", active: ["peer1", "peer2", "ca1", "ca2"], lines: ["lCa1", "lCa2"] },
  { desc: "The proposal responses travel back to the client, which compares them to confirm every endorser produced the same read/write set before going any further.", active: ["client"], anim: "response" },
  { desc: "The client assembles the matching endorsements, read/write sets, and channel ID into a transaction message and broadcasts it to the ordering service, which doesn't inspect its contents.", active: ["orderer"], anim: "submit" },
  { desc: "The orderer sequences incoming transactions from the channel and cuts them into a block, signed with its own identity, issued by OrdererOrg-CA.", active: ["orderer", "caO"], lines: ["lCaO"] },
  { desc: "The block is delivered to every peer on the channel — including Org3-Peer. Each peer checks it came from a legitimate orderer by verifying the block's signature against OrdererOrg-CA.", active: ["peer1", "peer2", "peer3", "caO"], lines: ["lCaO"], anim: "broadcast" },
  { desc: "Each peer validates every transaction: the endorsement policy is re-checked against Org1-CA and Org2-CA, and the read set is checked to confirm no one else changed that data since it was simulated. Transactions are tagged valid or invalid.", active: ["peer1", "peer2", "peer3", "ca1", "ca2"] },
  { desc: "Valid transactions' write sets are committed to the state database and the block is appended to the ledger. Each peer emits an event so the client knows whether its transaction was committed or rejected.", active: ["peer1", "peer2", "peer3"] },
];

/* ---------- presentational pieces ---------------------------------- */

function Box({
  id,
  dim,
  active,
  mark,
}: {
  id: NodeId;
  dim: boolean;
  active: boolean;
  mark?: Mark;
}) {
  const n = NODES[id];
  const tone = mark ? "emerald" : KIND_TONE[n.kind];
  const fill = mark === "committed" ? toneVar("emerald", "strong-wash") : toneVar(tone, "wash");
  const stroke = toneVar(tone, "stroke");
  const title = mark === "committed" ? toneVar("emerald", "strong-text") : toneVar(tone, "text");
  const sub = toneVar(tone, "stroke");
  return (
    <g style={{ opacity: dim ? 0.18 : 1, transition: "opacity .35s" }}>
      <rect
        x={n.x} y={n.y} width={n.w} height={n.h} rx={8}
        fill={fill} stroke={stroke} strokeWidth={active ? 2.5 : 1}
        style={{
          filter: active ? `drop-shadow(0 0 6px ${stroke})` : undefined,
          transition: "stroke-width .2s, fill .25s",
        }}
      />
      <text
        x={n.x + n.w / 2} y={n.y + (n.sub ? n.h / 2 - 8 : n.h / 2)}
        textAnchor="middle" dominantBaseline="central"
        fontSize="14" fontWeight="600" fill={title}
      >
        {n.title}
      </text>
      {n.sub && (
        <text
          x={n.x + n.w / 2} y={n.y + n.h / 2 + 10}
          textAnchor="middle" dominantBaseline="central"
          fontSize="11.5" fill={sub}
        >
          {n.sub}
        </text>
      )}
    </g>
  );
}

function NetworkSvg({
  markerId,
  label,
  revealedNodes,
  revealedLines,
  activeNodes,
  flowLines,
  peerMarks = {},
  showGuides = false,
  dotRefs,
}: {
  markerId: string;
  label: string;
  /** when set, nodes/lines outside these sets render dimmed (intro mode) */
  revealedNodes?: Set<NodeId>;
  revealedLines?: Set<LineId>;
  activeNodes: Set<NodeId>;
  flowLines: Set<LineId>;
  peerMarks?: Partial<Record<NodeId, Mark>>;
  showGuides?: boolean;
  dotRefs?: React.RefObject<SVGCircleElement | null>[];
}) {
  return (
    <svg viewBox="0 0 680 400" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--static-line)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {showGuides &&
        GUIDELINES.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--guide-line)" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
        ))}

      {(Object.keys(LINES) as LineId[]).map((id) => {
        const flow = flowLines.has(id);
        const dim = revealedLines ? !revealedLines.has(id) : false;
        return (
          <path
            key={id}
            d={LINES[id]}
            fill="none"
            stroke={flow ? "var(--flow-accent)" : "var(--static-line)"}
            strokeWidth={flow ? 2 : 0.75}
            markerEnd={`url(#${markerId})`}
            style={{ opacity: dim ? 0.15 : 1, transition: "opacity .35s, stroke .2s" }}
          />
        );
      })}

      {(Object.keys(NODES) as NodeId[]).map((id) => (
        <Box
          key={id}
          id={id}
          dim={revealedNodes ? !revealedNodes.has(id) : false}
          active={activeNodes.has(id)}
          mark={peerMarks[id]}
        />
      ))}

      {dotRefs?.map((ref, i) => (
        <circle key={i} ref={ref} r="5" fill="var(--flow-accent)" style={{ opacity: 0 }} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Who's in this network                                     */
/* ------------------------------------------------------------------ */

export function FabricNetworkSlide(_: SlideProps) {
  const [introStep, setIntroStep] = useState(-1);
  const [introPlaying, setIntroPlaying] = useState(false);
  const introGen = useRef(0);

  useEffect(() => () => { introGen.current++; }, []);

  const introPlay = async () => {
    const gen = ++introGen.current;
    setIntroPlaying(true);
    for (let i = introStep + 1; i < INTRO_STEPS.length; i++) {
      if (introGen.current !== gen) return;
      setIntroStep(i);
      await sleep(1100);
    }
    if (introGen.current === gen) setIntroPlaying(false);
  };

  const introReset = () => {
    introGen.current++;
    setIntroPlaying(false);
    setIntroStep(-1);
  };

  const introRevealedNodes = new Set<NodeId>();
  const introRevealedLines = new Set<LineId>();
  for (let k = 0; k <= introStep; k++) {
    INTRO_STEPS[k].nodes.forEach((n) => introRevealedNodes.add(n));
    INTRO_STEPS[k].lines.forEach((l) => introRevealedLines.add(l));
  }
  const introActive = new Set<NodeId>(introStep >= 0 ? INTRO_STEPS[introStep].nodes : []);
  const introFlow = new Set<LineId>(introStep >= 0 ? INTRO_STEPS[introStep].lines : []);
  const introDone = introStep === INTRO_STEPS.length - 1;

  return (
    <SlideShell
      kicker="Platforms · 01 · Interactive"
      title={
        <>
          Fabric — <span className="text-grad-cool">who’s in this network</span>
        </>
      }
      accent="cyan"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <NetworkSvg
              markerId="ff-arrow-intro"
              label="Fabric network diagram that reveals each participant step by step"
              revealedNodes={introRevealedNodes}
              revealedLines={introRevealedLines}
              activeNodes={introActive}
              flowLines={introFlow}
            />
          </div>
          <div className="text-muted mt-5 min-h-[64px] text-base leading-relaxed">
            {introStep >= 0 ? INTRO_STEPS[introStep].desc : INTRO_HINT}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Btn primary onClick={introPlay} disabled={introPlaying || introDone}>
              Play
            </Btn>
            <Btn
              onClick={() => setIntroStep((i) => Math.min(INTRO_STEPS.length - 1, i + 1))}
              disabled={introPlaying || introDone}
            >
              Next
            </Btn>
            <Btn onClick={introReset}>Reset</Btn>
            <StepDots count={INTRO_STEPS.length} current={introStep} />
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · How a transaction flows through it                        */
/* ------------------------------------------------------------------ */

export function FabricTxSlide(_: SlideProps) {
  const [txStep, setTxStep] = useState(-1);
  const [txBusy, setTxBusy] = useState(false);
  const [txPlaying, setTxPlaying] = useState(false);
  const txGen = useRef(0);
  const dotA = useRef<SVGCircleElement | null>(null);
  const dotB = useRef<SVGCircleElement | null>(null);
  const dotC = useRef<SVGCircleElement | null>(null);

  useEffect(() => () => { txGen.current++; }, []);

  const runTx = async (i: number) => {
    const gen = txGen.current;
    const cancelled = () => txGen.current !== gen;
    setTxBusy(true);
    setTxStep(i);
    const s = TX_STEPS[i];
    if (s.anim === "proposal") {
      await Promise.all([
        animateDot(dotA.current, DOT_PATHS.proposal1, 850, cancelled),
        animateDot(dotB.current, DOT_PATHS.proposal2, 850, cancelled),
      ]);
    } else if (s.anim === "response") {
      await Promise.all([
        animateDot(dotA.current, rev(DOT_PATHS.proposal1), 850, cancelled),
        animateDot(dotB.current, rev(DOT_PATHS.proposal2), 850, cancelled),
      ]);
    } else if (s.anim === "submit") {
      await animateDot(dotA.current, DOT_PATHS.submit, 850, cancelled);
    } else if (s.anim === "broadcast") {
      await Promise.all([
        animateDot(dotA.current, DOT_PATHS.broadcast1, 900, cancelled),
        animateDot(dotB.current, DOT_PATHS.broadcast2, 900, cancelled),
        animateDot(dotC.current, DOT_PATHS.broadcast3, 900, cancelled),
      ]);
    }
    if (!cancelled()) setTxBusy(false);
  };

  const txPlay = async () => {
    const gen = txGen.current;
    setTxPlaying(true);
    for (let i = txStep + 1; i < TX_STEPS.length; i++) {
      if (txGen.current !== gen) return;
      await runTx(i);
      if (txGen.current !== gen) return;
      await sleep(500);
    }
    if (txGen.current === gen) setTxPlaying(false);
  };

  const txReset = () => {
    txGen.current++;
    setTxPlaying(false);
    setTxBusy(false);
    setTxStep(-1);
  };

  const txActive = new Set<NodeId>(txStep >= 0 ? TX_STEPS[txStep].active : []);
  const txFlow = new Set<LineId>(txStep >= 0 ? (TX_STEPS[txStep].lines ?? []) : []);
  const peerMarks: Partial<Record<NodeId, Mark>> = {};
  if (txStep >= 8) {
    peerMarks.peer1 = peerMarks.peer2 = peerMarks.peer3 = "committed";
  } else if (txStep >= 2) {
    peerMarks.peer1 = peerMarks.peer2 = "endorsed";
  }
  const txDone = txStep === TX_STEPS.length - 1;
  const txLocked = txBusy || txPlaying || txDone;

  return (
    <SlideShell
      kicker="Platforms · 01 · Interactive"
      title={
        <>
          Fabric — <span className="text-grad-cool">the transaction flow</span>
        </>
      }
      accent="cyan"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <NetworkSvg
              markerId="ff-arrow-tx"
              label="Fabric network diagram with animated transaction flow"
              activeNodes={txActive}
              flowLines={txFlow}
              peerMarks={peerMarks}
              showGuides
              dotRefs={[dotA, dotB, dotC]}
            />
          </div>
          <div className="text-muted mt-5 min-h-[64px] text-base leading-relaxed">
            {txStep >= 0 ? TX_STEPS[txStep].desc : TX_HINT}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Btn primary onClick={txPlay} disabled={txLocked}>
              Play
            </Btn>
            <Btn onClick={() => runTx(txStep + 1)} disabled={txLocked}>
              Next
            </Btn>
            <Btn onClick={txReset}>Reset</Btn>
            <StepDots count={TX_STEPS.length} current={txStep} />
          </div>
          <p className="text-muted-2 mt-3 text-xs leading-relaxed">
            Solid lines: fixed relationships (identity issuance, channel membership).
            Dashed lines: the path a transaction travels — the moving dot follows these live.
          </p>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
