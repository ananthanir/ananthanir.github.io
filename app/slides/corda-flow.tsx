"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, Reveal, SlideShell, toneVar, type SlideProps, type Tone } from "../components/ui";
import { Btn, StepDots, animateDot, sleep } from "../components/flow-kit";

/* ------------------------------------------------------------------ */
/* Corda, step by step — one page per diagram                          */
/*     Ported from corda_notary_transaction_flow.html.                 */
/* ------------------------------------------------------------------ */

type NodeId = "partyA" | "partyB" | "notaryAlpha" | "partyC" | "partyD" | "partyE" | "notaryBeta";
type DecorId = "circleAlpha" | "circleBeta" | "labelAlpha" | "labelBeta";
type ElementId = NodeId | DecorId;
type Kind = "party" | "notary";
type Mark = "recorded";

/* party=cyan/teal, notary=violet — exact match to the reference HTML's
 * #0F6E56 party color and #534AB7 notary color (see globals.css). */
const KIND_TONE: Record<Kind, Tone> = { party: "cyan", notary: "violet" };

const NODES: Record<NodeId, { x: number; y: number; w: number; h: number; kind: Kind; title: string; sub: string }> = {
  partyA:      { x: 85,  y: 133, w: 110, h: 54, kind: "party",  title: "Party A", sub: "Alpha member" },
  partyB:      { x: 85,  y: 313, w: 110, h: 54, kind: "party",  title: "Party B", sub: "Alpha member" },
  notaryAlpha: { x: 170, y: 377, w: 120, h: 46, kind: "notary", title: "Notary Alpha", sub: "Uniqueness service" },
  partyC:      { x: 280, y: 217, w: 140, h: 66, kind: "party",  title: "Party C", sub: "Member of Alpha + Beta" },
  partyD:      { x: 505, y: 133, w: 110, h: 54, kind: "party",  title: "Party D", sub: "Beta member" },
  partyE:      { x: 505, y: 313, w: 110, h: 54, kind: "party",  title: "Party E", sub: "Beta member" },
  notaryBeta:  { x: 410, y: 377, w: 120, h: 46, kind: "notary", title: "Notary Beta", sub: "Uniqueness service" },
};
const ALL_NODE_IDS = Object.keys(NODES) as NodeId[];

/* In the transaction diagram, everyone outside the deal is relabelled —
 * nobody is dimmed, they're just shown as bystanders. */
const NOT_INVOLVED_SUB: Partial<Record<NodeId, string>> = {
  partyB: "Not involved",
  partyD: "Not involved",
  partyE: "Not involved",
  notaryBeta: "Not involved",
};

/* ---------- shared presentational pieces ---------------------------- */

function Box({
  id,
  dim,
  active,
  mark,
  subOverride,
}: {
  id: NodeId;
  dim: boolean;
  active: boolean;
  mark?: Mark;
  subOverride?: string;
}) {
  const n = NODES[id];
  const tone: Tone = mark === "recorded" ? "emerald" : KIND_TONE[n.kind];
  const fill = mark === "recorded" ? toneVar("emerald", "strong-wash") : toneVar(tone, "wash");
  const stroke = toneVar(tone, "stroke");
  const title = mark === "recorded" ? toneVar("emerald", "strong-text") : toneVar(tone, "text");
  const sub = toneVar(tone, "stroke");
  return (
    <g style={{ opacity: dim ? 0.22 : 1, transition: "opacity .35s" }}>
      <rect
        x={n.x} y={n.y} width={n.w} height={n.h} rx={8}
        fill={fill} stroke={stroke} strokeWidth={active ? 2.5 : 0.75}
        style={{
          filter: active ? `drop-shadow(0 0 6px ${stroke})` : undefined,
          transition: "stroke-width .2s, fill .25s",
        }}
      />
      <text
        x={n.x + n.w / 2} y={n.y + n.h / 2 - 8}
        textAnchor="middle" dominantBaseline="central"
        fontSize="13" fontWeight="600" fill={title}
      >
        {n.title}
      </text>
      <text
        x={n.x + n.w / 2} y={n.y + n.h / 2 + 10}
        textAnchor="middle" dominantBaseline="central"
        fontSize="11" fill={sub}
      >
        {subOverride ?? n.sub}
      </text>
    </g>
  );
}

