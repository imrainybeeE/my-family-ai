import React from 'react';

/** The family code on stitched card stock. Everyone else types it to join. */
export function CodeCard({ code, children }: { code: string; children?: React.ReactNode }) {
  return (
    <section className="stock stock-sky stitched px-5 pt-5 pb-5">
      <p className="t-label opacity-80">Family code</p>
      <p
        className="mt-1 font-extrabold tabular-nums"
        style={{ fontSize: '2rem', lineHeight: 1.1, letterSpacing: '0.04em' }}
        aria-label={`Family code ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
