import type { Feature } from "../runtime/feature";
import { tickMarker } from "./tick-marker";

/**
 * Every feature the package ships, in the order they attach.
 *
 * Six belong here in the end. The only entry now is a throwaway that proves the
 * skeleton works, and the troop bar readout replaces it.
 */
export const FEATURES: readonly Feature[] = [tickMarker];
