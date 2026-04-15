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
    <div className={`h-[100dvh] transition-all duration-500 ease-in-out border-l border-[#333333] flex relative z-40 bg-black ${isOpen ? 'w-[450px]' : 'w-[50px]'}`}>
      
      {/* VERTICAL BAR (Lambda Style) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-[50px] h-full flex flex-col items-center py-8 cursor-pointer hover:bg-[#111111] transition-colors border-r border-[#222222] select-none"
      >
        <TerminalIcon name={isOpen ? "dock_to_right" : "side_navigation"} className="h-[22px] w-[22px] text-[#a78bfa] mb-12" />
        
        <div className="flex-1 flex items-center justify-center">
            <h3 className="whitespace-nowrap text-[11px] font-mono tracking-[0.3em] uppercase font-black text-[#a3a3a3] transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
               // TERMINAL DE AGENTE <span className="text-[#f4f0e6]">INSIGHTFORGE</span> //
            </h3>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 text-[#444444]">
            <span className="text-[10px] font-mono font-bold">V0.2</span>
            <div className="w-1 h-1 rounded-none bg-[#a78bfa] animate-pulse"></div>
        </div>
      </div>

      {/* TERMINAL CONTENT (Sliding out) */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="flex items-center justify-between px-6 py-5 border-b border-[#222222] bg-black ">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-none bg-[#a78bfa]"></div>
                    <h3 className="text-[12px] font-black tracking-widest uppercase text-[#f4f0e6] font-mono ls-1">System Logs</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-[#a3a3a3] hover:text-white transition-colors">
                  <TerminalIcon name="close" className="h-[18px] w-[18px]" />
                </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-4 leading-relaxed bg-[#050505]" ref={terminalRef}>
               {terminalLogs.length === 0 && (
                   <div className="text-[#444444] italic font-medium">// Waiting for agent activity...</div>
               )}
               {terminalLogs.map((log) => (
                   <div key={log.id} className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                       <span className="text-[#555555] font-mono text-[10px] tabular-nums font-bold">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(log.timestamp).getMilliseconds()}
                       </span>
                       <div className="flex items-start gap-3">
                           <span className={`px-2 py-0.5 rounded-none text-[9px] font-black tracking-tighter uppercase ${
                               log.level === 'INFO' ? 'bg-[#a78bfa]/10 text-[#a78bfa]' : 
                               log.level === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 
                               log.level === 'ERROR' ? 'bg-red-900/100/10 text-red-400' : 
                               log.level === 'WARN' ? 'bg-amber-500/10 text-amber-400' : 
                               'bg-zinc-800 text-zinc-400'
                           }`}>
                               {log.level}
                           </span>
                           <span className={`break-words tracking-tight font-medium ${log.level === 'ERROR' ? 'text-red-300/80' : log.level === 'WARN' ? 'text-amber-300/80' : 'text-[#dfe2eb]'}`}>
                               {log.message}
                           </span>
                       </div>
                   </div>
               ))}
               
               {/* Animated Cursor */}
               <div className="flex items-center gap-2 text-[#a78bfa] mt-6 opacity-80">
                <TerminalIcon name="terminal" className="h-[14px] w-[14px]" />
                  <div className="w-2 h-4 bg-[#a78bfa] animate-pulse"></div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
