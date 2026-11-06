import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the visible title row (the title stays as the accessible name). */
  hideTitle?: boolean;
  full?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional element shown at the left of the header, e.g. a back button. */
  leading?: React.ReactNode;
}

let openSheets = 0;

/** A paper sheet that slides up from the bottom. Drag down or press Escape to close. */
export function Sheet({ open, onClose, title, hideTitle, full, children, footer, leading }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const drag = useDragControls();
  // Callers pass inline closures; keep the latest one without re-running the open effect,
  // which would steal focus from inputs on every parent render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    openSheets += 1;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 60);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      openSheets -= 1;
      if (openSheets <= 0) document.body.style.overflow = '';
      restoreRef.current?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <React.Fragment key="sheet">
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`sheet ${full ? 'sheet-full' : ''}`}
            style={{ x: '-50%', outline: 'none' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag={full ? false : 'y'}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {!full && (
              <div className="pt-1 pb-1 touch-none cursor-grab" onPointerDown={(e) => drag.start(e)}>
                <div className="sheet-grab" />
              </div>
            )}
            <div
              className={`flex items-center gap-2 px-4 ${full ? 'pt-[calc(12px+var(--safe-t))]' : 'pt-1'} pb-2 ${hideTitle ? 'justify-end' : ''}`}
              onPointerDown={full ? undefined : (e) => drag.start(e)}
            >
              {leading}
              <h2 id={titleId} className={hideTitle ? 'sr-only' : 't-head flex-1 pl-1 truncate'}>
                {title}
              </h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={20} strokeWidth={2.4} />
              </button>
            </div>
            <div className="sheet-body flex-1">{children}</div>
            {footer && (
              <div className="px-5 pt-3 pb-[calc(16px+var(--safe-b))] border-t" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
}
