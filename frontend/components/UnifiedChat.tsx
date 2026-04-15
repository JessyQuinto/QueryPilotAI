"use client";

import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useApi } from "../hooks/useApi";

// Types
import { DashboardTab } from "./types";

// Hooks
import { useLogs } from "./hooks/useLogs";
import { useWorkspace } from "./hooks/useWorkspace";
import { useConnections } from "./hooks/useConnections";
import { useChatSessions } from "./hooks/useChatSessions";

// Components
import { Sidebar } from "./Sidebar";
import { ConnectionManager } from "./ConnectionManager";
import { ChatArea } from "./ChatArea";
import { IDEArea } from "./IDEArea";
import { TerminalLogs } from "./TerminalLogs";
import { WelcomeArea } from "./WelcomeArea";
import { WorkspaceOnboarding } from "./WorkspaceOnboarding";
import { AppIcon } from "./AppIcon";
import { InteractiveBackground } from "./InteractiveBackground";
import { TabBar } from "./TabBar";

export function UnifiedChat() {
  const { fetchWithAuth, userId, account } = useApi();
  const userName = account?.name || "Analyst";
  
  // App UI State
  const [currentView, setCurrentView] = useState("welcome");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  const [openTabs, setOpenTabs] = useState<DashboardTab[]>([]);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
   const [pendingFirstConnectionType, setPendingFirstConnectionType] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Custom Hooks
  const { terminalLogs, addLog } = useLogs();
  
  const {
    organization, organizations,
    isLoadingOrg, isAddingWorkspace, setIsAddingWorkspace,
      handleOnboardingComplete: handleWorkspaceOnboardingComplete, handleDeleteWorkspace
  } = useWorkspace(userId, fetchWithAuth);

  const {
    connections, setConnections,
    editingConnId, setEditingConnId,
    connForm, setConnForm,
    connError, setConnError,
    isTestingConnection, testSuccess,
    handleMsalLogin, handleSaveConnection
  } = useConnections(userId, fetchWithAuth, addLog, setCurrentView);

  const {
    chatSessions, setChatSessions,
    activeChatSession,
    input, setInput, isTyping,
    handleSubmit, handleApproval,
      createChatSession, deleteChatSession, renameChatSession
  } = useChatSessions(userId, fetchWithAuth, connections, addLog, currentView);

  const activeIdeTab = openTabs.find(t => t.id === currentView && t.type === 'ide') || null;
  const activeConnection = activeIdeTab 
       ? connections.find(c => c.id === activeIdeTab.connectionId) 
       : activeChatSession 
           ? connections.find(c => c.id === activeChatSession.connectionId) 
           : undefined;

  const openChat = (chatId: string) => {
    setCurrentView(chatId);
    if (!openTabs.find(t => t.id === chatId)) {
        const chat = chatSessions.find(c => c.id === chatId);
        if (chat) {
            setOpenTabs(prev => [...prev, { type: 'chat', id: chatId, title: chat.title, connectionId: chat.connectionId }]);
        }
    }
  };

  const closeTab = (id: string) => {
    setOpenTabs(prev => {
        const newTabs = prev.filter(t => t.id !== id);
        if (currentView === id) {
            const currentIndex = prev.findIndex(t => t.id === id);
            if (newTabs.length > 0) {
                const nextIndex = Math.min(currentIndex, newTabs.length - 1);
                setCurrentView(newTabs[nextIndex].id);
            } else {
                setCurrentView('welcome');
            }
        }
        return newTabs;
    });
  };

  const openNewTab = () => {
    const newId = `welcome-${Date.now()}`;
    setOpenTabs(prev => [...prev, { type: 'welcome', id: newId, title: 'Data Sources', icon: 'grid_view' }]);
    setCurrentView(newId);
  };

  const openPageTab = (id: string, title: string, icon: string) => {
    setOpenTabs(prev => {
      if (prev.find(t => t.id === id)) {
        return prev;
      }
      return [...prev, { type: 'page', id, title, icon }];
    });
    setCurrentView(id);
  };

   const handleOnboardingComplete = async (data: { name: string; industry: string; firstConnectionType?: string | null }) => {
      setPendingFirstConnectionType(data.firstConnectionType || null);
      await handleWorkspaceOnboardingComplete({ name: data.name, industry: data.industry });
   };

   useEffect(() => {
      if (!organization || !pendingFirstConnectionType) return;

      setEditingConnId(null);

      if (pendingFirstConnectionType === 'Azure SQL') {
         setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL", authType: 'SQL' });
         setCurrentView('connect_azuresql');
      } else if (pendingFirstConnectionType === 'PostgreSQL') {
         setConnForm({ name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" });
         setCurrentView('connect_postgres');
      } else if (pendingFirstConnectionType === 'MySQL') {
         setConnForm({ name: "My MySQL Database", host: "mysql-database.com", port: "3306", database: "my_database", username: "root", password: "", type: "MySQL" });
         setCurrentView('connect_postgres');
      } else if (pendingFirstConnectionType === 'MariaDB') {
         setConnForm({ name: "My MariaDB Database", host: "mariadb-database.com", port: "3306", database: "my_database", username: "root", password: "", type: "MariaDB" });
         setCurrentView('connect_postgres');
      } else if (pendingFirstConnectionType === 'SQLite') {
         setConnForm({ name: "My SQLite Database", host: "C:/data/app.db", port: "", database: "", username: "", password: "", type: "SQLite" });
         setCurrentView('connect_postgres');
      }

      setPendingFirstConnectionType(null);
   }, [organization, pendingFirstConnectionType, setConnForm, setEditingConnId]);

  if (isLoadingOrg) {
    return (
       <div className="min-h-screen bg-transparent flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-none animate-spin"></div>
       </div>
    );
  }

  if (organizations.length === 0 && !isLoadingOrg) {
     return <WorkspaceOnboarding handleOnboardingComplete={handleOnboardingComplete} isAddingWorkspace={isAddingWorkspace} />;
  }

  return (
    <>
      <Head>
        <title>QueryPilot AI - Chat with your Azure SQL Data</title>
        <meta name="description" content="Agentic SQL analyst designed for security and enterprise" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="flex font-sans h-[100dvh] w-full overflow-hidden bg-transparent relative">
        <InteractiveBackground />
        
        <Sidebar 
           isSidebarOpen={isSidebarOpen}
           setIsSidebarOpen={setIsSidebarOpen}
           organization={organization} userName={userName} currentView={currentView}
           setCurrentView={setCurrentView}
           connections={connections} chatSessions={chatSessions}
           openTabs={openTabs} setOpenTabs={setOpenTabs} expandedConns={expandedConns} setExpandedConns={setExpandedConns}
           openChat={openChat} setEditingConnId={setEditingConnId} setConnForm={setConnForm} addLog={addLog}
           createChatSession={createChatSession} deleteChatSession={deleteChatSession} renameChatSession={renameChatSession}
           openPageTab={openPageTab}
        />

      <main className={`mosaic-center flex-1 min-h-0 h-full flex flex-col overflow-hidden relative transition-all duration-300 ${isFullView && (activeChatSession || activeIdeTab) ? 'bg-[#111111]' : 'bg-transparent'}`}>
          <TabBar openTabs={openTabs} currentView={currentView} setCurrentView={setCurrentView} closeTab={closeTab} openNewTab={openNewTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

          {currentView.startsWith('welcome') && (
             <WelcomeArea 
                userName={userName} organization={organization} connections={connections} 
                setCurrentView={setCurrentView} setEditingConnId={setEditingConnId} setConnForm={setConnForm} 
             />
          )}

          {(currentView === 'integrations' || currentView === 'connect_azuresql' || currentView === 'connect_postgres' || currentView === 'manage_connections') && (
             <div className="w-full flex-1 overflow-y-auto relative bg-transparent">
                 <ConnectionManager 
                    currentView={currentView} setCurrentView={setCurrentView} connections={connections}
                    setConnections={setConnections} editingConnId={editingConnId} setEditingConnId={setEditingConnId}
                    connForm={connForm} setConnForm={setConnForm} connError={connError} testSuccess={testSuccess}
                    isTestingConnection={isTestingConnection} handleMsalLogin={handleMsalLogin} handleSaveConnection={handleSaveConnection}
                    fetchWithAuth={fetchWithAuth} setChatSessions={setChatSessions}
                    openTabs={openTabs} setOpenTabs={setOpenTabs} setExpandedConns={setExpandedConns} addLog={addLog}
                    createChatSession={createChatSession}
                 />
             </div>
          )}

          {currentView === 'history' && (
             <div className="py-16 px-10 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
                <div className="space-y-2 mb-10">
                  <h1 className="text-3xl font-semibold text-[#f4f0e6] tracking-tight">Activity History</h1>
                  <p className="text-[14px] text-[#a3a3a3] font-medium">Review your recent queries and conversations across all connections.</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-6 shadow-sm flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-none bg-[#111111] border border-[#222222] flex items-center justify-center mb-4">
                     <AppIcon name="history" className="h-[24px] w-[24px] text-[#8a8a8a]" />
                  </div>
                  <p className="text-[14px] text-[#a3a3a3] font-medium">History sync is currently unavailable.</p>
                </div>
             </div>
          )}

          {currentView === 'settings' && (
             <div className="pt-24 px-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto">
                <button 
                  onClick={() => setCurrentView('welcome')}
                  className="mb-6 flex items-center gap-2 text-[13px] font-medium text-[#a3a3a3] hover:text-[#f4f0e6] transition-colors"
                >
                           <AppIcon name="arrow_back" className="h-[16px] w-[16px]" /> Back to Home
                </button>
                <div className="mb-8 bg-[#0a0a0a] border border-[#333333] p-8 rounded-none shadow-sm space-y-2">
                  <h1 className="text-3xl font-semibold text-[#f4f0e6] tracking-tight">Settings</h1>
                  <p className="text-[14px] text-[#a3a3a3] font-medium">Organize and manage workspace configuration from one place.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setCurrentView('settings_manage_workspace')}
                    className="text-left bg-[#0a0a0a] border border-[#333333] hover:border-zinc-500 p-6 rounded-none transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                                 <AppIcon name="apartment" className="h-[20px] w-[20px] text-[#a78bfa]" />
                      <h3 className="text-lg font-semibold text-[#f4f0e6]">Manage Workspace</h3>
                    </div>
                    <p className="text-[13px] text-[#a3a3a3] font-medium">Update workspace profile and control critical workspace actions.</p>
                  </button>

                  <div className="bg-[#0a0a0a] border border-[#333333] p-6 rounded-none opacity-70">
                    <div className="flex items-center gap-3 mb-3">
                                 <AppIcon name="security" className="h-[20px] w-[20px] text-[#8a8a8a]" />
                      <h3 className="text-lg font-semibold text-[#f4f0e6]">Security</h3>
                    </div>
                    <p className="text-[13px] text-[#a3a3a3] font-medium">Coming soon: access policies, session controls, and audit preferences.</p>
                  </div>
                </div>
             </div>
          )}

          {currentView === 'settings_manage_workspace' && (
             <div className="pt-24 px-10 max-w-3xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto">
                <button 
                  onClick={() => setCurrentView('settings')}
                  className="mb-6 flex items-center gap-2 text-[13px] font-medium text-[#a3a3a3] hover:text-[#f4f0e6] transition-colors"
                >
                           <AppIcon name="arrow_back" className="h-[16px] w-[16px]" /> Back to Settings
                </button>
                <div className="space-y-2 mb-8 bg-[#0a0a0a] border border-[#333333] p-8 rounded-none shadow-sm">
                  <h1 className="text-3xl font-semibold text-[#f4f0e6] tracking-tight">Manage Workspace</h1>
                  <p className="text-[14px] text-[#a3a3a3] font-medium">Workspace profile, ownership context, and lifecycle controls.</p>
                </div>

                <div className="space-y-2 mb-8 bg-[#0a0a0a] border border-[#333333] p-8 rounded-none shadow-sm">
                   <div className="space-y-4 mb-8">
                      <h3 className="text-xl font-bold text-[#f4f0e6] tracking-wide">Workspace Profile</h3>
                      <div className="flex items-center gap-6 bg-[#111111] p-6 rounded-none border border-[#222222]">
                         <div className="w-20 h-20 rounded-none bg-[#a78bfa] border border-zinc-800 text-black flex items-center justify-center font-bold text-2xl shadow-inner">
                            {organization?.name?.charAt(0) || 'O'}
                         </div>
                         <div className="space-y-1.5">
                            <div className="text-lg font-semibold text-[#f4f0e6] tracking-wide">{organization?.name}</div>
                            <div className="text-[13px] text-[#a3a3a3] font-medium flex items-center gap-2">
                               <AppIcon name="domain" className="h-[15px] w-[15px]" /> {organization?.industry || 'Technology'}
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="h-px w-full bg-[#222222] my-8"></div>
                   
                   <div className="space-y-4">
                      <h3 className="text-[13px] font-bold uppercase tracking-widest text-red-500">Danger Zone</h3>
                      <div className="flex items-center justify-between p-6 border border-red-900/50 bg-red-900/10 rounded-none">
                          <div className="space-y-1">
                             <p className="text-[14px] font-semibold text-red-400">Delete Workspace</p>
                             <p className="text-[13px] text-red-500/70 font-medium">Permanently delete this workspace and all its data.</p>
                          </div>
                          <button
                            onClick={handleDeleteWorkspace}
                            className="px-6 py-2.5 bg-red-900/20 hover:bg-red-900/30 border border-red-900/50 text-red-400 rounded-none text-[13px] font-bold transition-colors">
                            Delete
                          </button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeChatSession && (
             <div className="relative flex flex-1 min-h-0 self-stretch">
                <ChatArea 
                   activeChatSession={activeChatSession} connections={connections}
                   isFullView={isFullView} setIsFullView={setIsFullView}
                   messagesEndRef={messagesEndRef} addLog={addLog} fetchWithAuth={fetchWithAuth}
                   handleApproval={handleApproval} handleSubmit={handleSubmit}
                   input={input} setInput={setInput} isTyping={isTyping}
                />
             </div>
          )}

          <IDEArea 
             activeIdeTab={activeIdeTab} activeConnection={activeConnection}
             isFullView={isFullView} setIsFullView={setIsFullView} 
          />

        </main>

        <TerminalLogs 
          terminalLogs={terminalLogs} 
          isOpen={isTerminalOpen} 
          setIsOpen={setIsTerminalOpen} 
        />
      </div>

      <style dangerouslySetInnerHTML={{__html:`
      @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      .bg-pan-x { background-size: 200% 200%; animation: gradient-x 15s ease infinite; }
      @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}}/>
    </>
  );
}
