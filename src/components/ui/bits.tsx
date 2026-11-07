import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { onRovingKeyDown, rovingTabIndex } from './roving';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

/* ---------- Toast: a paper slip that drops in from the top ---------- */
const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null);
  const show = useCallback((text: string) => {
    const id = Date.now();
    setMessage({ id, text });
    window.setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
      <div className="fixed inset-x-0 top-[calc(10px+var(--safe-t))] z-[60] flex justify-center pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {message && (
            <motion.div
              key={message.id}
              initial={{ y: -40, opacity: 0, rotate: -2 }}
              animate={{ y: 0, opacity: 1, rotate: -1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="card px-4 py-3 t-label flex items-center gap-2"
              style={{ boxShadow: 'var(--shadow-lift)' }}
            >
              <span className="inline-grid place-items-center w-6 h-6 rounded-full" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
                <Check size={15} strokeWidth={3} />
              </span>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- AiText: renders the helper's light markdown (paragraphs, - bullets, **bold**) ---------- */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

export function AiText({ text, className = '' }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`u${blocks.length}`}>
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (/^([-*•]|\d+\.)\s+/.test(line)) {
      list.push(line.replace(/^([-*•]|\d+\.)\s+/, ''));
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ''))}</p>);
  }
  flush();
  return <div className={`prose-ai ${className}`}>{blocks}</div>;
}

/* ---------- CopyButton ---------- */
export function CopyButton({ value, label = 'Copy', className = 'btn btn-sm' }: { value: string; label?: string; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast('Copied');
        } catch {
          toast(value);
        }
      }}
    >
      <Copy size={17} strokeWidth={2.4} />
      {label}
    </button>
  );
}

/* ---------- Thinking: a running stitch being sewn while the AI works ---------- */
export function Thinking({ label = 'Thinking' }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-2 ink-2 t-small" role="status">
      <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden className="shrink-0">
        <motion.path
          d="M2 6 C 8 2, 12 10, 18 6 S 26 2, 28 6"
          fill="none"
          stroke="var(--yarn)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="4 4"
          animate={reduce ? undefined : { strokeDashoffset: [0, -16] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </svg>
      {label}
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={(e) => onRovingKeyDown(e)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={rovingTabIndex(i, options.findIndex((x) => x.value === value))}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Small "who" stack of flower badges ---------- */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mt-8 mb-3">
      <h2 className="t-head">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Round seed check used by radio/checkbox rows ---------- */
export function SeedMark({ on }: { on: boolean }) {
  return (
    <span className="seed" aria-hidden>
      {on && <Check size={16} strokeWidth={3.2} />}
    </span>
  );
}
