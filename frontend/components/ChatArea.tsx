import { useState, useEffect, useRef } from "react";
import { ChatSession, Message, Connection } from "./types";
import { TypewriterTitle } from "./TypewriterTitle";
import { AppIcon } from "./AppIcon";
import { ChartSuggestion } from "./ChartSuggestion";

type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";

interface ChatAreaProps {
  activeChatSession: ChatSession | null;
  connections: Connection[];
  isFullView: boolean;
  setIsFullView: React.Dispatch<React.SetStateAction<boolean>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
   addLog: (level: LogLevel, msg: string) => void;
   fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  handleApproval: (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => void;
  handleSubmit: () => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isTyping: boolean;
}

function extractQuestionnaireItems(content?: string): string[] {
   if (!content) return [];

   const listItems: string[] = [];
   const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

   for (const line of lines) {
      const cleaned = line.replace(/^(?:\d+[\)\.\-:]|[-*•])\s*/, "").trim();
      if (cleaned && cleaned !== line) {
         listItems.push(cleaned.replace(/[.;]+$/, ""));
      }
   }

   if (listItems.length > 0) {
      return Array.from(new Set(listItems)).slice(0, 5);
   }

   const questionLines = lines
      .filter(line => line.includes("?"))
      .map(line => line.replace(/[.;]+$/, ""));

   return Array.from(new Set(questionLines)).slice(0, 5);
}

