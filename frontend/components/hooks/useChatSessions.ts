import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { ChatSession, Message, Connection, ServerSessionRecord, ServerConversationTurnRecord } from "../types";

const getChatSessionsStorageKey = (userId?: string) =>
  userId ? `qp_chatSessions:${userId}` : "qp_chatSessions";

export function useChatSessions(
  userId: string | undefined,
  fetchWithAuth: (url: string, options?: any) => Promise<Response>,
  connections: Connection[],
  addLog: (level: any, msg: string) => void,
  currentView: string
) {
  const normalizeSuggestedChart = (raw: any) => {
    if (!raw) return undefined;

    const validTypes = ["line","bar","horizontal_bar","stacked_bar","pie","donut","area","scatter","heatmap","combo","table","none"] as const;
    const rawTypeStr = String(raw.type ?? raw.Type ?? raw.chart_type ?? raw.chartType ?? "").toLowerCase().trim();
    const aliasMap: Record<string, string> = { stackedbar: "stacked_bar", horizontalbar: "horizontal_bar", doughnut: "donut", torta: "pie", circular: "pie" };
    const resolved = aliasMap[rawTypeStr] ?? rawTypeStr;
    const type = validTypes.includes(resolved as any) ? resolved as typeof validTypes[number] : null;

    if (!type || type === "none") {
      return undefined;
    }

    return {
      type,
      title: raw.title ?? raw.Title ?? "Visualización sugerida",
      description: raw.description ?? raw.Description ?? raw.subtitle ?? raw.Subtitle,
      x_axis_label: raw.x_axis_label ?? raw.xAxisLabel ?? raw.XAxisLabel ?? raw.formatting?.x_label ?? raw.formatting?.xLabel,
      y_axis_label: raw.y_axis_label ?? raw.yAxisLabel ?? raw.YAxisLabel ?? raw.formatting?.y_label ?? raw.formatting?.yLabel,
      x_field: raw.x_field ?? raw.xField ?? raw.XField ?? raw.x_axis ?? raw.xAxis ?? raw.XAxis,
      y_field: raw.y_field ?? raw.yField ?? raw.YField ?? raw.y_axis ?? raw.yAxis ?? raw.YAxis,
      group_by: raw.group_by ?? raw.groupBy ?? raw.GroupBy ?? raw.category_field ?? raw.categoryField ?? raw.CategoryField,
      filtered_rows_count: raw.filtered_rows_count ?? raw.filteredRowsCount ?? raw.FilteredRowsCount ?? raw.filtered_rows ?? raw.filteredRows ?? raw.top_n ?? raw.topN ?? raw.TopN,
    };
  };

  const traceChat = (message: string) => {
    addLog("DEBUG", `[TRACE_CHAT] ${message}`);
  };

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activePoll, setActivePoll] = useState<string | null>(null);
  const [activePollSessionId, setActivePollSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pollErrorCountRef = useRef(0);
  const hydratedSessionTurnsRef = useRef<Set<string>>(new Set());
  const loadedSessionsForUserRef = useRef<string | null>(null);

  // Load from localStorage using a per-user cache when available.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChats =
        localStorage.getItem(getChatSessionsStorageKey(userId)) ??
        (userId ? localStorage.getItem('qp_chatSessions') : null);

      if (savedChats) try { setChatSessions(JSON.parse(savedChats)); } catch {}
    }
  }, [userId]);

  useEffect(() => { 
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(getChatSessionsStorageKey(userId), JSON.stringify(chatSessions)); 
  }, [chatSessions, userId]);

  useEffect(() => {
    if (!userId) return;

    hydratedSessionTurnsRef.current.clear();
    if (loadedSessionsForUserRef.current === userId) {
      return;
    }

    let cancelled = false;

    const loadSessionsFromBackend = async () => {
      try {
        const res = await fetchWithAuth('/api/sessions/me', {
          allowInteractiveAuth: true,
        });

        if (!res.ok) return;

        const serverSessions: ServerSessionRecord[] = await res.json();
        if (cancelled || !Array.isArray(serverSessions)) return;

        setChatSessions(prev => {
          const localById = new Map(prev.map(session => [session.id, session]));
          const hydrated = serverSessions.map((session) => {
            return {
              id: session.id,
              connectionId: session.connectionId || localById.get(session.id)?.connectionId || "",
              title: session.title || localById.get(session.id)?.title || "New Chat",
              // Preserve in-memory messages to avoid wiping the active chat while polling.
              messages: localById.get(session.id)?.messages || [],
            } satisfies ChatSession;
          });

          return hydrated;
        });

        loadedSessionsForUserRef.current = userId;

        addLog("INFO", `Loaded ${serverSessions.length} chat session(s) from server.`);
      } catch {
        // Keep working from the local cache when backend hydration is unavailable.
      }
    };

    loadSessionsFromBackend();
    return () => { cancelled = true; };
  }, [addLog, fetchWithAuth, userId]);

  useEffect(() => {
    if (!userId) return;

    const activeSession = chatSessions.find(session => session.id === currentView);
    if (!activeSession || activeSession.messages.length > 0) {
      return;
    }

    if (hydratedSessionTurnsRef.current.has(activeSession.id)) {
      return;
    }

    let cancelled = false;
    const targetSessionId = activeSession.id;

    const hydrateSessionTurns = async () => {
      try {
        const res = await fetchWithAuth(`/api/sessions/${targetSessionId}/turns`, {
          allowInteractiveAuth: true,
        });

        if (!res.ok) return;

        const turns: ServerConversationTurnRecord[] = await res.json();
        if (cancelled || !Array.isArray(turns)) return;

        const hydratedMessages: Message[] = [];
        turns.forEach((turn) => {
          const role = turn.role?.toLowerCase() === "user" ? "user" : "ai";

          if (role === "user") {
            hydratedMessages.push({
              id: `${turn.id}-user`,
              role: "user",
              content: turn.question,
            } satisfies Message);
            return;
          }

          const aiContent = turn.agentResponse || turn.summary || "Respuesta generada.";
          hydratedMessages.push({
            id: `${turn.id}-ai`,
            role: "ai",
            content: aiContent,
            insight: turn.summary || undefined,
            sql: turn.sqlGenerated || undefined,
            status: "Completed",
          } satisfies Message);
        });

        setChatSessions((prev) => prev.map((session) => {
          if (session.id !== targetSessionId) {
            return session;
          }

          // Never wipe messages that may have arrived while hydration was in-flight.
          if (session.messages.length > 0) {
            return session;
          }

          return { ...session, messages: hydratedMessages };
        }));

        hydratedSessionTurnsRef.current.add(targetSessionId);
      } catch {
        // Leave the session as-is if turn hydration is unavailable.
      }
    };

    hydrateSessionTurns();
    return () => { cancelled = true; };
  }, [chatSessions, currentView, fetchWithAuth, userId]);

  const activeChatSession = chatSessions.find(c => c.id === currentView) || null;

  const updateMessagesForSession = (
    sessionId: string | null,
    updater: Message[] | ((prev: Message[]) => Message[])
  ) => {
    setChatSessions(prevSessions => {
      const requestedId = sessionId;
      const targetId = requestedId && prevSessions.some(s => s.id === requestedId)
        ? requestedId
        : (currentView && prevSessions.some(s => s.id === currentView) ? currentView : null);

      if (!targetId) {
        if (!requestedId) {
          traceChat("updateMessagesForSession omitido: no hay sessionId ni fallback currentView.");
          return prevSessions;
        }

        const newMsgs = typeof updater === 'function' ? updater([]) : updater;
        traceChat(`Sesion ${requestedId} no encontrada. Creando sesion de contingencia con ${newMsgs.length} mensajes.`);

        return [
          ...prevSessions,
          {
            id: requestedId,
            connectionId: activeChatSession?.connectionId || "",
            title: activeChatSession?.title || "New Chat",
            messages: newMsgs,
          },
        ];
      }

      return prevSessions.map(session => {
        if (session.id !== targetId) {
          return session;
        }

        const newMsgs = typeof updater === 'function' ? updater(session.messages) : updater;
        traceChat(`Sesion ${targetId}: ${newMsgs.length} mensajes tras update.`);
        return { ...session, messages: newMsgs };
      });
    });
  };

  const getOrchestrationErrorMessage = (data: any): string => {
    const outputSummary = data?.output?.ExecutiveSummary ?? data?.output?.executiveSummary;
    if (typeof outputSummary === "string" && outputSummary.trim()) {
      return outputSummary.trim();
    }

    const outputRaw = typeof data?.outputRaw === "string" ? data.outputRaw : "";
    if (outputRaw) {
      const agentMatch = outputRaw.match(/Agent\s+[^\n]+not found/i);
      if (agentMatch?.[0]) {
        return `Error de Foundry: ${agentMatch[0]}. Revisa FoundryAgent__*Ref (nombre:version) o IDs vigentes.`;
      }
      return outputRaw.slice(0, 400);
    }

    return "Ocurrió un error al procesar tu solicitud.";
  };

  useEffect(() => {
    if (!activePoll) return;
    const pollSessionId = activePollSessionId;
    traceChat(`Inicio polling instanceId=${activePoll}, pollSessionId=${pollSessionId}, currentView=${currentView}`);

    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth("/api/orchestrations/" + activePoll);
        if (!res.ok) {
          throw new Error(`No se pudo consultar el estado de la orquestación (HTTP ${res.status}).`);
        }
        pollErrorCountRef.current = 0;
        
        const data = await res.json();
        const runtimeStatus = String(data?.runtimeStatus || "");
        // Intentar parsear outputRaw como fallback si output tiene campos vacíos (caso de mismatch camelCase/PascalCase residual)
        // Intentar parsear outputRaw como fallback si output es null o tiene campos vacíos (mismatch camelCase/PascalCase)
        let output = data?.output;
        if ((!output || (!output?.Status && !output?.status)) && data?.outputRaw) {
          try { output = JSON.parse(data.outputRaw); } catch { /* usa el output original */ }
        }
        const outputStatus = String(output?.Status ?? output?.status ?? "");
        const outputSummary = output?.ExecutiveSummary ?? output?.executiveSummary;
        const outputSql = output?.Sql ?? output?.sql;
        const outputResultPreview = output?.ResultPreview ?? output?.resultPreview;
        const outputSuggestedChart = normalizeSuggestedChart(
          output?.SuggestedChart ?? output?.suggestedChart ?? output
        );
        const customStatus = data?.customStatus;
        const customStatusLabel = customStatus?.Label ?? customStatus?.label;
        const customStatusState = customStatus?.Status ?? customStatus?.status;
        traceChat(`Tick polling instanceId=${activePoll}: runtimeStatus=${runtimeStatus}, outputStatus=${outputStatus || "n/a"}, customStatus=${customStatusState || "n/a"}`);
        
        if (customStatus && customStatusLabel) {
            addLog("DEBUG", "[Orchestrator] " + customStatusLabel + " - " + customStatusState);
            
          updateMessagesForSession(pollSessionId, (prev) => {
                const newMsgs = [...prev];
                const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                if (aiIdx !== -1) {
                    const msg = newMsgs[aiIdx];
                    if (!msg.progressEvents) msg.progressEvents = [];
                    
                    const timeNow = new Date().toLocaleTimeString();
                    const lastEvent = msg.progressEvents[msg.progressEvents.length - 1];
                    if (!lastEvent || lastEvent.label !== customStatusLabel || lastEvent.status !== customStatusState) {
                        msg.progressEvents.push({ 
                            label: customStatusLabel, 
                            status: customStatusState, 
                            time: timeNow 
                        });
                    }
                }
                return newMsgs;
            });
        }

        if (runtimeStatus === "Completed" || runtimeStatus === "Failed" || runtimeStatus === "Terminated") {
          setIsTyping(false);
          setActivePoll(null);
          setActivePollSessionId(null);
          traceChat(`Fin polling instanceId=${activePoll} con runtimeStatus=${runtimeStatus}.`);
          
           if (runtimeStatus === "Completed" && !output) {
             // output nulo: backend no pudo deserializar ni con outputRaw
             addLog("WARN", "Orchestration completed but output is null.");
             updateMessagesForSession(pollSessionId, (prev) => {
              const newMsgs = [...prev];
              const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
              const msg = "La ejecución finalizó pero no se recibió respuesta del agente. Reintenta la consulta.";
              if (aiIdx !== -1) { newMsgs[aiIdx].status = "Failed"; newMsgs[aiIdx].content = msg; }
              else { newMsgs.push({ id: Math.random().toString(), role: "ai", instanceId: activePoll || undefined, status: "Failed", content: msg }); }
              return newMsgs;
             });
           } else if (runtimeStatus === "Completed" && output) {
             const normalizedStatus = outputStatus.toLowerCase();

             if (normalizedStatus === "conversational" || normalizedStatus === "needs_clarification" || normalizedStatus === "unsupported" || normalizedStatus === "blocked" || normalizedStatus === "error") {
               addLog("SUCCESS", "Early response: " + (outputStatus || "conversational"));
                 updateMessagesForSession(pollSessionId, (prev) => {
                   const newMsgs = [...prev];
                   const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                   if (aiIdx !== -1) {
                       newMsgs[aiIdx].status = "Completed";
                       newMsgs[aiIdx].content = typeof outputSummary === "string" && outputSummary.trim()
                         ? outputSummary
                         : "No se recibió contenido de respuesta para esta ejecución.";
                   } else {
                       newMsgs.push({
                         id: Math.random().toString(),
                         role: "ai",
                         instanceId: activePoll || undefined,
                         status: "Completed",
                         content: typeof outputSummary === "string" && outputSummary.trim()
                           ? outputSummary
                           : "No se recibió contenido de respuesta para esta ejecución."
                       });
                   }
                   return newMsgs;
               });
             } else {
               addLog("SUCCESS", "Query completed successfully.");
               updateMessagesForSession(pollSessionId, (prev) => {
                   const newMsgs = [...prev];
                   const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                   if (aiIdx !== -1) {
                       newMsgs[aiIdx].status = "Completed";
                       newMsgs[aiIdx].content = "";  // limpiar "Analizando solicitud..."
                       newMsgs[aiIdx].insight = typeof outputSummary === "string" && outputSummary.trim()
                         ? outputSummary
                         : "La ejecución finalizó, pero no se recibió resumen de resultados.";
                       newMsgs[aiIdx].sql = outputSql;
                       if (Array.isArray(outputResultPreview) && outputResultPreview.length > 0) {
                           newMsgs[aiIdx].results = outputResultPreview;
                       }
                       if (outputSuggestedChart) {
                           newMsgs[aiIdx].suggestedChart = outputSuggestedChart;
                       }
                   } else {
                       const fallbackMsg: Message = {
                         id: Math.random().toString(),
                         role: "ai",
                         instanceId: activePoll || undefined,
                         status: "Completed",
                         content: "",
                         insight: typeof outputSummary === "string" && outputSummary.trim()
                           ? outputSummary
                           : "La ejecución finalizó, pero no se recibió resumen de resultados.",
                         sql: outputSql,
                       };

                       if (Array.isArray(outputResultPreview) && outputResultPreview.length > 0) {
                         fallbackMsg.results = outputResultPreview;
                       }
                       if (outputSuggestedChart) {
                         fallbackMsg.suggestedChart = outputSuggestedChart;
                       }

                       newMsgs.push(fallbackMsg);
                   }
                   return newMsgs;
               });
             }
          } else if (runtimeStatus === "Failed") {
             const errorMessage = getOrchestrationErrorMessage(data);
             addLog("ERROR", "Execution failed: " + errorMessage);
             updateMessagesForSession(pollSessionId, (prev) => {
                 const newMsgs = [...prev];
                 const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                 if (aiIdx !== -1) {
                     newMsgs[aiIdx].status = "Failed";
                 newMsgs[aiIdx].content = errorMessage;
               } else {
                 newMsgs.push({
                   id: Math.random().toString(),
                   role: "ai",
                   instanceId: activePoll || undefined,
                   status: "Failed",
                   content: errorMessage,
                 });
                 }
                 return newMsgs;
             });
          }
        } 
        else if (customStatusState === "PendingApproval") {
             setIsTyping(false);
             setActivePoll(null);
               setActivePollSessionId(null);
             addLog("WARN", "Query paused for manual approval (Risk: High)");
               updateMessagesForSession(pollSessionId, (prev) => {
                 const newMsgs = [...prev];
                 const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                 if (aiIdx !== -1) {
                     newMsgs[aiIdx].status = "PendingApproval";
               newMsgs[aiIdx].sql = customStatus?.Sql ?? customStatus?.sql;
                     newMsgs[aiIdx].content = "Tu consulta requiere aprobación de un supervisor debido a políticas de sensibilidad.";
                 }
                 return newMsgs;
             });
        }
      } catch (err: any) {
        pollErrorCountRef.current += 1;
        addLog("ERROR", err?.message || "Error consultando estado de orquestación.");

        if (pollErrorCountRef.current >= 3) {
          setIsTyping(false);
          setActivePoll(null);
          setActivePollSessionId(null);
          updateMessagesForSession(pollSessionId, (prev) => {
            const newMsgs = [...prev];
            const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
            if (aiIdx !== -1) {
              newMsgs[aiIdx].status = "Failed";
              newMsgs[aiIdx].content = "No se pudo obtener el estado de ejecución después de varios intentos. Revisa backend/logs y vuelve a intentar.";
            }
            return newMsgs;
          });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activePoll, activePollSessionId, fetchWithAuth, addLog, currentView]);

  const handleSubmit = async () => {
    if (!input.trim() || !activeChatSession) return;
    const targetSessionId = activeChatSession.id;
    const normalizedInput = input.trim();
    traceChat(`Submit en sesion ${targetSessionId}, currentView=${currentView}, chars=${normalizedInput.length}`);

    const userMsg: Message = { id: Math.random().toString(), role: "user", content: normalizedInput };
    flushSync(() => {
      updateMessagesForSession(targetSessionId, (prev) => [...prev, userMsg]);
    });
    setInput("");
    setIsTyping(true);
    addLog("INFO", "Received user query: " + userMsg.content);

    const activeConnection = connections.find(c => c.id === activeChatSession.connectionId);
    
    try {
      const response = await fetchWithAuth("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          userId: userId,
          role: "FraudAnalyst",
          correlationId: crypto.randomUUID(),
          sessionId: activeChatSession.id,
          connectionId: activeConnection?.id,
          connection: activeConnection && !activeConnection.id ? {
            type: activeConnection.type || "PostgreSQL",
            host: activeConnection.host,
            port: activeConnection.port,
            database: activeConnection.database,
            username: activeConnection.username,
            password: activeConnection.password
          } : undefined
        }),
      });

      if (!response.ok) {
          let backendMessage = `Solicitud rechazada por el backend (HTTP ${response.status}).`;
          try {
            const raw = await response.text();
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                backendMessage = parsed.error || parsed.message || raw;
              } catch {
                backendMessage = raw;
              }
            }
          } catch {
          }

          setIsTyping(false);
          addLog("ERROR", "API rejection: " + backendMessage);
            updateMessagesForSession(targetSessionId, (prev) => [...prev, { id: Math.random().toString(), role: "ai", status: "Failed", content: backendMessage }]);
          return;
      }

      const body = await response.json();
      addLog("DEBUG", "Orchestration started: " + body.instanceId);
      traceChat(`Orquestacion creada instanceId=${body.instanceId}, targetSessionId=${targetSessionId}`);
      
      const aiMsg: Message = { id: Math.random().toString(), role: "ai", instanceId: body.instanceId, status: "Running", content: "Analizando solicitud..." };
      updateMessagesForSession(targetSessionId, (prev) => [...prev, aiMsg]);
      setActivePollSessionId(targetSessionId);
      setActivePoll(body.instanceId);
    } catch (e: any) {
      setIsTyping(false);
      addLog("ERROR", e.message);
    }
  };

  const handleApproval = async (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => {
    if (!msg.instanceId) return;
    try {
      addLog("INFO", `Sending ${decision} for ${msg.instanceId}`);
      const res = await fetchWithAuth(`/api/orchestrations/${msg.instanceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comments: comments || "" }),
      });
      if (!res.ok) throw new Error("Approval failed");
      updateMessagesForSession(currentView, (prev) => {
        const newMsgs = [...prev];
        const aiIdx = newMsgs.findIndex(m => m.id === msg.id);
        if (aiIdx !== -1) {
          if (decision === 'Approved') {
            newMsgs[aiIdx].status = "Running";
            newMsgs[aiIdx].content = "Consulta aprobada. Ejecutando...";
            setActivePollSessionId(currentView);
            setActivePoll(msg.instanceId!);
            setIsTyping(true);
          } else {
            newMsgs[aiIdx].status = "Rejected";
            newMsgs[aiIdx].content = `Consulta rechazada${comments ? ': ' + comments : ''}.`;
          }
        }
        return newMsgs;
      });
      addLog("SUCCESS", `Decision '${decision}' sent.`);
    } catch (e: any) {
      addLog("ERROR", "Approval error: " + e.message);
    }
  };

  const createChatSession = async (connectionId: string, title = "New Chat") => {
    if (!userId) {
      throw new Error("No hay un usuario autenticado para crear la sesion.");
    }

    const requestedId = crypto.randomUUID();
    const res = await fetchWithAuth('/api/sessions', {
      allowInteractiveAuth: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestedId,
        userId,
        connectionId,
        title,
      }),
    });

    if (!res.ok) {
      let message = `No fue posible crear la sesion (HTTP ${res.status}).`;

      try {
        const raw = await res.text();
        if (raw) {
          try {
            const body = JSON.parse(raw);
            message = body.error || message;
          } catch {
            message = raw;
          }
        }
      } catch {
        // Keep the fallback message.
      }

      throw new Error(message);
    }

    const body = await res.json().catch(() => ({}));
    const persistedId = body.id || requestedId;
    const nextSession: ChatSession = {
      id: persistedId,
      connectionId,
      title,
      messages: [],
    };

    setChatSessions(prev => {
      const withoutRequested = prev.filter(session => session.id !== requestedId && session.id !== persistedId);
      return [...withoutRequested, nextSession];
    });

    loadedSessionsForUserRef.current = userId;

    return nextSession;
  };

  const deleteChatSession = async (sessionId: string) => {
    const res = await fetchWithAuth(`/api/sessions/${sessionId}`, {
      allowInteractiveAuth: true,
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error("No fue posible eliminar la sesion.");
    }

    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const renameChatSession = async (sessionId: string, title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error("El nombre del chat no puede estar vacío.");
    }

    const res = await fetchWithAuth(`/api/sessions/${sessionId}`, {
      allowInteractiveAuth: true,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: normalizedTitle }),
    });

    if (!res.ok) {
      throw new Error("No fue posible renombrar la sesión.");
    }

    setChatSessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, title: normalizedTitle } : session
    ));

    return normalizedTitle;
  };

  return {
    chatSessions,
    setChatSessions,
    activeChatSession,
    activePoll,
    setActivePoll,
    input,
    setInput,
    isTyping,
    handleSubmit,
    handleApproval,
    createChatSession,
    deleteChatSession,
    renameChatSession,
  };
}
