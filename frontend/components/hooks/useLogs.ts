import { useState, useEffect, useCallback } from "react";
import { LogEntry } from "../types";

export function useLogs() {
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setTerminalLogs([
      { id: "1", timestamp: new Date().toISOString(), level: "INFO", message: "System initializing..." },
      { id: "2", timestamp: new Date().toISOString(), level: "SUCCESS", message: "Dashboard UI ready." }
    ]);
  }, []);

  const addLog = useCallback((level: LogEntry["level"], msg: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      { id: Math.random().toString(), timestamp: new Date().toISOString(), level, message: msg },
    ]);
  }, []);

  return { terminalLogs, addLog };
}
