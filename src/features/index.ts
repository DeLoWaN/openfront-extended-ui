import type { Feature } from "../runtime/feature";
import { allianceView } from "./alliance-view";
import { troopBar } from "./troop-bar";

/**
 * Every feature the package ships, in the order they attach.
 *
 * Six belong here in the end. The troop bar readout is the first, and it is
 * where the visual language the other five inherit was written. The alliance
 * view mode is the only one that draws on the map rather than in the HUD.
 */
export const FEATURES: readonly Feature[] = [troopBar, allianceView];
