/**
 * Plain-language dictionary (doc 03 §6) powering the <Term> component and Simple-mode copy.
 * Every acronym in the product flows through this map: plain label first, jargon on demand.
 */

export type TermKey =
  | "tca"
  | "miss-distance"
  | "pc"
  | "conjunction"
  | "delta-v"
  | "along-track"
  | "secondary-screening"
  | "norad-id"
  | "tle"
  | "leo"
  | "covariance"
  | "propagation"
  | "relative-velocity"
  | "kessler";

export interface TermDef {
  /** Plain default label shown if no children (e.g. "Closest approach"). */
  label: string;
  /** Technical/full name (e.g. "Time of Closest Approach (TCA)"). */
  full: string;
  /** One-line tooltip definition (doc 03 §6). */
  short: string;
  /** Anchor on /learn; defaults to the key. */
  learnAnchor?: string;
}

export const TERMS: Record<TermKey, TermDef> = {
  tca: {
    label: "Closest approach (time)",
    full: "Time of Closest Approach (TCA)",
    short: "When the two objects are nearest."
  },
  "miss-distance": {
    label: "How close",
    full: "Miss distance",
    short: "The smallest gap between them."
  },
  pc: {
    label: "Collision chance",
    full: "Probability of collision (Pc)",
    short: "How likely a crash is, e.g. ‘1 in 3,600’."
  },
  conjunction: {
    label: "Close approach",
    full: "Conjunction",
    short: "Two objects passing dangerously near each other."
  },
  "delta-v": {
    label: "Nudge",
    full: "Delta-v (Δv)",
    short: "How hard we push the satellite to change its path."
  },
  "along-track": {
    label: "Speed-up / slow-down nudge",
    full: "Along-track maneuver",
    short: "Changing speed along the orbit to shift timing."
  },
  "secondary-screening": {
    label: "Double-check",
    full: "Secondary screening",
    short: "Making sure the new path isn’t near anything else."
  },
  "norad-id": {
    label: "Catalog number",
    full: "NORAD ID",
    short: "The official ID number for a tracked object."
  },
  tle: {
    label: "Orbit data",
    full: "Two-Line Element set (TLE)",
    short: "The standard data describing an object’s orbit."
  },
  leo: {
    label: "Low orbit",
    full: "Low Earth Orbit (LEO)",
    short: "A close-to-Earth orbit (under ~2,000 km)."
  },
  covariance: {
    label: "Margin of error",
    full: "Covariance / uncertainty",
    short: "How unsure we are about exact positions."
  },
  propagation: {
    label: "Orbit prediction",
    full: "Propagation",
    short: "Calculating where an object will be over time."
  },
  "relative-velocity": {
    label: "Closing speed",
    full: "Relative velocity",
    short: "How fast the two objects approach each other."
  },
  kessler: {
    label: "Debris chain reaction",
    full: "Kessler syndrome",
    short: "Collisions creating debris that cause more collisions."
  }
};
