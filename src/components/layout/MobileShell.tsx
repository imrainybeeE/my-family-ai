import React from 'react';

interface MobileShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  bottomNav?: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children, header, bottomNav }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex justify-center items-center sm:py-6 sm:px-4 transition-colors">
      {/* Mobile container: edge-to-edge on phones, sleek modern frame on desktop */}
      <div className="w-full sm:max-w-[420px] h-[100dvh] sm:h-[860px] bg-white dark:bg-slate-900 sm:rounded-[32px] sm:shadow-xl sm:shadow-slate-300/40 dark:sm:shadow-black/50 sm:border sm:border-slate-200/80 dark:sm:border-slate-800 flex flex-col overflow-hidden relative">
        {/* Subtle hardware pill on desktop */}
        <div className="hidden sm:flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-20 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>

        {/* Header */}
        {header && <header className="shrink-0 z-20">{header}</header>}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-slate-50/50 dark:bg-slate-900/60">
          {children}
        </main>

        {/* Bottom Navigation */}
        {bottomNav && <nav className="shrink-0 z-20">{bottomNav}</nav>}
      </div>
    </div>
  );
};
