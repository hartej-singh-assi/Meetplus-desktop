import React, { useState } from 'react';
import { MeetingTrackerProvider, useMeetingTracker } from './context/MeetingTrackerContext';
import { DesktopTitlebar } from './components/DesktopTitlebar';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { MeetingLogView } from './components/MeetingLogView';
import { WorkLogView } from './components/WorkLogView';
import { RecordsView } from './components/RecordsView';
import { SettingsView } from './components/SettingsView';
import { ExportModal } from './components/ExportModal';
import { SprintMasterModal } from './components/SprintMasterModal';
import { FloatingTimerPill } from './components/FloatingTimerPill';
import { MeetingCompletionModal } from './components/MeetingCompletionModal';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, isWidgetMinimized } = useMeetingTracker();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);

  if (isWidgetMinimized) {
    return (
      <div className="h-screen w-screen bg-[#070a14] text-slate-100 flex items-center justify-center font-sans antialiased overflow-hidden p-0">
        <FloatingTimerPill />
        <MeetingCompletionModal />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white overflow-hidden relative">
      <DesktopTitlebar
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenNewMeetingModal={() => setActiveTab('meetings')}
        onOpenSprintModal={() => setIsSprintModalOpen(true)}
      />

      <main className="flex-1 overflow-y-auto flex flex-col w-full">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'calendar' && (
          <CalendarView
            onOpenNewMeetingWithDate={dateStr => {
              setActiveTab('meetings');
            }}
            onEditMeeting={m => {
              setActiveTab('meetings');
            }}
          />
        )}
        {activeTab === 'meetings' && <MeetingLogView />}
        {activeTab === 'work' && <WorkLogView />}
        {activeTab === 'records' && <RecordsView onOpenExportModal={() => setIsExportOpen(true)} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Post-Meeting Detail Completion Modal */}
      <MeetingCompletionModal />

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <SprintMasterModal isOpen={isSprintModalOpen} onClose={() => setIsSprintModalOpen(false)} />
    </div>
  );
};


export const App: React.FC = () => {
  return (
    <MeetingTrackerProvider>
      <AppContent />
    </MeetingTrackerProvider>
  );
};

export default App;

