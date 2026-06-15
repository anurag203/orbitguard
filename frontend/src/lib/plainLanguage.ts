/** Rewrite backend/fixture technical tokens before they reach Simple-mode UI text. */
export function plainifyJargon(text: string): string {
  return text
    .replace(/\blow[-\s]?delta[-\s]?v\b/giu, "small nudge")
    .replace(/\bdelta[-\s]?v\b|Δv|δv/giu, "small nudge")
    .replace(/\bTCA\b/gu, "closest moment")
    .replace(/\bPc\b/gu, "crash chance")
    .replace(/\bSGP4\b/giu, "orbit prediction")
    .replace(/\bRAAN\b/gu, "orbital angle")
    .replace(/\bmiss distance\b/giu, "how close they pass")
    .replace(/\brelative velocity\b/giu, "closing speed")
    .replace(/\bsecondary screening\b/giu, "double-check")
    .replace(/\bcatalog object\b/giu, "tracked object")
    .replace(/\brocket body\b/giu, "space junk")
    .replace(/\bcovariance\b/giu, "margin of error")
    .replace(/\bconjunctions\b/giu, "close approaches")
    .replace(/\bconjunction\b/giu, "close approach")
    .replace(/\bmaneuvers\b/giu, "safe moves")
    .replace(/\bmaneuver\b/giu, "safe move")
    .replace(/\bburns\b/giu, "nudges")
    .replace(/\bburn\b/giu, "nudge");
}
