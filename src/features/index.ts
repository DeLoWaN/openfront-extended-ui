import type { Feature } from "../runtime/feature";
import { troopBar } from "./troop-bar";

/**
 * Every feature the package ships, in the order they attach.
 *
 * Six belong here in the end. The troop bar readout is the first, and it is
 * where the visual language the other five inherit was written.
 */
export const FEATURES: readonly Feature[] = [troopBar];
