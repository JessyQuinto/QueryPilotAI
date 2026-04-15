import { DashboardTab, Connection } from "./types";
import { AppIcon } from "./AppIcon";

interface IDEAreaProps {
  activeIdeTab: DashboardTab | null;
  activeConnection: Connection | undefined;
  isFullView: boolean;
  setIsFullView: React.Dispatch<React.SetStateAction<boolean>>;
}

export function IDEArea({ activeIdeTab, activeConnection, isFullView, setIsFullView }: IDEAreaProps) {
  if (!activeIdeTab || !activeConnection) return null;

  return (
      <div className={`flex flex-col h-full bg-zinc-950 transition-all duration-300 ease-in-out relative ${isFullView ? 'opacity-100 flex-1' : 'opacity-100 flex-1 z-10'}`}>
        <button 
           onClick={() => setIsFullView(!isFullView)}
                className="icon-button absolute top-6 left-6 z-50 p-2.5 rounded-xl shadow-sm transition-all items-center justify-center group hidden md:flex"
           title={isFullView ? "Show Settings Panel" : "Hide Settings Panel"}
        >
           <AppIcon name={isFullView ? 'close_fullscreen' : 'fullscreen'} className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110" />
        </button>

        <div className={`pt-6 pb-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30 transition-all duration-300 ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
           <div className="flex items-center justify-between mx-auto max-w-5xl">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm">
                    <AppIcon name="terminal" className="h-[20px] w-[20px]" />
                 </div>
                 <div className="flex flex-col">
                     <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{activeIdeTab.title}</h2>
                     <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-400 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
                         IDE Session • {activeConnection.name}
                     </div>
                 </div>
              </div>
           </div>
        </div>

        <div className={`flex-1 overflow-hidden w-full transition-all duration-300 flex flex-col ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
            <div className="max-w-5xl flex-1 mx-auto w-full py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="w-full bg-zinc-950 rounded-2xl shadow-xl border border-zinc-800 flex flex-col overflow-hidden text-zinc-300 h-64 shrink-0">
                  <div className="flex items-center px-4 py-2 border-b border-zinc-800/80 bg-[#0a0a0b]/80 ">
                     <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                        <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                     </div>
                     <span className="mx-auto text-[11px] font-mono tracking-widest uppercase text-zinc-500 font-bold select-none">SQL Editor</span>
                     <div className="w-10"></div>
                  </div>
                  <div className="flex-1 p-4 font-mono text-[13px] leading-loose relative opacity-50 cursor-not-allowed">
                     <span className="text-blue-400">SELECT</span> * <span className="text-blue-400">FROM</span> users <span className="text-blue-400">WHERE</span> active = <span className="text-amber-300">true</span>;<br/>
                     <span className="text-zinc-600">-- Coming soon: Full featured graphical IDE</span>
                  </div>
               </div>
               
               <div className="flex-1 surface-base rounded-2xl shadow-sm flex flex-col overflow-hidden opacity-60 relative pointer-events-none">
                  <div className="absolute inset-0 z-10 bg-zinc-950/90 flex items-center justify-center -[1px]">
                     <div className="surface-muted px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                        <AppIcon name="construction" className="h-[20px] w-[20px] text-zinc-100" />
                        <span className="text-[13px] font-semibold text-zinc-100">Result parsing in development</span>
                     </div>
                  </div>
                  <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
                     <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Results Explorer</span>
                  </div>
                  <div className="p-4 grid grid-cols-4 gap-4">
                     {Array.from({length: 8}).map((_, i) => (
                        <div key={i} className="h-8 bg-zinc-800 rounded-lg"></div>
                     ))}
                  </div>
               </div>
            </div>
        </div>
    </div>
  );
}
