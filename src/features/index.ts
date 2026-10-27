import type { Feature } from "../runtime/feature";
import { alliancePanel } from "./alliance-panel";
import { allianceView } from "./alliance-view";
import { hotbarReadout } from "./hotbar";
import { troopBar } from "./troop-bar";

/**
 * Every feature the package ships, in the order they attach.
 *
 * Four belong here in the end. The troop bar readout is the first, and it is
 * where the visual language the other three inherit was written. The alliance
 * view mode is the only one that draws on the map rather than in the HUD. The
 * alliance panel is the only readout that draws outside the bottom row.
 */
export const FEATURES: readonly Feature[] = [
  troopBar,
  hotbarReadout,
  allianceView,
  alliancePanel,
];
