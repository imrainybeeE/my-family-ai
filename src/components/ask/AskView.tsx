import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useAiResource } from '../../hooks/useFamily';
import { ai, aiErrorMessage, ChatTurn, streamChat } from '../../services/ai';
import { PageHeader } from '../layout/TabBar';
import { AiText, Thinking } from '../ui/bits';
import { Flower } from '../art/Flower';

/** The six guided questions from the project brief, always available. */
const GUIDED = [
  'What does my child enjoy most?',
  'How does my child prefer to be supported?',
  'What do we have in common?',
  'Where are we different?',
  'Suggest something we could enjoy together',
  'What could I ask my family member to understand them better?',
];

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
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
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
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setInput('');
      setFollowUps([]);
      const history: Msg[] = [...messages.filter((m) => !m.error), { id: `u${Date.now()}`, role: 'user', content: q }];
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
        if (refused || !answer.trim()) {
          answer = 'I can’t help with that one. Try asking about your family’s answers, plans or things to do together.';
          setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, content: answer } : m)));
        }
        ai.suggest(brief, { question: q, answer })
          .then((r) => setFollowUps(r.suggestions.slice(0, 3)))
          .catch(() => setFollowUps([]));
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, content: aiErrorMessage(err), error: true } : m)));
      } finally {
        setBusy(false);
        scrollDown();
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
  const suggestions = starters.data?.suggestions?.slice(0, 3) || [];

  return (
    <div className="page" style={{ paddingBottom: 'calc(200px + var(--safe-b))' }}>
      <PageHeader title="Ask" subtitle="A helper that only knows what your family answered in this app." onProfile={ui.openSettings} />

      {empty ? (
        <>
          <section className="panel panel-lilac">
            <div className="absolute -right-4 -bottom-6" aria-hidden>
              <Flower style="Thinker" size={110} stem={20} />
            </div>
            <div className="pr-24">
              <h2 className="t-title">Ask anything about your family</h2>
              <p className="t-small mt-2">It answers from everyone’s saved answers. When the answers don’t say, it tells you, and suggests a question to ask each other.</p>
            </div>
          </section>

          <h2 className="t-label ink-2 mt-6 mb-2 px-1">Suggested for {brief.asker}</h2>
          <div className="grid gap-2">
            {starters.loading && !suggestions.length && (
              <div className="card p-4">
                <Thinking label="Thinking of good questions" />
              </div>
            )}
            {suggestions.map((s) => (
              <SuggestionButton key={s} text={s} onClick={() => send(s)} />
            ))}
          </div>

          <h2 className="t-label ink-2 mt-6 mb-2 px-1">Guided questions</h2>
          <div className="flex flex-wrap gap-2">
            {GUIDED.map((g) => (
              <button key={g} type="button" className="chip text-left" style={{ minHeight: 44, paddingTop: 8, paddingBottom: 8 }} onClick={() => send(g)}>
                {g}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4" aria-live="polite">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
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
                  <p className="t-body px-4 py-3 max-w-[82%]" style={{ background: 'var(--leaf)', color: 'var(--on-leaf)', borderRadius: '22px 22px 6px 22px', boxShadow: '0 3px 0 var(--leaf-press)' }}>
                    {m.content}
                  </p>
                ) : (
                  <>
                    <HelperAvatar />
                    <div className="card px-4 py-3.5 flex-1 min-w-0" style={{ borderRadius: '6px 22px 22px 22px' }}>
                      {m.content ? (
                        <AiText text={m.content} className="t-body" />
                      ) : (
                        <Thinking label="Reading your family’s answers" />
                      )}
                      {m.error && (
                        <p className="t-small mt-2" style={{ color: 'var(--danger)' }}>
                          Nothing was sent to your family.
                        </p>
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

      <form
        className="fixed z-20 left-1/2 -translate-x-1/2 w-[min(428px,calc(100%-24px))] flex items-end gap-2 p-2 rounded-[24px]"
        style={{ bottom: 'calc(96px + var(--safe-b))', background: 'color-mix(in srgb, var(--card) 92%, transparent)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 0 0 1px var(--line), var(--shadow-float)' }}
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
          className="flex-1 bg-transparent border-0 resize-none px-3 py-3 t-body outline-none max-h-32"
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
        <button type="submit" className="btn btn-primary shrink-0" style={{ minHeight: 48, width: 48, padding: 0, borderRadius: 16 }} disabled={busy || !input.trim()} aria-label="Send">
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
      style={{ padding: small ? '10px 14px' : '14px 16px', borderRadius: 18 }}
    >
      <span aria-hidden className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--leaf)' }} />
      <span className={small ? 't-small font-semibold' : 'font-semibold'}>{text}</span>
    </button>
  );
}

function HelperAvatar() {
  return (
    <span className="shrink-0 w-9 h-9 rounded-full grid place-items-center mt-0.5" style={{ background: 'var(--lilac-bg)' }} aria-hidden>
      <Flower style="Thinker" size={28} />
    </span>
  );
}
