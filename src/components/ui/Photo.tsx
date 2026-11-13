import React, { useState } from 'react';

/**
 * A photo from an outside source. It fades in once loaded, and if it fails it removes itself
 * (and calls onFail), so a card never shows a broken image.
 */
export function Photo({ src, alt = '', className = '', onFail }: { src: string; alt?: string; className?: string; onFail?: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`photo ${className}`}
      data-ready={state === 'ready' || undefined}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onLoad={() => setState('ready')}
      onError={() => {
        setState('failed');
        onFail?.();
      }}
    />
  );
}
