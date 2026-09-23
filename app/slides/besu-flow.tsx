"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { Btn, StepDots, animateDot, sleep } from "../components/flow-kit";

/* ------------------------------------------------------------------ */
/* Besu QBFT, step by step — one page per diagram                      */
/*     Ported from besu_qbft_transaction_flow.html, restyled to match  */
/*     the deck's tone system.                                         */
/* ------------------------------------------------------------------ */

type NodeId = "wallet" | "node1" | "node2" | "node3" | "node4";
type LineId = "lWalletN1" | "lN1N2" | "lN1N3" | "lN1N4" | "lN2N3" | "lN2N4" | "lN3N4";
type Kind = "wallet" | "validator";
type Mark = "proposer" | "committed";

/* wallet=amber (matches the reference HTML's #B8860B signer), validator=
 * cyan/teal (matches its #0F6E56 validator color) — see globals.css. */
const KIND_TONE: Record<Kind, Tone> = {
  wallet: "amber",
  validator: "cyan",
};

const NODES: Record<NodeId, { x: number; y: number; w: number; h: number; kind: Kind; title: string; sub?: string }> = {
  wallet: { x: 260, y: 20,  w: 160, h: 54, kind: "wallet",    title: "MetaMask Wallet", sub: "Local key signer" },
  node1:  { x: 80,  y: 110, w: 150, h: 70, kind: "validator", title: "Besu Node 1",     sub: "QBFT validator" },
  node2:  { x: 450, y: 110, w: 150, h: 70, kind: "validator", title: "Besu Node 2",     sub: "QBFT validator" },
  node3:  { x: 80,  y: 320, w: 150, h: 70, kind: "validator", title: "Besu Node 3",     sub: "QBFT validator" },
  node4:  { x: 450, y: 320, w: 150, h: 70, kind: "validator", title: "Besu Node 4",     sub: "QBFT validator" },
};

const LINES: Record<LineId, string> = {
  lWalletN1: "M340 74 L340 90 L155 90 L155 110",
  lN1N2:     "M230 145 L450 145",
  lN1N3:     "M155 180 L155 320",
  lN2N4:     "M525 180 L525 320",
  lN3N4:     "M230 355 L450 355",
  lN1N4:     "M230 180 L450 320",
  lN2N3:     "M450 180 L230 320",
};
const MESH_LINES: LineId[] = ["lN1N2", "lN1N3", "lN1N4", "lN2N3", "lN2N4", "lN3N4"];

const DOT_PATHS: Record<string, number[][]> = {
  walletToN1: [[340, 74], [340, 90], [155, 90], [155, 110]],
  n1ToN2: [[230, 145], [450, 145]],
  n1ToN3: [[155, 180], [155, 320]],
  n1ToN4: [[230, 180], [450, 320]],
  n2ToN1: [[450, 145], [230, 145]],
  n2ToN3: [[450, 180], [230, 320]],
  n2ToN4: [[525, 180], [525, 320]],
};
const rev = (p: number[][]) => p.slice().reverse();

/* ---------- step scripts (descriptions kept from the original) ----- */

const INTRO_HINT = "Press “Next” or “Play” to meet each participant on the network.";
const INTRO_STEPS: { nodes: NodeId[]; lines: LineId[]; desc: string }[] = [
  { nodes: ["wallet"], lines: [], desc: "MetaMask holds the user's private key locally in the browser. It never joins the P2P network directly — it just signs and submits over JSON-RPC." },
  { nodes: ["node1"], lines: ["lWalletN1"], desc: "Besu Node 1 is MetaMask's configured RPC endpoint — where signed transactions get submitted first." },
  { nodes: ["node2"], lines: [], desc: "Besu Node 2 is a second QBFT validator, an equal peer to Node 1 in consensus." },
  { nodes: ["node3"], lines: [], desc: "Besu Node 3 is a third validator, equal in standing to the other three." },
  { nodes: ["node4"], lines: [], desc: "Besu Node 4 is the fourth validator. QBFT needs at least 3f+1 nodes to tolerate f faulty ones — with 4 nodes, this network tolerates exactly 1 faulty or offline validator." },
  { nodes: [], lines: MESH_LINES, desc: "All four validators gossip transactions and consensus messages directly to each other over a peer-to-peer network — there's no central coordinator or leader server." },
];

