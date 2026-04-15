import { DashboardTab } from "./types";
import { AppIcon } from "./AppIcon";

interface TabBarProps {
  openTabs: DashboardTab[];
  currentView: string;
  setCurrentView: (view: string) => void;
  closeTab: (id: string) => void;
  openNewTab: () => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (val: boolean) => void;
}

export function TabBar({ openTabs, currentView, setCurrentView, closeTab, openNewTab, isSidebarOpen, setIsSidebarOpen }: TabBarProps) {
  return (
    <div className="flex items-end overflow-x-auto bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#333333] pt-2 px-4 h-12 shrink-0 z-40 relative no-scrollbar">
      {/* Menu button when Sidebar is closed */}
      {!isSidebarOpen && setIsSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="mr-2 mb-1 p-1.5 rounded-none text-zinc-400 hover:text-zinc-100 hover:bg-[#111111] transition-colors border border-transparent hover:border-[#333333] shrink-0"
          title="Expand Sidebar"
        >
          <AppIcon name="menu" className="w-5 h-5" />
        </button>
      )}

      {/* Tabs */}

      {openTabs.map(tab => (
        <div 
          key={tab.id}
          className={`flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] border-t-2 border-l border-r rounded-none transition-colors cursor-pointer mr-1 relative bottom-[-1px] group ${currentView === tab.id ? 'bg-[#111111] text-zinc-100 border-[#333333] border-t-[#a78bfa] border-b-[#111111]' : 'bg-[#0a0a0a] text-zinc-400 hover:bg-[#111111]/70 border-transparent hover:border-[#333333] border-t-transparent'}`}
          onClick={() => setCurrentView(tab.id)}
        >
          <AppIcon 
            name={tab.icon || (tab.type === 'welcome' ? 'home' : tab.type === 'chat' ? 'chat_bubble' : 'terminal')} 
            className="w-5 h-5 shrink-0 transition-all duration-300 group-hover:text-[#a78bfa] group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" 
          />
          <span className="truncate text-[11px] font-mono tracking-wide font-medium flex-1">{tab.title}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            className={`p-1 rounded-none text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ${currentView === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <AppIcon name="close" className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button 
        onClick={openNewTab}
        className="ml-2 mb-1 p-1.5 rounded-none text-zinc-400 hover:text-zinc-100 hover:bg-[#111111] transition-colors border border-transparent hover:border-[#333333]"
        title="Open new tab (Home)"
      >
        <AppIcon name="add" className="w-5 h-5" />
      </button>
    </div>
  );
}
