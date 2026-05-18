import { LogEntry } from "./types";
import { useEffect, useRef } from "react";

type TerminalIconName = "dock_to_right" | "side_navigation" | "close" | "terminal";

function TerminalIcon({ name, className = "" }: { name: TerminalIconName; className?: string }) {
  const stroke = "currentColor";

  switch (name) {
    case "dock_to_right":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={stroke} strokeWidth="2" />
          <path d="M16 4V20" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "side_navigation":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={stroke} strokeWidth="2" />
          <path d="M8 4V20" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M6 6L18 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M18 6L6 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "terminal":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 6L10 12L4 18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 18H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

interface TerminalLogsProps {
    terminalLogs: LogEntry[];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function TerminalLogs({ terminalLogs, isOpen, setIsOpen }: TerminalLogsProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs, isOpen]);

  return (
    <div className={`h-[100dvh] transition-all duration-500 ease-in-out border-l border-white/5 flex relative z-40 bg-black/95 backdrop-blur-2xl ${isOpen ? 'w-[450px]' : 'w-[50px]'}`}>
      
      {/* VERTICAL BAR (Lambda Style) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-[50px] h-full flex flex-col items-center py-8 cursor-pointer hover:bg-white/5 transition-colors border-r border-white/5 select-none"
      >
        <TerminalIcon name={isOpen ? "dock_to_right" : "side_navigation"} className="h-[22px] w-[22px] text-indigo-400 mb-12" />
        
        <div className="flex-1 flex items-center justify-center">
            <h3 className="whitespace-nowrap text-[11px] font-mono tracking-[0.3em] uppercase font-black text-indigo-200/50 transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
               // SYSTEM TERMINAL <span className="text-indigo-400">PIPELINE</span> //
            </h3>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 text-indigo-500/50">
            <span className="text-[10px] font-mono font-bold">SYS_01</span>
            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
        </div>
      </div>

      {/* TERMINAL CONTENT (Sliding out) */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    <h3 className="text-[12px] font-black tracking-widest uppercase text-indigo-100 font-mono">System Logs & Pipeline</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <TerminalIcon name="close" className="h-[18px] w-[18px]" />
                </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-4 leading-relaxed bg-[#020202]" ref={terminalRef}>
               {terminalLogs.length === 0 && (
                   <div className="text-zinc-600 italic font-medium">// Waiting for system activity...</div>
               )}
               {terminalLogs.map((log) => {
                   const isOrchestrator = log.message.includes('[Orchestrator]');
                   const cleanMessage = log.message.replace('[Orchestrator]', '').trim();
                   
                   return (
                   <div key={log.id} className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                       <span className="text-zinc-600 font-mono text-[10px] tabular-nums font-medium">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}
                       </span>
                       <div className="flex items-start gap-3">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-tighter uppercase border ${
                               isOrchestrator ? 'bg-cyan-900/20 text-cyan-400 border-cyan-500/20' :
                               log.level === 'INFO' ? 'bg-indigo-900/20 text-indigo-400 border-indigo-500/20' : 
                               log.level === 'SUCCESS' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' : 
                               log.level === 'ERROR' ? 'bg-red-900/20 text-red-400 border-red-500/20' : 
                               log.level === 'WARN' ? 'bg-amber-900/20 text-amber-400 border-amber-500/20' : 
                               'bg-zinc-900 text-zinc-400 border-zinc-800'
                           }`}>
                               {isOrchestrator ? 'PIPELINE' : log.level}
                           </span>
                           <span className={`break-words tracking-tight ${
                               isOrchestrator ? 'text-cyan-300/90 font-semibold' :
                               log.level === 'ERROR' ? 'text-red-300/80' : 
                               log.level === 'WARN' ? 'text-amber-300/80' : 
                               log.level === 'SUCCESS' ? 'text-emerald-300/90' :
                               'text-zinc-300'
                           }`}>
                               {cleanMessage}
                           </span>
                       </div>
                   </div>
               )})}
               
               {/* Animated Cursor */}
               <div className="flex items-center gap-2 text-indigo-500 mt-6 opacity-80">
                <TerminalIcon name="terminal" className="h-[14px] w-[14px]" />
                  <div className="w-2 h-4 bg-indigo-500 animate-pulse"></div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
