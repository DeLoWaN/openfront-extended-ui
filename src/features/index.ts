import type { Feature } from "../runtime/feature";
import { alliancePanel } from "./alliance-panel";
import { allianceView } from "./alliance-view";
import { hotbarReadout } from "./hotbar";
import { nationHatch } from "./nation-hatch";
import { spawnMarks } from "./spawn-marks";
import { troopBar } from "./troop-bar";

/**
 * Every feature the package ships, in the order they attach.
 *
 * The troop bar readout is the first, and it is where the visual language the
 * others inherit was written. The alliance view mode, the spawn marks and
 * the nation hatch draw on the map rather than in the HUD. The alliance panel
 * is the only readout that draws outside the bottom row.
 */
export const FEATURES: readonly Feature[] = [
  troopBar,
  hotbarReadout,
  allianceView,
  spawnMarks,
  nationHatch,
  alliancePanel,
];
