/**
 * A calm, text-first cosmic backdrop for the Learn hero (doc 07-learn §4.1, §8).
 * Two soft, low-opacity neon glows — no motion, no WebGL, fully reduced-motion-safe.
 * Decorative only (`aria-hidden`); all colors come from theme tokens (no raw hex).
 */
export function LearnBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
      <div className="absolute -top-48 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-cyan/10 blur-3xl" />
      <div className="absolute -top-24 right-[6%] size-[360px] rounded-full bg-violet/10 blur-3xl" />
      <div className="absolute -top-32 left-[4%] size-[280px] rounded-full bg-cyan/5 blur-3xl" />
    </div>
  );
}

export default LearnBackdrop;
