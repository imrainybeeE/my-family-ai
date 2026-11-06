import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  HelpCircle,
  Dices,
  RefreshCw,
  Info,
  Compass,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { askFamilyAi, AskAiResponse } from '../../services/aiService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedQuestion?: string;
  timestamp: string;
}

const GUIDED_PROMPTS = [
  'What does my child enjoy most?',
  'How does my child prefer to be supported?',
  'What do we have in common?',
  'Where are we different?',
  'Suggest something we could enjoy together',
  'What could I ask my family member to understand them better?',
];

export const AskAiView: React.FC = () => {
  const { household, members, responses, activeMember } = useHousehold();

  // Mode: Assistant or Tiebreaker
  const [activeMode, setActiveMode] = useState<'assistant' | 'tiebreaker'>('assistant');

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${activeMember?.nickname || activeMember?.role || 'there'}! I am your Family AI assistant. I use your household's saved questionnaire answers to help everyone understand each other, plan fun activities, and find common ground. Pick a guided question below or type your own!`,
      timestamp: 'Just now',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tiebreaker state (preserved feature)
  const [optionA, setOptionA] = useState('Pizza');
  const [optionB, setOptionB] = useState('Tacos');
  const [coinResult, setCoinResult] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const result: AskAiResponse = await askFamilyAi({
        prompt: trimmed,
        household,
        activeMember,
        members,
        responses,
      });

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        suggestedQuestion: result.suggestedFamilyQuestion,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'Based on the answers provided... we could not complete that query right now. Feel free to ask a question from the buttons above!',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlipCoin = () => {
    if (!optionA.trim() || !optionB.trim()) return;
    setIsFlipping(true);
    setCoinResult(null);

    setTimeout(() => {
      const winner = Math.random() < 0.5 ? optionA.trim() : optionB.trim();
      setCoinResult(winner);
      setIsFlipping(false);
    }, 600);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Ask AI Family Assistant
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by Gemini · Grounded in your household questionnaire answers
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveMode('assistant')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMode === 'assistant'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            AI Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('tiebreaker')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMode === 'tiebreaker'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tiebreaker
          </button>
        </div>
      </div>

      {activeMode === 'assistant' ? (
        <div className="space-y-4">
          {/* Conversation stream */}
          <div className="space-y-3 min-h-[160px] max-h-[360px] overflow-y-auto no-scrollbar pr-0.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {msg.text}

                  {msg.suggestedQuestion && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-start gap-1.5 text-indigo-700 dark:text-indigo-300">
                      <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold block text-[11px]">Question to discuss together:</span>
                        <span className="italic text-[11px] text-slate-600 dark:text-slate-300">
                          “{msg.suggestedQuestion}”
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                  {msg.sender === 'user' ? 'You' : 'My Family AI'} · {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-[80%] text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Consulting household answers with Gemini...</span>
              </div>
            )}
          </div>

          {/* Guided Prompt Buttons (Mandatory 6 prompts) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              Guided Family Questions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {GUIDED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendPrompt(promptText)}
                  disabled={isLoading}
                  className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition active:scale-98 disabled:opacity-50"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>

          {/* Free-text input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputQuery);
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about your family tastes..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition disabled:opacity-40 shadow-xs shrink-0 cursor-pointer"
              aria-label="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Non-diagnostic & Privacy assurance */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Living room assistant: Grounded in your household answers. Never diagnoses personality, mental health, or relationships. Formatted as positive, shared family discovery.
            </p>
          </div>
        </div>
      ) : (
        /* Preserved Debate Tiebreaker */
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Friendly Debate Tiebreaker
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">50/50 fair choice</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Can’t agree between two good choices? Put them below and let the neutral tiebreaker decide.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                Choice A
              </label>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="Option A"
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                Choice B
              </label>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Option B"
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleFlipCoin}
            disabled={isFlipping || !optionA.trim() || !optionB.trim()}
            className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            {isFlipping ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deciding fairly...</span>
              </>
            ) : (
              <>
                <Dices className="w-4 h-4 text-indigo-400 dark:text-indigo-200" />
                <span>Settle the debate</span>
              </>
            )}
          </button>

          {coinResult && (
            <div className="p-3 bg-indigo-50 dark:bg-slate-700/60 border border-indigo-200 dark:border-indigo-500/50 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-300 tracking-wider">
                The Verdict Is In
              </span>
              <div className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                🎉 {coinResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
