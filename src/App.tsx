import React, { useState } from 'react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { ThemeProvider } from './context/ThemeContext';
import { MobileShell } from './components/layout/MobileShell';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { CreateHouseholdModal } from './components/onboarding/CreateHouseholdModal';
import { JoinHouseholdModal } from './components/onboarding/JoinHouseholdModal';
import { HomeView } from './components/views/HomeView';
import { DiscoverView } from './components/views/DiscoverView';
import { FamilyView } from './components/views/FamilyView';
import { AskAiView } from './components/views/AskAiView';
import { SettingsView } from './components/views/SettingsView';
import { TasteSurveyModal } from './components/survey/TasteSurveyModal';
import { FoundationModal } from './components/foundation/FoundationModal';
import { TabType } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

function HouseholdApp() {
  const { household, isLoading, error, clearError } = useHousehold();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Onboarding & Survey modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isFoundationOpen, setIsFoundationOpen] = useState(false);
  const [foundationShowResult, setFoundationShowResult] = useState(false);

  const handleOpenFoundation = (showResult = false) => {
    setFoundationShowResult(showResult);
    setIsFoundationOpen(true);
  };

  // Initial loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-2.5">
          <Loader2 className="w-6 h-6 animate-spin text-slate-700 dark:text-slate-300 mx-auto" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Connecting to household...</p>
        </div>
      </div>
    );
  }

  // Not connected to a household yet -> Show Welcome Screen
  if (!household) {
    return (
      <MobileShell>
        {error && (
          <div className="m-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-900 ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <WelcomeScreen
          onCreateHousehold={() => setIsCreateOpen(true)}
          onJoinHousehold={() => setIsJoinOpen(true)}
        />

        {isCreateOpen && (
          <CreateHouseholdModal onClose={() => setIsCreateOpen(false)} />
        )}

        {isJoinOpen && (
          <JoinHouseholdModal onClose={() => setIsJoinOpen(false)} />
        )}
      </MobileShell>
    );
  }

  // Connected to a household -> Main App Shell
  return (
    <MobileShell
      header={
        <Header
          onOpenFamily={() => setActiveTab('family')}
          onOpenSettings={() => setActiveTab('settings')}
        />
      }
      bottomNav={
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(t) => setActiveTab(t)}
        />
      }
    >
      {error && (
        <div className="m-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-900 ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'home' && (
        <HomeView
          onNavigateTab={(t) => setActiveTab(t)}
          onOpenSurvey={() => setIsSurveyOpen(true)}
          onOpenFoundation={handleOpenFoundation}
        />
      )}
      {activeTab === 'discover' && (
        <DiscoverView onOpenSurvey={() => setIsSurveyOpen(true)} />
      )}
      {activeTab === 'family' && (
        <FamilyView onOpenFoundation={handleOpenFoundation} />
      )}
      {activeTab === 'ask-ai' && <AskAiView />}
      {activeTab === 'settings' && <SettingsView />}

      {isSurveyOpen && (
        <TasteSurveyModal onClose={() => setIsSurveyOpen(false)} />
      )}

      {isFoundationOpen && (
        <FoundationModal
          initialShowResult={foundationShowResult}
          onClose={() => setIsFoundationOpen(false)}
        />
      )}
    </MobileShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HouseholdProvider>
        <HouseholdApp />
      </HouseholdProvider>
    </ThemeProvider>
  );
}
