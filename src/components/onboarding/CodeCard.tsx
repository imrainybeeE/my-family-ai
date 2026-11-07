import React from 'react';

/** The family code on card stock. Everyone else types it to join. */
export function CodeCard({ code, children }: { code: string; children?: React.ReactNode }) {
  return (
    <section className="stock stock-sky">
      <h2 className="t-label opacity-80">Invite with your family code</h2>
      <p
        className="mt-1 font-bold tabular-nums"
        style={{ fontSize: '1.75rem', lineHeight: '34px', letterSpacing: '0.04em' }}
        aria-label={`Family code ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
