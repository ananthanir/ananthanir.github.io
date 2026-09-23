import type { FC } from "react";
import type { SlideProps, Tone } from "../components/ui";
import { BesuSlide, CordaSlide, FabricSlide } from "./platforms";
import { FabricNetworkSlide, FabricTxSlide } from "./fabric-flow";
import { BesuNetworkSlide, BesuTxSlide } from "./besu-flow";
import { CordaNetworkSlide, CordaStateFlowSlide, CordaTxSlide } from "./corda-flow";
import { ContractAddressSlide, EoaAddressSlide } from "./eth-address-flow";
import { EtherUnitsSlide } from "./ether-units";
import { GasCostSlide } from "./gas-cost";
import { MenuSlide } from "./menu";

export type SlideDef = {
  /** stable id — used by the menu / goTo links */
  id: string;
  /** section label shown in the bottom-left chrome */
  section: string;
  component: FC<SlideProps>;
};

export type Platform = {
  /** stable id — matches the menu card's id, and the platform's first slide id */
  id: string;
  name: string;
  tone: Tone;
  slides: SlideDef[];
};

/** The landing card menu. Not part of any platform's flow — `goTo("menu")`
 *  always returns here, and leaving the start/end of a platform's slides
 *  (via arrow keys) lands back here too. */
export const MENU_SLIDE: SlideDef = { id: "menu", section: "Menu", component: MenuSlide };

export const PLATFORMS: Platform[] = [
  {
    id: "fabric",
    name: "Hyperledger Fabric",
    tone: "cyan",
    slides: [
      { id: "fabric", section: "Fabric", component: FabricSlide },
      { id: "fabric-network", section: "Fabric", component: FabricNetworkSlide },
      { id: "fabric-tx", section: "Fabric", component: FabricTxSlide },
    ],
  },
  {
    id: "besu",
    name: "Hyperledger Besu",
    tone: "violet",
    slides: [
      { id: "besu", section: "Besu", component: BesuSlide },
      { id: "besu-network", section: "Besu", component: BesuNetworkSlide },
      { id: "besu-tx", section: "Besu", component: BesuTxSlide },
    ],
  },
  {
    id: "corda",
    name: "R3 Corda",
    tone: "rose",
    slides: [
      { id: "corda", section: "Corda", component: CordaSlide },
      { id: "corda-network", section: "Corda", component: CordaNetworkSlide },
      { id: "corda-state-flow", section: "Corda", component: CordaStateFlowSlide },
      { id: "corda-tx", section: "Corda", component: CordaTxSlide },
    ],
  },
  {
    id: "eth-address",
    name: "Ethereum Addresses",
    tone: "amber",
    slides: [
      { id: "eth-address", section: "Ethereum Addresses", component: EoaAddressSlide },
      { id: "eth-contract-address", section: "Ethereum Addresses", component: ContractAddressSlide },
    ],
  },
  {
    id: "ether-units",
    name: "Ether Denominations",
    tone: "emerald",
    slides: [{ id: "ether-units", section: "Ether Denominations", component: EtherUnitsSlide }],
  },
  {
    id: "gas-cost",
    name: "Tx Cost Calculation",
    tone: "orange",
    slides: [{ id: "gas-cost", section: "Tx Cost Calculation", component: GasCostSlide }],
  },
];
