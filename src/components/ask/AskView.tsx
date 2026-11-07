import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useAiResource } from '../../hooks/useFamily';
import { ai, aiErrorMessage, ChatTurn, streamChat } from '../../services/ai';
import { PageHeader } from '../layout/TabBar';
import { AiText, Thinking } from '../ui/bits';
import { Felt } from '../art/Flower';
import { feel } from '../../feel/feel';

/** The six guided questions from the project brief, always available. */
const GUIDED = [
  'What does my child enjoy most?',
  'How does my child prefer to be supported?',
  'What do we have in common?',
  'Where are we different?',
  'Suggest something we could enjoy together',
  'What could I ask my family member to understand them better?',
];

/** Shown when personal suggestions can't be fetched; they fit anyone in the family. */
const NEUTRAL = ['What do we have in common?', 'What could we do this weekend?', 'What should we eat tonight?'];

interface Msg extends ChatTurn {
  id: string;
  error?: boolean;
}

export function AskView() {
  const { brief, activeMember } = useHousehold();
  const ui = useUI();
  const storeKey = `mfa:chat:${activeMember?.id}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storeKey) || '[]');
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped by every send and New chat, so a reply or follow-up from an older chat is dropped.
  const genRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const [composerH, setComposerH] = useState(54);
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setComposerH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const starters = useAiResource('starters', brief, (signal) => ai.suggest(brief, undefined, signal), messages.length === 0);

  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(messages.filter((m) => !m.error)));
    } catch {
      // ignore
    }
  }, [messages, storeKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const scrollDown = () => window.requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));

  const send = useCallback(
    async (text: string, base?: Msg[]) => {
      const q = text.trim();
      if (!q || busy) return;
      const gen = ++genRef.current;
      feel('send');
      setInput('');
      setFollowUps([]);
      const history: Msg[] = [...(base ?? messages).filter((m) => !m.error), { id: `u${Date.now()}`, role: 'user', content: q }];
      const replyId = `a${Date.now()}`;
      setMessages([...history, { id: replyId, role: 'assistant', content: '' }]);
      setBusy(true);
      scrollDown();
      const controller = new AbortController();
      abortRef.current = controller;
      let answer = '';
      try {
        const { refused } = await streamChat(
          brief,
          history.map(({ role, content }) => ({ role, content })),
          (chunk) => {
            answer += chunk;
            setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, content: answer } : m)));
          },
          controller.signal
        );
        if (gen === genRef.current) feel('arrive');
        if (refused || !answer.trim()) {
          answer = 'I can’t help with that one. Try asking about your family’s answers, plans or things to do together.';
          setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, content: answer } : m)));
        }
        ai.suggest(brief, { question: q, answer }, controller.signal)
          .then((r) => gen === genRef.current && setFollowUps(r.suggestions.slice(0, 3)))
          .catch(() => gen === genRef.current && setFollowUps([]));
      } catch (err) {
        if ((err as Error)?.name === 'AbortError' || gen !== genRef.current) return;
        setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, content: aiErrorMessage(err), error: true } : m)));
      } finally {
        if (gen === genRef.current) {
          setBusy(false);
          scrollDown();
        }
      }
    },
    [brief, busy, messages]
  );

  // A question handed over from another screen ("Plan this with the helper").
  useEffect(() => {
    if (ui.askPrefill) {
      const q = ui.askPrefill;
      ui.consumeAsk();
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.askPrefill]);

  const empty = messages.length === 0;
  const suggestions = starters.data?.suggestions?.slice(0, 3) || (starters.error ? NEUTRAL : []);

  return (
    <div className="page" style={{ paddingBottom: `calc(var(--tabbar-top) + ${composerH}px + 32px + var(--safe-b))` }}>
      <PageHeader title="Ask" onProfile={ui.openSettings} />

      {empty ? (
        <>
          <section className="flex items-center gap-3">
            <Felt name="yarnball" size={64} className="-m-1" />
            <p className="t-body ink-2 flex-1">Answers come only from what your family saved.</p>
          </section>

          <h2 className="t-head mt-4 mb-3">Try asking</h2>
          <div className="grid gap-2" aria-busy={starters.loading}>
            {starters.loading && !suggestions.length
              ? [0, 1, 2].map((i) => <div key={i} className="skeleton h-[52px] w-full" />)
              : suggestions.map((s) => <SuggestionButton key={s} text={s} onClick={() => send(s)} />)}
          </div>

          <button
            type="button"
            className="t-label mt-6 bg-transparent border-0 p-0 min-h-[44px] flex items-center gap-1"
            style={{ color: 'var(--accent-ink)' }}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
          >
            More questions
            <ChevronDown size={16} strokeWidth={2.6} style={{ transform: moreOpen ? 'rotate(180deg)' : undefined, transition: 'transform 180ms' }} />
          </button>
          {moreOpen && (
            <ul className="card overflow-hidden mt-1">
              {GUIDED.map((g, i) => (
                <li key={g} style={{ borderTop: i ? '1px solid var(--line)' : undefined }}>
                  <button type="button" onClick={() => send(g)} className="w-full text-left bg-transparent border-0 t-body px-4 py-3 min-h-[48px] active:bg-[var(--accent-soft)]">
                    {g}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="grid gap-4" aria-live="polite">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                genRef.current += 1;
                abortRef.current?.abort();
                setMessages([]);
                setFollowUps([]);
                setBusy(false);
              }}
            >
              <RotateCcw size={16} strokeWidth={2.4} /> New chat
            </button>
          </div>
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2.5 items-start'}>
                {m.role === 'user' ? (
                  <p className="t-body px-4 py-3 max-w-[82%]" style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '20px 20px 6px 20px' }}>
                    {m.content}
                  </p>
                ) : (
                  <>
                    <HelperAvatar />
                    <div className="card px-4 py-3.5 flex-1 min-w-0" style={{ borderRadius: '6px 20px 20px 20px' }}>
                      {m.content ? (
                        <AiText text={m.content} className="t-body lead" />
                      ) : (
                        <Thinking label="Reading your family’s answers" />
                      )}
                      {m.error && (
                        <button
                          type="button"
                          className="btn btn-sm btn-soft mt-3"
                          disabled={busy}
                          onClick={() => {
                            // Ask the same question again in place of the failed one, without repeating it.
                            const at = messages.findIndex((x) => x.id === m.id);
                            const question = messages[at - 1];
                            if (question?.role === 'user') send(question.content, messages.slice(0, at - 1));
                          }}
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {!busy && followUps.length > 0 && (
            <div className="grid gap-2 pl-11">
              {followUps.map((f) => (
                <SuggestionButton key={f} text={f} onClick={() => send(f)} small />
              ))}
            </div>
          )}
        </div>
      )}
      <div ref={endRef} />

      {/* Page behind the composer and tab bar, fading in above them, so nothing shows between them. */}
      <div aria-hidden className="scrim fixed z-[19] inset-x-0 bottom-0 mx-auto max-w-[460px]" style={{ height: `calc(var(--tabbar-top) + ${composerH}px + 32px + var(--safe-b))`, ['--scrim-mask' as string]: 'linear-gradient(to bottom, transparent, #000 24px)' }} />
      <form
        ref={composerRef}
        className="fixed z-20 left-1/2 -translate-x-1/2 w-[min(420px,calc(100%-32px))] flex items-end gap-2 p-[5px] pl-1 rounded-[14px]"
        style={{ bottom: 'calc(var(--tabbar-top) + var(--safe-b))', minHeight: 54, background: 'color-mix(in srgb, var(--card) 96%, transparent)', backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)', boxShadow: '0 0 0 0.5px var(--line-strong), var(--shadow-lift)' }}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask the family helper
        </label>
        <textarea
          id="ask-input"
          rows={1}
          className="flex-1 bg-transparent border-0 resize-none px-3 py-[10px] t-body outline-none max-h-32"
          style={{ fontSize: 17 }}
          value={input}
          placeholder="Ask about your family…"
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button type="submit" className="shrink-0 grid place-items-center border-0 rounded-[10px] transition-opacity" style={busy || !input.trim() ? { height: 44, width: 44, background: 'var(--accent-soft)', color: 'var(--accent-ink)', opacity: 0.7 } : { height: 44, width: 44, background: 'var(--accent)', color: 'var(--on-accent)' }} disabled={busy || !input.trim()} aria-label="Send">
          <ArrowUp size={22} strokeWidth={2.8} />
        </button>
      </form>
    </div>
  );
}

function SuggestionButton({ text, onClick, small }: { text: string; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card text-left border-0 flex items-center gap-3 transition-transform active:scale-[0.98]"
      style={{ padding: small ? '10px 14px' : '14px 16px' }}
    >
      <span aria-hidden className="shrink-0 rounded-full" style={{ width: 12, height: 4, background: 'var(--yarn)', transform: 'rotate(-20deg)' }} />
      <span className={small ? 't-small font-semibold' : 'font-semibold'}>{text}</span>
    </button>
  );
}

function HelperAvatar() {
  return (
    <span className="shrink-0 w-9 h-9 grid place-items-center -mt-0.5" aria-hidden>
      <Felt name="yarnball" size={52} />
    </span>
  );
}
