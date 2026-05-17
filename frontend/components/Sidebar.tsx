import { ChatSession, Connection, DashboardTab, LogEntry } from "./types";
import { toast } from "sonner";
import { useMsal } from "@azure/msal-react";
import { useState } from "react";
import { AppIcon } from "./AppIcon";

// SidebarIcon is now a thin wrapper over AppIcon for type-safety on sidebar-specific icons.
// All SVG definitions live in AppIcon.tsx (single source of truth).
type SidebarIconName =
  | "chevron_left"
  | "unfold_more"
  | "grid_view"
  | "dns"
  | "tune"
  | "database"
  | "add"
  | "chevron_right"
  | "edit"
  | "delete"
  | "logout";

function SidebarIcon({ name, className = "" }: { name: SidebarIconName; className?: string }) {
  // "unfold_more" and "logout" are sidebar-specific — render inline; all others delegate to AppIcon
  const stroke = "currentColor";
  switch (name) {
    case "unfold_more":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M8 9L12 5L16 9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 15L12 19L16 15" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chevron_left":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M15 6L9 12L15 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M10 17L15 12L10 7" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 12H4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 4H18V20H12" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <AppIcon name={name} className={className} />;
  }
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  organization: { name: string; industry?: string } | null;
  userName: string;
  currentView: string;
  setCurrentView: (view: string) => void;
  connections: Connection[];
  chatSessions: ChatSession[];
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  expandedConns: Record<string, boolean>;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openChat: (chatId: string) => void;
  setEditingConnId: (id: string | null) => void;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
  addLog: (level: LogEntry["level"], msg: string) => void;
  createChatSession: (connectionId: string, title?: string) => Promise<ChatSession>;
  deleteChatSession: (sessionId: string) => Promise<void>;
  renameChatSession: (sessionId: string, title: string) => Promise<string>;
  openPageTab: (id: string, title: string, icon: string) => void;
}

