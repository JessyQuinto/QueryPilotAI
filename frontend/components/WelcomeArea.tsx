import { Connection, Organization } from "./types";
import { TypewriterTitle } from "./TypewriterTitle";
import { AppIcon } from "./AppIcon";

interface WelcomeAreaProps {
  userName: string;
  organization: Organization | null;
  connections: Connection[];
  setCurrentView: (view: string) => void;
  setEditingConnId: (id: string | null) => void;
  setConnForm: (form: Partial<Connection>) => void;
}

export function WelcomeArea({ userName, setCurrentView }: WelcomeAreaProps) {
  return (
      <div className="mono-theme mosaic-center flex-1 flex flex-col items-center pt-32 px-10 bg-transparent w-full h-full relative overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-14 mono-enter flex flex-col items-start w-full">
                  <div className="flex items-center gap-3 w-full mb-6">
                      <div className="w-16 h-[3px] bg-[#a78bfa] rounded-full shadow-[0_0_12px_#a78bfa]"></div>
                      <div className="flex-1 h-px bg-gradient-to-r from-[#a78bfa]/40 via-[#a78bfa]/10 to-transparent"></div>
                  </div>
                  <h2 className="text-[14px] font-mono font-bold text-[#a78bfa] mb-3 uppercase tracking-[0.2em] min-h-[22px] drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]">
               <TypewriterTitle text={`> Welcome [ ${userName.split(' ')[0]} ] Again_`} speedMs={60} startDelayMs={0} />
            </h2>
                  <h1 className="text-2xl font-mono font-bold text-zinc-100 tracking-wider max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] leading-tight">
               <TypewriterTitle text="Let's get you started with QueryPilot" speedMs={52} startDelayMs={1100} />
            </h1>
        </div>
        
        {/* Action Cards */}
        <div className="space-y-4">
           {/* Card 1: Connect Data Source */}
           <button 
              onClick={() => setCurrentView('integrations')}
              className="mono-enter-delay-1 w-full bg-[#0a0a0a] hover:bg-[#111111] border border-[#333333] hover:border-[#a78bfa] p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-[#111111] flex items-center justify-center shrink-0 border border-[#222222] group-hover:bg-[#a78bfa] transition-colors">
                    <AppIcon name="database" className="h-[24px] w-[24px] text-[#8a8a8a] group-hover:text-black" />
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-zinc-100 mb-1 tracking-wide">Connect Your Data Source</h3>
                    <p className="text-[13px] text-zinc-400 font-medium">Start asking questions and create charts from your data</p>
                 </div>
              </div>
              <AppIcon name="arrow_forward" className="h-[20px] w-[20px] text-zinc-500 group-hover:text-zinc-200 transition-colors group-hover:translate-x-1 duration-300" />
           </button>

           {/* Card 2: Read Docs */}
           <button 
              onClick={() => {
                window.location.href = '/docs';
              }}
              className="mono-enter-delay-2 mono-scanline w-full bg-[#0a0a0a] hover:bg-[#111111] border border-[#333333] hover:border-[#a78bfa] p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-[#111111] flex items-center justify-center shrink-0 border border-[#222222] group-hover:bg-[#a78bfa] transition-colors">
                    <AppIcon name="description" className="h-[24px] w-[24px] text-[#8a8a8a] group-hover:text-black" />
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-[#f4f0e6] mb-1 tracking-wide">Read Our Integration Docs</h3>
                    <p className="text-[13px] text-[#8a8a8a] font-medium">Learn how to connect your data source with QueryPilot</p>
                 </div>
              </div>
              <AppIcon name="arrow_forward" className="h-[20px] w-[20px] text-zinc-500 group-hover:text-zinc-200 transition-colors group-hover:translate-x-1 duration-300" />
           </button>
        </div>
      </div>
    </div>
  );
}