export function ChatArea({
   activeChatSession, connections, isFullView, messagesEndRef,
  addLog, fetchWithAuth, handleApproval, handleSubmit, input, setInput, isTyping
}: ChatAreaProps) {
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
   const [expandedProgress, setExpandedProgress] = useState<Record<string, boolean>>({});
   const messagesScrollRef = useRef<HTMLDivElement>(null);

  const activeConnection = connections.find(c => c.id === activeChatSession?.connectionId);

  useEffect(() => {
      const container = messagesScrollRef.current;
      if (!container) return;

      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [activeChatSession?.messages]);

  if (!activeChatSession) return null;

  return (
      <div className={`mosaic-center flex flex-col w-full min-h-0 self-stretch h-full bg-[#000000] text-[#f4f0e6] transition-all duration-300 ease-in-out relative overflow-hidden ${isFullView ? 'opacity-100 flex-1' : 'opacity-100 flex-1 z-10'}`}>
         <div className="absolute inset-0 flex flex-col min-h-0">

      <div className={`pt-6 pb-4 border-b border-[#333333] bg-[#000000]/95 sticky top-0 z-30 transition-all duration-300 ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
           <div className="flex items-center justify-between mx-auto max-w-4xl">
              <div className="flex flex-col">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                     <AppIcon name="chat_bubble" className="h-[22px] w-[22px] text-zinc-400" />
                     <TypewriterTitle text={activeChatSession.title} speedMs={40} startDelayMs={120} />
                  </h2>
                           <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-400 mt-2">
                                 <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Connected
                                 </span>
                                 <span className="text-zinc-500">{activeConnection ? activeConnection.name : 'Unknown Database'}</span>
                  </div>
              </div>
              <div className="flex gap-2">
                 <button className="icon-button p-2 rounded-lg transition-colors" title="Clear Chat">
                    <AppIcon name="delete" className="h-[18px] w-[18px] text-zinc-200" />
                 </button>
              </div>
           </div>
        </div>

      <div ref={messagesScrollRef} className={`flex-1 min-h-0 overflow-y-auto w-full transition-all duration-300 scroll-smooth ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
          <div className="max-w-4xl mx-auto py-8 space-y-8">
            {activeChatSession.messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-full max-w-2xl rounded-3xl border border-[#333333] bg-[#0a0a0a] px-8 py-10 shadow-sm">
                    <div className="mx-auto mb-6 w-20 h-20 surface-base rounded-3xl flex items-center justify-center shadow-sm">
                      <AppIcon name="chat_bubble" className="h-[40px] w-[40px] text-zinc-300" />
                    </div>
                    <div className="max-w-sm mx-auto space-y-2">
                      <h3 className="text-xl font-semibold text-zinc-100 tracking-tight">How can I help you today?</h3>
                      <p className="text-[14px] text-zinc-400 font-medium leading-relaxed">Ask anything about your database {activeConnection?.name}. I can analyze data, write SQL, and create visualizations.</p>
                    </div>
                    <div className="mt-6 flex gap-3 flex-wrap justify-center">
                      {["Show recent transactions", "Summarize user growth", "Find data anomalies"].map(suggestion => (
                          <button 
                            key={suggestion}
                            onClick={() => { setInput(suggestion); setTimeout(() => handleSubmit(), 100); }}
                            className="interactive-card px-4 py-2.5 rounded-xl text-[13px] font-medium text-zinc-300 transition-all shadow-sm active:scale-95">
                              {suggestion}
                          </button>
                      ))}
                    </div>
                  </div>
               </div>
            ) : (
                        activeChatSession.messages.map((msg, i) => {
                           const questionnaireItems = extractQuestionnaireItems(msg.content);
                           const isClarificationQuestionnaire =
                              msg.role === "ai" &&
                              !!msg.content &&
                              !msg.insight &&
                              questionnaireItems.length > 0 &&
                              /mini cuestionario|aclar|precis|más contexto|necesito/i.test(msg.content);

                           return (
                                        <div key={msg.id} className={`flex gap-5 w-full ${msg.role === 'user' ? 'flex-row-reverse text-right' : ''}`}>
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-500/80 text-white ring-1 ring-indigo-300/40' : 'surface-base text-zinc-300 ring-1 ring-zinc-700/70'}`}>
                      {msg.role === 'user' ? (
                          <span className="text-[14px] font-bold">U</span>
                      ) : (
                                       <img
                                          src="/logo-ia.png"
                                          alt="QueryPilot AI"
                                          className="h-5 w-5 rounded-sm object-cover"
                                          loading="lazy"
                                       />
                      )}
                    </div>
                  <div className={`max-w-[74%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[12px] font-bold text-zinc-400 uppercase tracking-widest px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {msg.role === 'user' ? 'You' : 'QueryPilot AI'}
                        </div>
                        {msg.role === 'user' ? (
                        <div className="bg-[#a78bfa] text-black rounded-2xl rounded-tr-sm px-5 py-3.5 text-[14px] font-mono leading-relaxed shadow-sm">
                                {msg.content}
                            </div>
                        ) : (
                        <div className="rounded-2xl p-6 text-[13px] leading-relaxed mono-theme text-[#d1cdbd] shadow-sm space-y-5 relative overflow-hidden group border border-[#333333] bg-[#0a0a0a] mono-enter">
                                {msg.status === 'Running' && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 overflow-hidden">
                                        <div className="h-full bg-zinc-900 rounded-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
                                    </div>
                                )}

                                {msg.content && !msg.insight && !isClarificationQuestionnaire && (
                                   <div className="text-[14px] text-[#f4f0e6] font-mono leading-relaxed whitespace-pre-wrap break-words mono-type">
                                      {msg.content}
                                   </div>
                                )}

                                {msg.suggestedChart && msg.results && msg.results.length > 0 && (
                                   <div className="mt-4 p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/40">
                                      <div className="flex items-center gap-2 mb-3">
                                         <AppIcon name="bar_chart" className="h-[16px] w-[16px] text-indigo-400" />
                                         <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">Suggested Visualization</span>
                                      </div>
                                      <ChartSuggestion 
                                         chart={msg.suggestedChart}
                                         data={msg.results}
                                      />
                                   </div>
                                )}

                                {isClarificationQuestionnaire && (
                                   <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-4">
                                      <div className="flex items-start gap-3">
                                         <div className="mt-0.5 h-7 w-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                                            <AppIcon name="help" className="h-[16px] w-[16px]" />
                                         </div>
                                         <div className="space-y-1">
                                            <h4 className="text-[14px] font-semibold text-sky-200">Necesito un poco más de contexto</h4>
                                            <p className="text-[13px] text-zinc-300">Respóndeme este mini cuestionario y continúo con el análisis.</p>
                                         </div>
                                      </div>

                                      <div className="space-y-2.5">
                                         {questionnaireItems.map((item, qIdx) => (
                                            <button 
                                                key={`${msg.id}-question-${qIdx}`} 
                                                onClick={() => { setInput(`Opción ${qIdx + 1}: ${item}`); setTimeout(() => handleSubmit(), 100); }}
                                                className="w-full text-left flex items-start gap-3 rounded-xl border border-sky-500/30 bg-zinc-900/70 px-3 py-2.5 hover:bg-sky-500/10 hover:border-sky-500/50 transition-colors active:scale-[0.99] cursor-pointer shadow-sm"
                                            >
                                               <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-[12px] font-semibold px-1.5 shrink-0">
                                                  {qIdx + 1}
                                               </span>
                                               <span className="text-[13px] text-zinc-100 leading-relaxed font-medium">{item}</span>
                                            </button>
                                         ))}
                                      </div>

                                      <div className="flex flex-wrap gap-2 pt-1 border-t border-sky-500/20 mt-3">
                                         {['Sí', 'No', 'Filtrar exactamente', 'Traer todas las coincidencias', 'Omitir'].map(quickReply => (
                                            <button
                                               key={quickReply}
                                               onClick={() => { setInput(quickReply); setTimeout(() => handleSubmit(), 100); }}
                                               className="px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[12px] font-medium hover:bg-sky-500/20 transition-colors mt-2 active:scale-95 shadow-sm"
                                            >
                                               {quickReply}
                                            </button>
                                         ))}
                                      </div>
                                   </div>
                                )}
                                
                                {msg.status === 'PendingApproval' && (
                                   <div className="mb-6 p-5 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                                       <div className="flex items-start gap-3">
                                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                             <AppIcon name="security" className="h-[18px] w-[18px] text-amber-600" />
                                          </div>
                                          <div>
                                             <h4 className="text-[14px] font-bold text-amber-900">Action Required: Privacy/Security Review</h4>
                                             <p className="text-[13px] text-amber-800/80 mt-1 font-medium">{msg.content}</p>
                                          </div>
                                       </div>
                                       
                                       <div className="bg-zinc-950 rounded-lg p-4 border border-amber-200/70 font-mono text-[12px] text-zinc-200 overflow-auto whitespace-pre-wrap max-h-[200px] shadow-inner font-medium">
                                          {msg.sql}
                                       </div>

                                       <div className="pt-2 space-y-3">
                                          <textarea 
                                             placeholder="Add comments for the audit log (optional)"
                                             value={approvalComments[msg.id] || ''}
                                             onChange={(e) => setApprovalComments(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                             className="w-full bg-zinc-950 border border-amber-300/70 rounded-xl px-4 py-3 text-[13px] text-zinc-100 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30 transition-colors resize-none placeholder:text-amber-200"
                                             rows={2}
                                          />
                                          <div className="flex gap-3">
                                             <button 
                                                onClick={() => handleApproval(msg, 'Approved', approvalComments[msg.id])}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium text-[13px] transition-colors shadow-sm flex justify-center items-center gap-2">
                                                <AppIcon name="check_circle" className="h-[16px] w-[16px]" /> Approve & Execute
                                             </button>
                                             <button 
                                                onClick={() => handleApproval(msg, 'Rejected', approvalComments[msg.id])}
                                                className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-amber-300/70 text-amber-300 px-4 py-2.5 rounded-xl font-medium text-[13px] transition-colors text-center">
                                                Reject Query
                                             </button>
                                          </div>
                                       </div>
                                   </div>
                                )}

                                {msg.insight && (
                                   <div className="space-y-4">
                                   <div className="text-[15px] font-medium">{msg.insight}</div>
                                      
                                      {msg.results && msg.results.length > 0 && msg.results[0] && (
                                            <div className="overflow-x-auto border border-zinc-700 rounded-xl bg-zinc-950 shadow-sm mt-4">
                                            <table className="min-w-full text-left text-[13px] border-collapse">
                                               <thead className="bg-zinc-900 border-b border-zinc-700 text-zinc-400 uppercase tracking-widest text-[11px] font-bold">
                                                  <tr>
                                                     {Object.keys(msg.results[0]).map(key => (
                                                        <th key={key} className="px-5 py-3 whitespace-nowrap">{key}</th>
                                                     ))}
                                                  </tr>
                                               </thead>
                                               <tbody className="divide-y divide-zinc-800 font-mono">
                                                  {msg.results.slice(0, 10).map((row, idx) => (
                                                     <tr key={idx} className="hover:bg-zinc-900 transition-colors">
                                                        {Object.values(row).map((val: any, j) => (
                                                           <td key={j} className="px-5 py-3 text-zinc-200 truncate max-w-[200px]">
                                                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                           </td>
                                                        ))}
                                                     </tr>
                                                  ))}
                                               </tbody>
                                            </table>
                                            {msg.results.length > 10 && (
                                               <div className="px-5 py-3 bg-zinc-900 text-center text-[12px] font-medium text-zinc-400 border-t border-zinc-700">
                                                  Showing 10 of {msg.results.length} rows
                                               </div>
                                            )}
                                         </div>
                                      )}
                                      
                                      {msg.sql && (
                                         <details className="group/code mt-4">
                                            <summary className="cursor-pointer flex items-center gap-2 text-[12px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors select-none">
                                               <AppIcon name="chevron_right" className="h-[16px] w-[16px] transition-transform group-open/code:rotate-90" />
                                               View Generated SQL
                                            </summary>
                                             <div className="mt-3 p-4 bg-[#111111] text-[#f4f0e6] rounded-xl font-mono text-[13px] overflow-auto whitespace-pre-wrap shadow-inner leading-relaxed">
                                               {msg.sql}
                                            </div>
                                         </details>
                                      )}
                                   </div>
                                )}
                                
                                {msg.progressEvents && msg.progressEvents.length > 0 && msg.status !== 'PendingApproval' && (
                                   <div className={`mt-6 pt-5 border-t border-zinc-800 ${msg.status === 'Completed' || msg.status === 'Failed' ? 'opacity-60' : ''}`}>
                                      <button
                                         type="button"
                                         className="w-full text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center justify-between gap-3 hover:text-zinc-200 transition-colors"
                                         onClick={() => setExpandedProgress(prev => {
                                            const isCompleted = msg.status === 'Completed' || msg.status === 'Failed';
                                            const isOpen = prev[msg.id] ?? !isCompleted;
                                            return { ...prev, [msg.id]: !isOpen };
                                         })}
                                         aria-expanded={expandedProgress[msg.id] ?? !(msg.status === 'Completed' || msg.status === 'Failed')}
                                      >
                                         <span className="flex items-center gap-2">
                                            <AppIcon
                                               name="chevron_right"
                                               className={`h-[14px] w-[14px] transition-transform ${(expandedProgress[msg.id] ?? !(msg.status === 'Completed' || msg.status === 'Failed')) ? 'rotate-90' : ''}`}
                                            />
                                            Agent Progress
                                         </span>
                                         <span>{msg.progressEvents[msg.progressEvents.length - 1].time}</span>
                                      </button>

                                      {(expandedProgress[msg.id] ?? !(msg.status === 'Completed' || msg.status === 'Failed')) && (
                                         <div className="space-y-3 mt-3">
                                            {msg.progressEvents.map((evt, j) => (
                                               <div key={j} className="flex gap-3 text-[13px] items-start animate-in fade-in slide-in-from-left-2 duration-300">
                                                  <div className="flex flex-col items-center mt-0.5">
                                                     <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                     </div>
                                                     {j < msg.progressEvents!.length - 1 && <div className="w-[1px] h-6 bg-emerald-100 my-1"></div>}
                                                  </div>
                                                  <div className="flex flex-col">
                                                     <span className="font-semibold text-zinc-100">{evt.label}</span>
                                                     <span className="text-zinc-400 text-[12px]">{evt.status}</span>
                                                  </div>
                                               </div>
                                            ))}
                                         </div>
                                      )}
                                   </div>
                                )}
                            </div>
                        )}
                    </div>
                           </div>
                        );
                        })
            )}
            <div ref={messagesEndRef} className="h-4 w-full" />
          </div>
        </div>

            <div className={`p-6 bg-[#000000] border-t border-[#333333] sticky bottom-0 z-30 transition-all duration-300 ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
               <div className="max-w-4xl mx-auto relative group rounded-2xl border border-[#333333] bg-[#0a0a0a] p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isTyping}
                placeholder="Message QueryPilot..."
                className="field-input w-full rounded-xl pl-5 pr-14 py-4 text-[15px] font-medium transition-all resize-none shadow-sm disabled:bg-zinc-950 disabled:text-zinc-500 disabled:cursor-not-allowed min-h-[56px] max-h-[200px]"
                rows={1}
                style={{ height: 'auto' }}
              />
              <button 
                 onClick={handleSubmit} 
                 disabled={!input.trim() || isTyping}
                 className="absolute right-2 top-2 p-2.5 rounded-xl bg-[#a78bfa] text-black disabled:bg-[#111111] disabled:text-[#8a8a8a] transition-all active:scale-95 disabled:active:scale-100 shadow-sm flex items-center justify-center">
                {isTyping ? (
                   <div className="w-[18px] h-[18px] border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                ) : (
                   <AppIcon name="arrow_upward" className="h-[18px] w-[18px]" />
                )}
              </button>
              <div className="absolute -bottom-5 left-0 w-full text-center text-[11px] text-zinc-500 font-medium">
                  QueryPilot can make mistakes. Consider verifying important information.
              </div>
          </div>
        </div>
         </div>
    </div>
  );
}