const TX_HINT = "Press “Next” or “Play” to walk a transaction from MetaMask to a finalized block.";
const TX_STEPS: {
  desc: string;
  active: NodeId[];
  anim?: "submit" | "gossip" | "preprepare" | "receipt";
  linesAll?: boolean;
}[] = [
  { desc: "The user approves the transaction in MetaMask, which signs it locally with the account's private key — the key never leaves the browser.", active: ["wallet"] },
  { desc: "MetaMask submits the signed raw transaction over JSON-RPC (eth_sendRawTransaction) to Node 1, its configured provider.", active: ["node1"], anim: "submit" },
  { desc: "Node 1 checks the transaction's signature, nonce, and gas, adds it to its local transaction pool, then gossips it to the other three validators over the P2P network.", active: ["node1", "node2", "node3", "node4"], anim: "gossip" },
  { desc: "For this round, Node 2 is the proposer. It assembles pending transactions into a block and broadcasts a PRE-PREPARE message to the other three validators.", active: ["node2"], anim: "preprepare" },
  { desc: "Each validator checks the proposed block and confirms Node 2 is the legitimate proposer for this round, then broadcasts a PREPARE message to everyone else.", active: ["node1", "node2", "node3", "node4"], linesAll: true },
  { desc: "Once a validator collects 2f+1 — 3 of 4 — matching PREPARE messages, it broadcasts a COMMIT message. Once it collects 2f+1 COMMIT messages back, the block is final immediately, with no probabilistic finality and no chance of a later reorg.", active: ["node1", "node2", "node3", "node4"], linesAll: true },
  { desc: "Every validator imports the block into its chain. All four nodes now agree on identical state.", active: ["node1", "node2", "node3", "node4"] },
  { desc: "MetaMask polls Node 1 for the transaction receipt and shows the user their transaction is confirmed.", active: ["wallet"], anim: "receipt" },
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
  const tone: Tone = mark === "committed" ? "emerald" : mark === "proposer" ? "amber" : KIND_TONE[n.kind];
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
  marks = {},
  dotRefs,
}: {
  markerId: string;
  label: string;
  /** when set, nodes/lines outside these sets render dimmed (intro mode) */
  revealedNodes?: Set<NodeId>;
  revealedLines?: Set<LineId>;
  activeNodes: Set<NodeId>;
  flowLines: Set<LineId>;
  marks?: Partial<Record<NodeId, Mark>>;
  dotRefs?: React.RefObject<SVGCircleElement | null>[];
}) {
  return (
    <svg viewBox="0 0 680 460" className="h-full w-full" role="img" aria-label={label}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--static-line)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {(Object.keys(LINES) as LineId[]).map((id) => {
        const flow = flowLines.has(id);
        const dim = revealedLines ? !revealedLines.has(id) : false;
        return (
          <path
            key={id}
            d={LINES[id]}
            fill="none"
            stroke={flow ? toneVar("cyan", "stroke") : "var(--static-line)"}
            strokeWidth={flow ? 2.2 : 0.9}
            markerEnd={id === "lWalletN1" ? `url(#${markerId})` : undefined}
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
          mark={marks[id]}
        />
      ))}

      {dotRefs?.map((ref, i) => (
        <circle key={i} ref={ref} r="5" fill={toneVar("amber", "stroke")} style={{ opacity: 0 }} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Who's in this network                                     */
/* ------------------------------------------------------------------ */

export function BesuNetworkSlide(_: SlideProps) {
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
      kicker="Platforms · 02 · Interactive"
      title={
        <>
          Besu — <span className="text-grad-cool">who’s in this network</span>
        </>
      }
      accent="violet"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <NetworkSvg
              markerId="bf-arrow-intro"
              label="Besu QBFT network diagram that reveals each participant step by step"
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

export function BesuTxSlide(_: SlideProps) {
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
    if (s.anim === "submit") {
      await animateDot(dotA.current, DOT_PATHS.walletToN1, 800, cancelled);
    } else if (s.anim === "gossip") {
      await Promise.all([
        animateDot(dotA.current, DOT_PATHS.n1ToN2, 850, cancelled),
        animateDot(dotB.current, DOT_PATHS.n1ToN3, 850, cancelled),
        animateDot(dotC.current, DOT_PATHS.n1ToN4, 850, cancelled),
      ]);
    } else if (s.anim === "preprepare") {
      await Promise.all([
        animateDot(dotA.current, DOT_PATHS.n2ToN1, 850, cancelled),
        animateDot(dotB.current, DOT_PATHS.n2ToN3, 850, cancelled),
        animateDot(dotC.current, DOT_PATHS.n2ToN4, 850, cancelled),
      ]);
    } else if (s.anim === "receipt") {
      await animateDot(dotA.current, rev(DOT_PATHS.walletToN1), 800, cancelled);
    } else if (s.linesAll) {
      await sleep(700);
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
  const txFlow = new Set<LineId>(txStep >= 0 && TX_STEPS[txStep].linesAll ? MESH_LINES : []);
  /* Node 2's "proposer" mark sticks once assigned, even after the whole
   * network is later marked "committed" — matching the reference HTML,
   * which never clears the .proposer class once it's added. */
  const marks: Partial<Record<NodeId, Mark>> = {};
  if (txStep >= 3) marks.node2 = "proposer";
  if (txStep >= 6) {
    marks.node1 = "committed";
    marks.node3 = "committed";
    marks.node4 = "committed";
    if (!marks.node2) marks.node2 = "committed";
  }
  const txDone = txStep === TX_STEPS.length - 1;
  const txLocked = txBusy || txPlaying || txDone;

  return (
    <SlideShell
      kicker="Platforms · 02 · Interactive"
      title={
        <>
          Besu — <span className="text-grad-cool">the transaction flow</span>
        </>
      }
      accent="violet"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <NetworkSvg
              markerId="bf-arrow-tx"
              label="Besu QBFT diagram with animated transaction and consensus flow"
              activeNodes={txActive}
              flowLines={txFlow}
              marks={marks}
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
            All lines are real, persistent P2P connections — nothing here is a one-off
            request path. The dot shows which connection is actively carrying a message
            at each step; the flash across all six mesh lines represents every validator
            messaging every other validator at once.
          </p>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
