import { useState, useEffect } from "react";
import { Connection } from "../types";
import { toast } from "sonner";
import { useMsal } from "@azure/msal-react";

const sanitizeConnectionsForStorage = (items: Connection[]) =>
  items.map(({ password: _password, ...connection }) => connection);

const getConnectionsStorageKey = (userId?: string) =>
  userId ? `qp_connections:${userId}` : "qp_connections";

export function useConnections(
  userId: string | undefined, 
  fetchWithAuth: (url: string, options?: any) => Promise<Response>,
  addLog: (level: any, msg: string) => void,
  setCurrentView: (view: string) => void
) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [connForm, setConnForm] = useState<Partial<Connection>>({ 
    name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", 
    database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" 
  });
  const [connError, setConnError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { instance } = useMsal();

  // Load from localStorage (immediate, offline-first) using a per-user cache when available.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConns =
        localStorage.getItem(getConnectionsStorageKey(userId)) ??
        (userId ? localStorage.getItem('qp_connections') : null);

      if (savedConns) try { setConnections(sanitizeConnectionsForStorage(JSON.parse(savedConns))); } catch {}
    }
  }, [userId]);

  // Fetch connections from backend when user is authenticated
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadFromBackend = async () => {
      try {
        const res = await fetchWithAuth('/api/connections', {
          allowInteractiveAuth: true,
        });
        if (!res.ok) return;
        const backendConns: any[] = await res.json();
        if (cancelled || !backendConns.length) return;

        // Map backend records to frontend Connection shape
        const mapped: Connection[] = backendConns.map((c: any) => ({
          id: c.id,
          name: c.connectionName,
          type: c.dbType,
          host: c.host,
          port: c.port || '',
          database: c.databaseName,
          username: c.username || '',
          password: '', // never store passwords client-side from backend
          authType: c.authType || 'SQL',
        }));

        setConnections(prev => {
          // Merge: backend wins for existing IDs, keep any local-only ones
          const backendIds = new Set(mapped.map(c => c.id));
          const localOnly = prev.filter(c => !backendIds.has(c.id));
          return [...mapped, ...localOnly];
        });

        addLog("INFO", `Loaded ${mapped.length} saved connection(s) from server.`);
      } catch (err) {
        // Silent fail — localStorage already has cached data
        console.warn('Failed to load connections from backend:', err);
      }
    };

    loadFromBackend();
    return () => { cancelled = true; };
  }, [addLog, fetchWithAuth, userId]);

  // Save to localStorage
  useEffect(() => { 
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(getConnectionsStorageKey(userId), JSON.stringify(sanitizeConnectionsForStorage(connections))); 
  }, [connections, userId]);

  const handleMsalLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup({
        scopes: ["https://database.windows.net//user_impersonation"]
      });
      if (loginResponse && loginResponse.accessToken) {
        setConnForm(prev => ({ 
          ...prev, 
          username: loginResponse.account?.username || 'Azure AD User',
          password: loginResponse.accessToken,
          authType: 'AzureADToken'
        }));
        addLog("INFO", "Microsoft Entra ID token acquired via MSAL.");
      }
    } catch (err: any) {
      console.error(err);
      setConnError("Microsoft login failed: " + err.message);
    }
  };

  const handleSaveConnection = async () => {
    if (!connForm.name?.trim()) {
        setConnError("Connection name is required.");
        return;
    }
    
    if (editingConnId && connections.some(c => c.id !== editingConnId && c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
        setConnError("A connection with this name already exists.");
        return;
    }
    
    if (!editingConnId && connections.some(c => c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
        setConnError("A connection with this name already exists.");
        return;
    }

    setConnError("");
    setIsTestingConnection(true);
    setTestSuccess(false);

    try {
        // ── Step 1: Test the connection against the REAL external database ──
        let testRes: Response;
        try {
            testRes = await fetchWithAuth("/api/connections/test", {
                allowInteractiveAuth: true,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingConnId || connForm.id,
                    dbType: connForm.type || "Azure SQL",
                    host: connForm.host,
                    port: connForm.port,
                    databaseName: connForm.database,
                    username: connForm.username,
                    encryptedPassword: connForm.password,
                    authType: connForm.authType
                })
            });
        } catch (fetchErr: any) {
            throw new Error("Network error: Could not reach the backend. Is the server running?");
        }

        // ── Step 2: Parse the response and BLOCK if not successful ──
        let testBody: any = {};
        try {
            const rawText = await testRes.text();
            testBody = rawText ? JSON.parse(rawText) : {};
        } catch { /* body might not be JSON */ }

        if (!testRes.ok || testBody.success === false) {
            const errorMsg = testBody.error || `Connection test failed (HTTP ${testRes.status}).`;
            throw new Error(errorMsg);
        }

        // ── Step 3: Show success indicator briefly ──
        setTestSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setTestSuccess(false);

        // ── Step 4: ONLY NOW persist the connection ──
        const connId = editingConnId || crypto.randomUUID();
        const connToSave = { ...connForm, id: connId, name: connForm.name!.trim() } as Connection;

        // Persist to backend before committing locally, so the UI only shows
        // connections that will survive a new session/login.
        const saveRes = await fetchWithAuth('/api/connections', {
            allowInteractiveAuth: true,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: connId,
                userId: userId,
                connectionName: connToSave.name,
                dbType: connToSave.type || "Azure SQL",
                host: connToSave.host,
                port: connToSave.port,
                databaseName: connToSave.database,
                username: connToSave.username,
                encryptedPassword: connToSave.password,
                authType: connToSave.authType
            })
        });

        if (!saveRes.ok) {
            let backendMessage = `Could not save the connection for your account (HTTP ${saveRes.status}).`;
            try {
                const bodyText = await saveRes.text();
                if (bodyText) {
                    try {
                        const errorBody = JSON.parse(bodyText);
                        backendMessage = errorBody.error || backendMessage;
                    } catch {
                        backendMessage = bodyText;
                    }
                }
            } catch {
                // Keep generic message if we cannot read the backend response.
            }

            addLog("ERROR", `Connection test passed, but persistence failed: ${backendMessage}`);
            throw new Error(backendMessage);
        }

        if (editingConnId) {
            setConnections(prev => prev.map(c => c.id === editingConnId ? { ...c, ...connToSave } : c));
        } else {
            setConnections(prev => [...prev, connToSave]);
        }

        setConnError("");
        setCurrentView('manage_connections');
        toast.success(`Connection "${connToSave.name}" saved successfully.`);
    } catch (e: any) {
        setConnError(e.message);
        toast.error(e.message);
    } finally {
        setIsTestingConnection(false);
        setTestSuccess(false);
    }
  };

  return {
    connections,
    setConnections,
    editingConnId,
    setEditingConnId,
    connForm,
    setConnForm,
    connError,
    setConnError,
    isTestingConnection,
    testSuccess,
    handleMsalLogin,
    handleSaveConnection
  };
}
