import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/bits';
import { TabBar } from './components/layout/TabBar';
import { Welcome } from './components/welcome/Welcome';
import { GardenView } from './components/home/GardenView';
import { TogetherView } from './components/together/TogetherView';
import { PlanView } from './components/plan/PlanView';
import { AskView } from './components/ask/AskView';
import { MemberSheet } from './components/profile/MemberSheet';
import { SettingsSheet } from './components/settings/SettingsSheet';
import { FoundationFlow } from './components/discovery/FoundationFlow';
import { RootsFlow } from './components/discovery/RootsFlow';
import { TastesSheet } from './components/discovery/TastesSheet';
import { Flower } from './components/art/Flower';
import { PlanTask, TabType } from './types';

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
  const { household, isLoading } = useHousehold();
  const [tab, setTab] = useState<TabType>(tabFromHash);
  const [planTask, setPlanTask] = useState<PlanTask | null>(null);
  const [askPrefill, setAskPrefill] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foundationOpen, setFoundationOpen] = useState(false);
  const [rootsOpen, setRootsOpen] = useState(false);
  const [tastesOpen, setTastesOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTab = useCallback((next: TabType) => {
    setTab(next);
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tab === 'garden' && <GardenView />}
          {tab === 'together' && <TogetherView />}
          {tab === 'plan' && <PlanView initialTask={planTask} onConsumeTask={() => setPlanTask(null)} />}
          {tab === 'ask' && <AskView />}
        </motion.main>
      </AnimatePresence>
      <TabBar tab={tab} onChange={goTab} />

      <MemberSheet memberId={memberId} onClose={() => setMemberId(null)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FoundationFlow open={foundationOpen} onClose={() => setFoundationOpen(false)} />
      <RootsFlow open={rootsOpen} onClose={() => setRootsOpen(false)} />
      <TastesSheet open={tastesOpen} onClose={() => setTastesOpen(false)} />
    </UIContext.Provider>
  );
}

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
              <Shell />
            </div>
          </HouseholdProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
