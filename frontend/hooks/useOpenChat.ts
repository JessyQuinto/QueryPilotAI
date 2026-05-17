import { useCallback } from "react";
import { ChatSession, Connection, DashboardTab } from "../components/types";
import { toast } from "sonner";

type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";

interface UseOpenChatOptions {
  createChatSession: (connectionId: string, title?: string) => Promise<ChatSession>;
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setCurrentView: (view: string) => void;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  addLog: (level: LogLevel, msg: string) => void;
}

/**
 * Hook that encapsulates the "create a new chat session and open a tab" pattern.
 * This logic was duplicated in ConnectionManager and Sidebar.
 */
export function useOpenChat({
  createChatSession,
  setOpenTabs,
  setCurrentView,
  setExpandedConns,
  addLog,
}: UseOpenChatOptions) {
  const openNewChat = useCallback(
    async (connection: Connection, title = "New Chat") => {
      try {
        const session = await createChatSession(connection.id, title);
        setOpenTabs((prev) => {
          if (prev.find((t) => t.id === session.id)) return prev;
          return [
            ...prev,
            {
              type: "chat" as const,
              id: session.id,
              title: session.title,
              connectionId: connection.id,
            },
          ];
        });
        setCurrentView(session.id);
        setExpandedConns((prev) => ({ ...prev, [connection.id]: true }));
        addLog("SUCCESS", `Connected to ${connection.name}.`);
        return session;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create chat.";
        toast.error(message);
        addLog("ERROR", message);
        return null;
      }
    },
    [createChatSession, setOpenTabs, setCurrentView, setExpandedConns, addLog]
  );

  return { openNewChat };
}
