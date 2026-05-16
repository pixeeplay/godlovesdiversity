/**
 * GLD V1 — Zone 1 : Accroche pure typo
 * "L'amour est universel." Transition visuelle entre Hero et la suite.
 */
export function AccrocheZone({ text = "L'amour est universel." }: { text?: string }) {
  return (
    <section
      className="relative py-28 md:py-40"
      style={{ background: 'var(--bg)' }}
    >
      <div className="container-wide text-center">
        <h2
          className="font-display font-black tracking-tight neon-title leading-[0.95]"
          style={{ fontSize: 'clamp(3rem, 10vw, 10rem)' }}
        >
          {text}
        </h2>
      </div>
    </section>
  );
}
