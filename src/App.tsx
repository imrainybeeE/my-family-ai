import React, { Suspense, lazy, startTransition, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/bits';
import { TabBar } from './components/layout/TabBar';
import { Flower } from './components/art/Flower';
import { PlanTask, TabType } from './types';

// The two entry screens are eager; other tabs and sheets load on demand.
import { Welcome } from './components/welcome/Welcome';
import { GardenView } from './components/home/GardenView';
const TogetherView = lazy(() => import('./components/together/TogetherView').then((m) => ({ default: m.TogetherView })));
const PlanView = lazy(() => import('./components/plan/PlanView').then((m) => ({ default: m.PlanView })));
const AskView = lazy(() => import('./components/ask/AskView').then((m) => ({ default: m.AskView })));
const MemberSheet = lazy(() => import('./components/profile/MemberSheet').then((m) => ({ default: m.MemberSheet })));
const SettingsSheet = lazy(() => import('./components/settings/SettingsSheet').then((m) => ({ default: m.SettingsSheet })));
const FoundationFlow = lazy(() => import('./components/discovery/FoundationFlow').then((m) => ({ default: m.FoundationFlow })));
const RootsFlow = lazy(() => import('./components/discovery/RootsFlow').then((m) => ({ default: m.RootsFlow })));
const TastesSheet = lazy(() => import('./components/discovery/TastesSheet').then((m) => ({ default: m.TastesSheet })));

interface UI {
  tab: TabType;
  goTab: (tab: TabType) => void;
  planTask: PlanTask | null;
  startPlan: (task: PlanTask) => void;
  askPrefill: string | null;
  askAbout: (question: string) => void;
  consumeAsk: () => void;
  openMember: (id: string) => void;
  openSettings: () => void;
  openFoundation: () => void;
  openRoots: () => void;
  openTastes: () => void;
}

const UIContext = createContext<UI | null>(null);
export function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error('useUI must be used inside the app shell');
  return ui;
}

const TABS: TabType[] = ['garden', 'together', 'plan', 'ask'];
const tabFromHash = (): TabType => {
  const h = window.location.hash.replace('#', '') as TabType;
  return TABS.includes(h) ? h : 'garden';
};

function Shell() {
  const { household, isLoading, activeMember } = useHousehold();
  const [tab, setTab] = useState<TabType>(tabFromHash);
  // The tabs sit side by side: moving to one on the right slides the page in from the right.
  const lastTab = useRef(tab);
  const dir = Math.sign(TABS.indexOf(tab) - TABS.indexOf(lastTab.current));
  useEffect(() => {
    lastTab.current = tab;
  }, [tab]);
  const [planTask, setPlanTask] = useState<PlanTask | null>(null);
  const [askPrefill, setAskPrefill] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foundationOpen, setFoundationOpen] = useState(false);
  const [rootsOpen, setRootsOpen] = useState(false);
  const [tastesOpen, setTastesOpen] = useState(false);

  useEffect(() => {
    const onHash = () => startTransition(() => setTab(tabFromHash()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTab = useCallback((next: TabType) => {
    startTransition(() => setTab(next));
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const ui = useMemo<UI>(
    () => ({
      tab,
      goTab,
      planTask,
      startPlan: (task) => {
        setPlanTask(task);
        goTab('plan');
      },
      askPrefill,
      askAbout: (q) => {
        setAskPrefill(q);
        goTab('ask');
      },
      consumeAsk: () => setAskPrefill(null),
      openMember: (id) => setMemberId(id),
      openSettings: () => setSettingsOpen(true),
      openFoundation: () => {
        setMemberId(null);
        setFoundationOpen(true);
      },
      openRoots: () => {
        setMemberId(null);
        setRootsOpen(true);
      },
      openTastes: () => {
        setMemberId(null);
        setTastesOpen(true);
      },
    }),
    [tab, goTab, planTask, askPrefill]
  );

  if (isLoading) return <Loading />;
  if (!household) return <Welcome />;

  return (
    <UIContext.Provider value={ui}>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.main
          id="main"
          role="tabpanel"
          aria-label={tab}
          key={tab}
          custom={dir}
          variants={PAGE_TURN}
          initial="enter"
          animate="rest"
          exit="leave"
        >
          {tab === 'garden' && <GardenView />}
          {tab === 'together' && <TogetherView />}
          {tab === 'plan' && <PlanView initialTask={planTask} onConsumeTask={() => setPlanTask(null)} />}
          {/* A fresh chat per person: switching profile never carries someone else's conversation. */}
          {tab === 'ask' && <AskView key={activeMember?.id || 'none'} />}
        </motion.main>
      </AnimatePresence>
      <TabBar tab={tab} onChange={goTab} />

      <Deferred active={!!memberId}><MemberSheet memberId={memberId} onClose={() => setMemberId(null)} /></Deferred>
      <Deferred active={settingsOpen}><SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} /></Deferred>
      <Deferred active={foundationOpen}><FoundationFlow open={foundationOpen} onClose={() => setFoundationOpen(false)} /></Deferred>
      <Deferred active={rootsOpen}><RootsFlow open={rootsOpen} onClose={() => setRootsOpen(false)} /></Deferred>
      <Deferred active={tastesOpen}><TastesSheet open={tastesOpen} onClose={() => setTastesOpen(false)} /></Deferred>
    </UIContext.Provider>
  );
}

/** Stay mounted after the first open, preserving drafts and the sheet's exit animation. */
function Deferred({ active, children }: { active: boolean; children: React.ReactNode }) {
  const visited = useRef(false);
  if (active) visited.current = true;
  return visited.current ? <Suspense fallback={null}>{children}</Suspense> : null;
}

const PAGE_TURN = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, y: dir ? 0 : 8 }),
  rest: { opacity: 1, x: 0, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 36 } },
  leave: (dir: number) => ({ opacity: 0, x: dir * -18, transition: { duration: 0.12, ease: 'easeIn' as const } }),
};

function Loading() {
  return (
    <div className="min-h-[100dvh] grid place-items-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <motion.div animate={{ rotate: [0, 8, 0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <Flower style="Connector" size={64} />
        </motion.div>
        <p className="t-label ink-2">Opening your garden</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <HouseholdProvider>
            <div className="app-column">
              <Suspense fallback={<Loading />}><Shell /></Suspense>
            </div>
          </HouseholdProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