function NetworkDecor({
  dimAlpha,
  dimBeta,
  dimLabelAlpha,
  dimLabelBeta,
}: {
  dimAlpha: boolean;
  dimBeta: boolean;
  dimLabelAlpha: boolean;
  dimLabelBeta: boolean;
}) {
  return (
    <>
      <circle
        cx="230" cy="250" r="190" fill="none" stroke="var(--guide-line)" strokeWidth="1.5" strokeDasharray="5 4"
        style={{ opacity: dimAlpha ? 0.22 : 1, transition: "opacity .35s" }}
      />
      <circle
        cx="470" cy="250" r="190" fill="none" stroke="var(--guide-line)" strokeWidth="1.5" strokeDasharray="5 4"
        style={{ opacity: dimBeta ? 0.22 : 1, transition: "opacity .35s" }}
      />
      <text
        x="150" y="75" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--static-line)"
        style={{ opacity: dimLabelAlpha ? 0.22 : 1, transition: "opacity .35s" }}
      >
        BUSINESS NETWORK ALPHA
      </text>
      <text
        x="550" y="75" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--static-line)"
        style={{ opacity: dimLabelBeta ? 0.22 : 1, transition: "opacity .35s" }}
      >
        BUSINESS NETWORK BETA
      </text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Who's in this network                                     */
/* ------------------------------------------------------------------ */

const INTRO_STEPS: { elements: ElementId[]; desc: string }[] = [
  { elements: ["circleAlpha", "circleBeta", "labelAlpha", "labelBeta"], desc: "This example has two separate business networks — each a distinct group of Corda nodes that have agreed to transact with each other." },
  { elements: ["partyA"], desc: "Party A is a member of Business Network Alpha." },
  { elements: ["partyB"], desc: "Party B is also a member of Alpha." },
  { elements: ["notaryAlpha"], desc: "Notary Alpha is Alpha's uniqueness service. It doesn't process transaction logic — it only confirms that a given state hasn't already been consumed elsewhere." },
  { elements: ["partyC"], desc: "Party C sits in the overlap — a full member of both Alpha and Beta, able to transact in either network under the same legal identity." },
  { elements: ["partyD"], desc: "Party D is a member of Business Network Beta." },
  { elements: ["partyE"], desc: "Party E is also a member of Beta." },
  { elements: ["notaryBeta"], desc: "Notary Beta is Beta's own uniqueness service — entirely independent of Notary Alpha, with its own separate record of consumed states." },
  { elements: [], desc: "Unlike Fabric's channels or Besu's always-on P2P mesh, none of these nodes hold a persistent connection to each other. Every link on the next slide exists only for the duration of one transaction, between the specific parties involved." },
];