export function Sidebar({
  isSidebarOpen, setIsSidebarOpen, organization, userName, currentView, setCurrentView,
  connections, chatSessions, openTabs, setOpenTabs, expandedConns, setExpandedConns,
  openChat, setEditingConnId, setConnForm, addLog, createChatSession, deleteChatSession, renameChatSession, openPageTab
}: SidebarProps) {
  const { instance } = useMsal();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState("");

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  };

  const beginRenameChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingChatTitle(currentTitle);
  };

  const commitRenameChat = async (chatId: string) => {
    const normalizedTitle = editingChatTitle.trim();
    if (!normalizedTitle) {
      toast.error("El nombre del chat no puede estar vacío.");
      return;
    }

    try {
      const savedTitle = await renameChatSession(chatId, normalizedTitle);
      setOpenTabs(prev => prev.map(tab => tab.id === chatId ? { ...tab, title: savedTitle } : tab));
      setEditingChatId(null);
      setEditingChatTitle("");
      toast.success("Nombre del chat actualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible renombrar el chat.";
      toast.error(message);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-[#a78bfa]/50 z-40 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed inset-y-0 left-0 z-50 md:relative flex shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0 w-[260px] md:w-0'}`}>
        <aside className={`bg-[#000000] border-r border-[#333333] flex flex-col justify-between absolute inset-0 z-20 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0 overflow-hidden border-none pointer-events-none'}`}>
          
          <button 
             onClick={() => setIsSidebarOpen(false)}
             className="absolute right-2 top-4 w-9 h-9 bg-[#0a0a0a] border border-[#333333] rounded-xl flex items-center justify-center text-[#8a8a8a] hover:text-[#f4f0e6] hover:bg-[#111111] transition-colors z-50 shadow-sm"
          >
             <SidebarIcon name="chevron_left" className="h-5 w-5" />
          </button>

          <div className="flex flex-col h-full">
        {/* Workspace Switcher */}
        <button type="button" className="py-5 px-6 flex items-center justify-between group cursor-pointer border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-none overflow-hidden shadow-sm flex items-center justify-center bg-[#a78bfa]">
               <span className="text-black text-[10px] font-bold">{organization?.name?.charAt(0) || 'O'}</span>
            </div>
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[#f4f0e6] transition-colors">
              {organization?.name || `${userName.split(' ')[0]}'s workspace`}
            </span>
          </div>
          <SidebarIcon name="unfold_more" className="h-4 w-4 text-[#8a8a8a] group-hover:text-[#f4f0e6] transition-colors" />
        </button>
        
        {/* Navigation Links & Connections */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="px-4 py-4 space-y-1 border-b border-[#333333]">
            <button 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[11px] font-mono tracking-wide transition-all duration-200 group active:scale-[0.98] border-l-2 ${currentView === 'welcome' || currentView === 'integrations' || currentView === 'connect_postgres' ? 'bg-[#1a1a1a] text-[#f4f0e6] border-[#a78bfa] font-medium' : 'border-transparent text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}
              onClick={() => openPageTab('welcome', 'Data Sources', 'grid_view')}
            >
              <SidebarIcon name="grid_view" className="h-[22px] w-[22px] transition-transform text-[#8a8a8a] group-hover:text-[#a78bfa] group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
              <span className="group-hover:translate-x-1 transition-transform duration-200">Data Sources</span>
            </button>
            <button 
              onClick={() => openPageTab('manage_connections', 'Manage Conns', 'dns')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[11px] font-mono tracking-wide transition-all duration-200 group active:scale-[0.98] border-l-2 ${currentView === 'manage_connections' ? 'bg-[#1a1a1a] text-[#f4f0e6] border-[#a78bfa] font-medium' : 'border-transparent text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}>
              <SidebarIcon name="dns" className="h-[22px] w-[22px] transition-transform text-[#8a8a8a] group-hover:text-[#a78bfa] group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
              <span className="group-hover:translate-x-1 transition-transform duration-200">Manage Connections</span>
            </button>
            <button 
              onClick={() => openPageTab('settings', 'Settings', 'tune')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[11px] font-mono tracking-wide transition-all duration-200 group active:scale-[0.98] border-l-2 ${currentView.startsWith('settings') ? 'bg-[#1a1a1a] text-[#f4f0e6] border-[#a78bfa] font-medium' : 'border-transparent text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}>
              <SidebarIcon name="tune" className="h-[22px] w-[22px] transition-transform text-[#8a8a8a] group-hover:text-[#a78bfa] group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
              <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
            </button>
          </div>
          
          <div className="px-4 py-4">
             <div className="flex items-center justify-between px-3 text-[11px] uppercase tracking-widest text-[#a3a3a3] font-bold mb-3">
                <span className="flex items-center gap-2">
                  <SidebarIcon name="database" className="h-[22px] w-[22px] text-[#8a8a8a]" />
                  Connections
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingConnId(null); setConnForm({ name: "New Connection", host: "", port: "5432", database: "", username: "", password: "", type: "PostgreSQL" }); openPageTab('integrations', 'New Connection', 'add'); }} className="hover:text-[#f4f0e6] transition-colors text-[#8a8a8a]" title="New Connection">
                    <SidebarIcon name="add" className="h-4 w-4" />
                  </button>
                </div>
             </div>
             
             <div className="space-y-3">
                {connections.map(conn => {
                   const chats = chatSessions.filter(c => c.connectionId === conn.id);
                   const isConnActive = chats.some(c => c.id === currentView) || openTabs.some(t => t.connectionId === conn.id && t.id === currentView);
                   const isExpanded = expandedConns[conn.id] !== false;
                   
                   return (
                      <div key={conn.id} className="space-y-1">
                         <div className={`flex items-center justify-between px-3 py-1.5 rounded-none text-[11px] font-mono font-medium tracking-wide transition-colors group ${isConnActive ? 'bg-[#1a1a1a] text-[#f4f0e6]' : 'text-[#b5b5b5] hover:bg-[#111111] hover:text-[#f4f0e6]'}`}>
                             <button 
                                onClick={() => setExpandedConns(prev => ({ ...prev, [conn.id]: prev[conn.id] === false ? true : false }))}
                                className="w-5 h-5 flex items-center justify-center text-[#8a8a8a] hover:text-[#f4f0e6] transition-colors shrink-0"
                             >
                                <SidebarIcon name="chevron_right" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                             </button>
                             <button 
                                onClick={() => {
                                   if (chats.length === 0) {
                                       void (async () => {
                                         try {
                                           const session = await createChatSession(conn.id, 'New Chat');
                                           setOpenTabs(prev => { 
                                               if (!prev.find(t => t.id === session.id)) {
                                                   return [...prev, { type: 'chat', id: session.id, title: session.title, connectionId: conn.id }];
                                               }
                                               return prev;
                                           });
                                           setCurrentView(session.id);
                                           setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                                           addLog("SUCCESS", `Chat session created for ${conn.name}.`);
                                         } catch (error) {
                                           const message = error instanceof Error ? error.message : 'Failed to create chat.';
                                           toast.error(message);
                                           addLog("ERROR", message);
                                         }
                                       })();
                                   } else {
                                       openChat(chats[chats.length - 1].id);
                                   }
                                }}
                                className="flex flex-1 items-center gap-3 truncate text-left h-full py-1 ml-1"
                             >
                                 <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
                                    {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-4 h-4 object-contain" alt="Azure SQL" />}
                                    {conn.type === 'PostgreSQL' && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-4 h-4 object-contain" alt="PostgreSQL" />}
                                    {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-4 h-4 object-contain" alt="MySQL" />}
                                    {(!conn.type || !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type)) && (
                                      <SidebarIcon name="database" className="h-4 w-4 text-[#8a8a8a]" />
                                    )}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-none border border-[#fafafa] transition-colors ${isConnActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>
                                 </div>
                                <span className="truncate">{conn.name}</span>
                             </button>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void (async () => {
                                      try {
                                        const session = await createChatSession(conn.id, 'New Chat');
                                        setOpenTabs(prev => {
                                          if (prev.find(t => t.id === session.id)) {
                                            return prev;
                                          }

                                          return [...prev, { type: 'chat', id: session.id, title: session.title, connectionId: conn.id }];
                                        });
                                        setCurrentView(session.id);
                                        setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                                        addLog("SUCCESS", `Chat session created for ${conn.name}.`);
                                      } catch (error) {
                                        const message = error instanceof Error ? error.message : 'Failed to create chat.';
                                        toast.error(message);
                                        addLog("ERROR", message);
                                      }
                                    })();
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#222222] rounded-none text-[#a3a3a3] hover:text-[#f4f0e6] transition-all shrink-0 ml-1" 
                                title="New Chat">
                                  <SidebarIcon name="add" className="h-4 w-4" />
                              </button>
                         </div>
                         {isExpanded && chats.length > 0 && (
                            <div className="pl-6 pr-2 space-y-0.5">
                               {chats.map(chat => (
                                  <div key={chat.id} className="group flex items-center pr-1">
                                   {editingChatId === chat.id ? (
                                     <input
                                       autoFocus
                                       value={editingChatTitle}
                                       onChange={(e) => setEditingChatTitle(e.target.value)}
                                       onBlur={() => { void commitRenameChat(chat.id); }}
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter') {
                                          e.preventDefault();
                                          void commitRenameChat(chat.id);
                                         }
                                         if (e.key === 'Escape') {
                                          e.preventDefault();
                                          setEditingChatId(null);
                                          setEditingChatTitle("");
                                         }
                                       }}
                                       className="flex-1 px-3 py-1.5 rounded-none text-[11px] font-mono tracking-wide bg-[#111111] text-[#f4f0e6] border border-[#333333] focus:outline-none focus:border-[#a78bfa]"
                                     />
                                   ) : (
                                     <button 
                                       onClick={() => openChat(chat.id)}
                                        className={`flex-1 text-left truncate px-3 py-1.5 rounded-none text-[11px] font-mono tracking-wide transition-colors ${currentView === chat.id ? 'bg-[#1a1a1a] text-[#f4f0e6] font-medium' : 'text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#111111]'}`}
                                     >
                                       {chat.title}
                                     </button>
                                   )}
                                   <button
                                     onClick={(e) => {
                                      e.stopPropagation();
                                      beginRenameChat(chat.id, chat.title || "New Chat");
                                     }}
                                     className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#222222] text-[#a3a3a3] hover:text-[#f4f0e6] rounded-none transition-all shrink-0 ml-1"
                                     title="Rename Chat"
                                   >
                                     <SidebarIcon name="edit" className="h-3.5 w-3.5" />
                                   </button>
                                     <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              if (!confirm('Are you sure you want to delete this chat? All messages will be lost.')) return;
                                              void deleteChatSession(chat.id)
                                                .then(() => {
                                                  setOpenTabs(prev => {
                                                      const newTabs = prev.filter(t => t.id !== chat.id);
                                                      if (currentView === chat.id) {
                                                          setCurrentView(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome');
                                                      }
                                                      return newTabs;
                                                  });
                                                  toast.success('Chat deleted.');
                                                })
                                                .catch((error) => {
                                                  const message = error instanceof Error ? error.message : 'Failed to delete chat.';
                                                  toast.error(message);
                                                });
                                          }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/10 text-red-500 hover:text-red-500 rounded-none transition-all shrink-0 ml-1"
                                        title="Delete Chat"
                                     >
                                         <SidebarIcon name="delete" className="h-3.5 w-3.5" />
                                     </button>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        </div>

        {/* User + Logout */}
        <div className="border-t border-[#333333] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-none bg-[#222222] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-[#b5b5b5]">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <span className="text-[11px] font-mono tracking-wide text-[#b5b5b5] truncate">{userName || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-none text-[#8a8a8a] hover:text-red-500 hover:bg-red-900/10 transition-all"
              title="Sign out"
            >
              <SidebarIcon name="logout" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
      </div>
    </>
  );
}