export function CordaNetworkSlide(_: SlideProps) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const gen = useRef(0);

  useEffect(() => () => { gen.current++; }, []);

  const play = async () => {
    const g = ++gen.current;
    setPlaying(true);
    for (let i = step + 1; i < INTRO_STEPS.length; i++) {
      if (gen.current !== g) return;
      setStep(i);
      await sleep(1100);
    }
    if (gen.current === g) setPlaying(false);
  };

  const reset = () => {
    gen.current++;
    setPlaying(false);
    setStep(-1);
  };

  const revealed = new Set<ElementId>();
  for (let k = 0; k <= step; k++) INTRO_STEPS[k].elements.forEach((e) => revealed.add(e));
  const active = new Set<ElementId>(step >= 0 ? INTRO_STEPS[step].elements : []);
  const done = step === INTRO_STEPS.length - 1;

  return (
    <SlideShell
      kicker="Platforms · 03 · Interactive"
      title={
        <>
          Corda — <span className="text-grad-warm">who’s in this network</span>
        </>
      }
      accent="rose"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <svg viewBox="0 0 700 480" className="h-full w-full" role="img" aria-label="Corda network diagram that reveals each participant step by step">
              <NetworkDecor
                dimAlpha={!revealed.has("circleAlpha")}
                dimBeta={!revealed.has("circleBeta")}
                dimLabelAlpha={!revealed.has("labelAlpha")}
                dimLabelBeta={!revealed.has("labelBeta")}
              />
              {ALL_NODE_IDS.map((id) => (
                <Box key={id} id={id} dim={!revealed.has(id)} active={active.has(id)} />
              ))}
            </svg>
          </div>
          <div className="text-muted mt-5 min-h-[64px] text-base leading-relaxed">
            {step >= 0 ? INTRO_STEPS[step].desc : "Press “Next” or “Play” to meet each participant."}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Btn primary onClick={play} disabled={playing || done}>
              Play
            </Btn>
            <Btn onClick={() => setStep((i) => Math.min(INTRO_STEPS.length - 1, i + 1))} disabled={playing || done}>
              Next
            </Btn>
            <Btn onClick={reset}>Reset</Btn>
            <StepDots count={INTRO_STEPS.length} current={step} />
          </div>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · State, contract, and flow — static diagram, no stepper     */
/* ------------------------------------------------------------------ */

function StaticBox({
  x, y, w, h, tone, title, lines,
}: {
  x: number; y: number; w: number; h: number; tone: Tone; title: string; lines: string[];
}) {
  const titleY = y + 22;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={toneVar(tone, "wash")} stroke={toneVar(tone, "stroke")} strokeWidth="0.75" />
      <text x={x + w / 2} y={titleY} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="600" fill={toneVar(tone, "text")}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={line}
          x={x + w / 2} y={titleY + 20 + i * 16}
          textAnchor="middle" dominantBaseline="central" fontSize="12" fill={toneVar(tone, "stroke")}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function CordaStateFlowSlide(_: SlideProps) {
  return (
    <SlideShell
      kicker="Platforms · 03 · Interactive"
      title={
        <>
          Corda — <span className="text-grad-warm">state, contract &amp; flow</span>
        </>
      }
      accent="rose"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <svg viewBox="0 0 700 260" className="h-full w-full max-w-4xl" role="img" aria-label="Diagram showing how a Corda state, contract, and flow combine to produce a transaction">
              <defs>
                <marker id="cf-arrow-static" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="var(--static-line)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>
              <path d="M135 120 L135 145 L300 145 L300 168" fill="none" stroke="var(--static-line)" strokeWidth="0.9" markerEnd="url(#cf-arrow-static)" />
              <line x1="350" y1="120" x2="350" y2="168" stroke="var(--static-line)" strokeWidth="0.9" markerEnd="url(#cf-arrow-static)" />
              <path d="M565 120 L565 145 L400 145 L400 168" fill="none" stroke="var(--static-line)" strokeWidth="0.9" markerEnd="url(#cf-arrow-static)" />

              <StaticBox x={40} y={30} w={190} h={90} tone="cyan" title="State" lines={["IOUState(lender,", "borrower, amount)", "An immutable fact"]} />
              <StaticBox x={255} y={30} w={190} h={90} tone="violet" title="Contract" lines={["IOUContract.verify()", "amount > 0, both", "parties must sign"]} />
              <StaticBox x={470} y={30} w={190} h={90} tone="cyan" title="Flow" lines={["IOUFlow.Initiator /", ".Responder", "Sends the messages"]} />
              <StaticBox x={255} y={170} w={190} h={60} tone="violet" title="Transaction" lines={["consumes + creates states"]} />
            </svg>
          </div>
          <p className="text-muted mt-5 text-base leading-relaxed">
            A <b className="text-fg">state</b> is data — never edited, only consumed and
            replaced. A <b className="text-fg">contract</b>’s verify() is pure code every
            party runs independently — no central endorser decides validity. A{" "}
            <b className="text-fg">flow</b> is the actual message-passing code — the next
            slide is one flow, animated step by step.
          </p>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 3 · How a transaction flows through it                        */
/* ------------------------------------------------------------------ */

type ChipTone = "amber" | "emerald";
type LineId = "lineAtoC" | "lineAtoNotary" | "lineCtoNotary";

const TX_LINES: Record<LineId, string> = {
  lineAtoC: "M195 160 L280 225",
  lineAtoNotary: "M140 187 L140 290 L230 290 L230 377",
  lineCtoNotary: "M300 283 L300 320 L230 320",
};
const TX_PATHS = {
  AtoC: [[195, 160], [280, 225]],
  AtoNotary: [[140, 187], [140, 290], [230, 290], [230, 377]],
};
const rev = (p: number[][]) => p.slice().reverse();

const TX_STEPS: {
  desc: string;
  active: NodeId[];
  anim?: "AtoC" | "CtoA" | "AtoNotary" | "NotarytoA";
  line?: LineId;
}[] = [
  { desc: "Party A's node assembles a proposed transaction inside IOUFlow.Initiator, drawing on an input IOU state it already holds in its own local vault.", active: ["partyA"] },
  { desc: "IOUFlow.Initiator opens a FlowSession and sends the proposed transaction directly to Party C — peer-to-peer, not broadcast to Party B or anyone else.", active: ["partyA", "partyC"], anim: "AtoC", line: "lineAtoC" },
  { desc: "Party C's IOUFlow.Responder independently runs IOUContract.verify() against the proposed transaction — checking rules like amount > 0 and that both lender and borrower must sign — rather than trusting someone else's endorsement.", active: ["partyC"] },
  { desc: "Satisfied by the contract check, Party C signs via SignTransactionFlow and sends the signed transaction back to Party A.", active: ["partyC", "partyA"], anim: "CtoA", line: "lineAtoC" },
  { desc: "Once Party A holds every required signature (via CollectSignaturesFlow), it calls NotaryFlow.Client to send the fully-signed transaction to Notary Alpha — not for validity, only to prove none of the input states have already been spent.", active: ["partyA", "notaryAlpha"], anim: "AtoNotary", line: "lineAtoNotary" },
  { desc: "Notary Alpha checks its own private record of consumed states. No conflict here, so it signs to attest uniqueness.", active: ["notaryAlpha"] },
  { desc: "Notary Alpha returns its signature to Party A, completing the transaction's uniqueness proof.", active: ["notaryAlpha", "partyA"], anim: "NotarytoA", line: "lineAtoNotary" },
  { desc: "Party A's flow calls FinalityFlow, relaying the fully notarized transaction to Party C so both sides can record it.", active: ["partyA", "partyC"], anim: "AtoC", line: "lineAtoC" },
  { desc: "FinalityFlow (and ReceiveFinalityFlow on Party C's side) commits the transaction to each vault: the input IOU state is consumed, and a new output IOU state is created for both. Party B, Party D, Party E, and Notary Beta never see it — they had no need to know.", active: ["partyA", "partyC"] },
];

function StateChip({
  x, y, tone, label, visible,
}: {
  x: number; y: number; tone: ChipTone; label: string; visible: boolean;
}) {
  return (
    <g style={{ opacity: visible ? 1 : 0, transition: "opacity .4s" }}>
      <rect x={x} y={y} width="110" height="28" rx="14" fill={toneVar(tone, "wash")} stroke={toneVar(tone, "stroke")} strokeWidth="0.75" />
      <text x={x + 55} y={y + 14} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={toneVar(tone, "text")}>
        {label}
      </text>
    </g>
  );
}

export function CordaTxSlide(_: SlideProps) {
  const [txStep, setTxStep] = useState(-1);
  const [txBusy, setTxBusy] = useState(false);
  const [txPlaying, setTxPlaying] = useState(false);
  const txGen = useRef(0);
  const dotA = useRef<SVGCircleElement | null>(null);

  useEffect(() => () => { txGen.current++; }, []);

  const runTx = async (i: number) => {
    const gen = txGen.current;
    const cancelled = () => txGen.current !== gen;
    setTxBusy(true);
    setTxStep(i);
    const s = TX_STEPS[i];
    if (s.anim === "AtoC") {
      await animateDot(dotA.current, TX_PATHS.AtoC, 800, cancelled);
    } else if (s.anim === "CtoA") {
      await animateDot(dotA.current, rev(TX_PATHS.AtoC), 800, cancelled);
    } else if (s.anim === "AtoNotary") {
      await animateDot(dotA.current, TX_PATHS.AtoNotary, 900, cancelled);
    } else if (s.anim === "NotarytoA") {
      await animateDot(dotA.current, rev(TX_PATHS.AtoNotary), 900, cancelled);
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
  const activeLine = txStep >= 0 ? TX_STEPS[txStep].line : undefined;
  const lastStep = TX_STEPS.length - 1;
  const chipInput = txStep >= 0 && txStep < lastStep;
  const chipOutputs = txStep >= lastStep;
  const marks: Partial<Record<NodeId, Mark>> = chipOutputs ? { partyA: "recorded", partyC: "recorded" } : {};
  const txDone = txStep === lastStep;
  const txLocked = txBusy || txPlaying || txDone;

  return (
    <SlideShell
      kicker="Platforms · 03 · Interactive"
      title={
        <>
          Corda — <span className="text-grad-warm">the transaction flow</span>
        </>
      }
      accent="rose"
    >
      <Reveal delay={150} className="h-full">
        <Panel className="flex h-full flex-col p-6 sm:p-8">
          <div className="min-h-0 flex-1 items-center justify-center flex">
            <svg viewBox="0 0 700 480" className="h-full w-full" role="img" aria-label="Corda diagram with animated point-to-point transaction flow">
              <defs>
                <marker id="cf-arrow-tx" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="var(--static-line)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              <NetworkDecor dimAlpha={false} dimBeta={false} dimLabelAlpha={false} dimLabelBeta={false} />

              {(Object.keys(TX_LINES) as LineId[]).map((id) => {
                const isActive = activeLine === id;
                return (
                  <path
                    key={id}
                    d={TX_LINES[id]}
                    fill="none"
                    stroke={isActive ? toneVar("cyan", "stroke") : "var(--static-line)"}
                    strokeWidth={isActive ? 2 : 0.9}
                    markerEnd="url(#cf-arrow-tx)"
                    style={{ opacity: isActive ? 1 : 0, transition: "opacity .3s, stroke .2s" }}
                  />
                );
              })}

              {ALL_NODE_IDS.map((id) => (
                <Box key={id} id={id} dim={false} active={txActive.has(id)} mark={marks[id]} subOverride={NOT_INVOLVED_SUB[id]} />
              ))}

              <circle ref={dotA} r="5" fill={toneVar("violet", "stroke")} style={{ opacity: 0 }} />

              <StateChip x={85} y={98} tone="amber" label="IOU (input)" visible={chipInput} />
              <StateChip x={85} y={98} tone="emerald" label="IOU (new)" visible={chipOutputs} />
              <StateChip x={285} y={185} tone="emerald" label="IOU (new)" visible={chipOutputs} />
            </svg>
          </div>
          <div className="text-muted mt-5 min-h-[64px] text-base leading-relaxed">
            {txStep >= 0 ? TX_STEPS[txStep].desc : "Press “Next” or “Play” to walk through a single trade between Party A and Party C."}
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
            Every line here is transient — drawn only because this specific transaction
            needs it. Party B, Party D, Party E, and Notary Beta never see any of it.
          </p>
        </Panel>
      </Reveal>
    </SlideShell>
  );
}
