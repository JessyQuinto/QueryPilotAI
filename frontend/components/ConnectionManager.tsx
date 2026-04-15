import { Connection, ChatSession, DashboardTab } from "./types";
import { toast } from "sonner";
import { TypewriterTitle } from "./TypewriterTitle";
import { AppIcon } from "./AppIcon";

interface ConnectionManagerProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  editingConnId: string | null;
  setEditingConnId: (id: string | null) => void;
  connForm: Partial<Connection>;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
  connError: string;
  testSuccess: boolean;
  isTestingConnection: boolean;
  handleMsalLogin: () => void;
  handleSaveConnection: () => void;
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  addLog: (level: any, msg: string) => void;
  createChatSession: (connectionId: string, title?: string) => Promise<ChatSession>;
}

export function ConnectionManager({
  currentView, setCurrentView, connections, setConnections,
  editingConnId, setEditingConnId, connForm, setConnForm,
  connError, testSuccess, isTestingConnection, handleMsalLogin, handleSaveConnection,
  fetchWithAuth, setChatSessions, openTabs, setOpenTabs, setExpandedConns, addLog,
  createChatSession
}: ConnectionManagerProps) {
  const enabledIntegrations = new Set(['Azure SQL', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'Oracle']);

  const connectionFields = connForm.type === 'SQLite'
    ? [{ label: 'Database File Path*', key: 'host', type: 'text' }]
    : [
        { label: 'Server Address (URL)*', key: 'host', type: 'text' },
        { label: 'Database Name*', key: 'database', type: 'text' }
      ];

  const docsByType: Record<string, { title: string; url: string; icon: string; guides: Array<{ name: string; url: string; iconPath?: string; symbol?: string }> }> = {
    'Azure SQL': {
      title: 'Connecting Azure SQL',
      url: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-portal',
      icon: '/assets/iConos 28_28/LogosMicrosoftIcon.svg',
      guides: [
        { name: 'Azure SQL', url: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/', iconPath: '/assets/iConos 28_28/MaterialIconThemeAzure.svg' },
        { name: 'DigitalOcean', url: 'https://docs.digitalocean.com/products/databases/', iconPath: '/assets/iConos 28_28/LogosDigitalOceanIcon.svg' },
        { name: 'Heroku', url: 'https://devcenter.heroku.com/categories/heroku-postgres', iconPath: '/assets/iConos 28_28/LogosHerokuIcon.svg' },
        { name: 'Neon', url: 'https://neon.tech/docs/connect/connect-from-any-app', iconPath: '/assets/iConos 28_28/LogosNeonIcon.svg' },
        { name: 'Supabase', url: 'https://supabase.com/docs/guides/database/connecting-to-postgres', iconPath: '/assets/iConos 28_28/DeviconSupabase.svg' }
      ]
    },
    'PostgreSQL': {
      title: 'Connecting PostgreSQL',
      url: 'https://www.postgresql.org/docs/current/tutorial-start.html',
      icon: '/assets/iconos sql/DeviconPostgresqlWordmark.svg',
      guides: [
        { name: 'DigitalOcean', url: 'https://docs.digitalocean.com/products/databases/postgresql/', iconPath: '/assets/iConos 28_28/LogosDigitalOceanIcon.svg' },
        { name: 'Supabase', url: 'https://supabase.com/docs/guides/database/connecting-to-postgres', iconPath: '/assets/iConos 28_28/DeviconSupabase.svg' },
        { name: 'Neon', url: 'https://neon.tech/docs/connect/connect-from-any-app', iconPath: '/assets/iConos 28_28/LogosNeonIcon.svg' },
        { name: 'Render', url: 'https://render.com/docs/databases', symbol: 'cloud' },
        { name: 'AWS RDS', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html', symbol: 'dns' }
      ]
    },
    'MySQL': {
      title: 'Connecting MySQL',
      url: 'https://dev.mysql.com/doc/refman/8.0/en/connecting.html',
      icon: '/assets/iconos sql/LogosMysql.svg',
      guides: [
        { name: 'DigitalOcean', url: 'https://docs.digitalocean.com/products/databases/mysql/', iconPath: '/assets/iConos 28_28/LogosDigitalOceanIcon.svg' },
        { name: 'Railway', url: 'https://docs.railway.app/databases/mysql', symbol: 'train' },
        { name: 'PlanetScale', url: 'https://planetscale.com/docs', symbol: 'public' }
      ]
    },
    'MariaDB': {
      title: 'Connecting MariaDB',
      url: 'https://mariadb.com/kb/en/library/getting-installing-and-upgrading-mariadb/',
      icon: '/assets/iconos sql/LogosMariadb.svg',
      guides: [
        { name: 'MariaDB Docs', url: 'https://mariadb.com/kb/en/documentation/', iconPath: '/assets/iconos sql/LogosMariadb.svg' },
        { name: 'DigitalOcean', url: 'https://docs.digitalocean.com/products/databases/mysql/', iconPath: '/assets/iConos 28_28/LogosDigitalOceanIcon.svg' },
        { name: 'Railway', url: 'https://docs.railway.app/databases/mysql', symbol: 'train' }
      ]
    },
    'SQLite': {
      title: 'Connecting SQLite',
      url: 'https://www.sqlite.org/docs.html',
      icon: '/assets/iconos sql/LogosSqlite.svg',
      guides: [
        { name: 'SQLite Docs', url: 'https://www.sqlite.org/docs.html', iconPath: '/assets/iconos sql/LogosSqlite.svg' },
        { name: 'Turso', url: 'https://docs.turso.tech/', symbol: 'bolt' }
      ]
    },
    'Oracle': {
      title: 'Connecting Oracle',
      url: 'https://docs.oracle.com/en/database/',
      icon: '/assets/iconos sql/DeviconOracle.svg',
      guides: [
        { name: 'Oracle Database Docs', url: 'https://docs.oracle.com/en/database/', iconPath: '/assets/iconos sql/DeviconOracle.svg' },
        { name: 'Oracle Cloud', url: 'https://docs.oracle.com/en-us/iaas/Content/home.htm', symbol: 'cloud' },
        { name: 'Connection Guide', url: 'https://www.oracle.com/database/technologies/appdev/sql.html', symbol: 'link' }
      ]
    }
  };

  const docs = docsByType[connForm.type || 'Azure SQL'] || docsByType['Azure SQL'];

  return (
    <>
      {/* VIEW: INTEGRATIONS */}
      {currentView === 'integrations' && (
        <div className="mosaic-center py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setCurrentView('welcome')}
            className="mb-6 flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <AppIcon name="arrow_back" className="h-[16px] w-[16px]" /> Back to Home
          </button>
          <div className="space-y-2 mb-10 text-center md:text-left">
            <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">
              <TypewriterTitle text="Add New Integration" speedMs={48} startDelayMs={180} />
            </h1>
            <p className="text-[14px] text-zinc-400 font-medium">Connect your databases to start querying securely.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'Azure SQL', icon: '/assets/iconos sql/DeviconAzuresqldatabase.svg' },
              { name: 'PostgreSQL', icon: '/assets/iconos sql/DeviconPostgresqlWordmark.svg' },
              { name: 'MySQL', icon: '/assets/iconos sql/LogosMysql.svg' },
              { name: 'MariaDB', icon: '/assets/iconos sql/LogosMariadb.svg' },
              { name: 'SQLite', icon: '/assets/iconos sql/LogosSqlite.svg' },
              { name: 'Oracle', icon: '/assets/iconos sql/DeviconOracle.svg' },
              { name: 'TursoDB', icon: 'database' },
              { name: 'Cloudflare D1', icon: 'database' },
              { name: 'ClickHouse', icon: 'database' },
              { name: 'MotherDuck', icon: 'database' },
              { name: 'GraphQL APIs', icon: 'database' },
              { name: 'BigQuery', icon: 'database' }
            ].map((item, i) => (
              <button 
                key={item.name}
                onClick={() => {
                    if (item.name === 'Azure SQL') {
                        setEditingConnId(null);
                        setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL", authType: 'SQL' });
                        setCurrentView('connect_azuresql');
                    } else if (item.name === 'PostgreSQL') {
                        setEditingConnId(null);
                        setConnForm({ name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" });
                        setCurrentView('connect_postgres');
                    } else if (item.name === 'MySQL') {
                        setEditingConnId(null);
                        setConnForm({ name: "My MySQL Database", host: "mysql-database.com", port: "3306", database: "my_database", username: "root", password: "", type: "MySQL" });
                        setCurrentView('connect_postgres');
                    } else if (item.name === 'MariaDB') {
                      setEditingConnId(null);
                      setConnForm({ name: "My MariaDB Database", host: "mariadb-database.com", port: "3306", database: "my_database", username: "root", password: "", type: "MariaDB" });
                      setCurrentView('connect_postgres');
                    } else if (item.name === 'SQLite') {
                        setEditingConnId(null);
                        setConnForm({ name: "My SQLite Database", host: "C:/data/app.db", port: "", database: "", username: "", password: "", type: "SQLite" });
                        setCurrentView('connect_postgres');
                    } else if (item.name === 'Oracle') {
                      setEditingConnId(null);
                      setConnForm({ name: "My Oracle Database", host: "oracle-database.com", port: "1521", database: "ORCL", username: "system", password: "", type: "Oracle" });
                      setCurrentView('connect_postgres');
                    }
                }}
                className={`bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98] group hover:shadow-sm ${!enabledIntegrations.has(item.name) && 'opacity-50 cursor-not-allowed hover:border-zinc-800 active:scale-100 hover:shadow-none'}`}
                disabled={!enabledIntegrations.has(item.name)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${enabledIntegrations.has(item.name) ? 'bg-zinc-800 group-hover:bg-zinc-700 group-hover:scale-105' : 'bg-zinc-800'}`}>
                   {item.icon.includes('.svg') ? (
                      <img src={item.icon} className="w-6 h-6 object-contain" alt={item.name} />
                   ) : (
                     <AppIcon name="database" className={`h-[20px] w-[20px] ${enabledIntegrations.has(item.name) ? 'text-zinc-100' : 'text-zinc-400'}`} />
                   )}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-[14px] font-medium ${enabledIntegrations.has(item.name) ? 'text-zinc-100' : 'text-zinc-400'}`}>{item.name}</span>
                  {!enabledIntegrations.has(item.name) && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Coming Soon</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: CONNECT AZURE SQL / POSTGRES */}
      {(currentView === 'connect_azuresql' || currentView === 'connect_postgres') && (
        <div className="mosaic-center flex h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex-1 flex justify-center py-12 px-8 overflow-y-auto">
              <div className="w-full max-w-[480px]">
                 
                  <button onClick={() => setCurrentView('integrations')} className="flex items-center gap-2 text-[13px] text-zinc-400 hover:text-zinc-100 font-medium mb-8 transition-colors">
                    <AppIcon name="arrow_back" className="h-[16px] w-[16px]" /> Back to Integrations
                 </button>

                  <div className="flex items-center gap-4 mb-8">
                    {connForm.type === 'Azure SQL' ? (
                       <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-10 h-10" alt="Azure SQL" />
                    ) : connForm.type === 'MySQL' ? (
                      <img src="/assets/iconos sql/LogosMysql.svg" className="w-10 h-10" alt="MySQL" />
                      ) : connForm.type === 'MariaDB' ? (
                        <img src="/assets/iconos sql/LogosMariadb.svg" className="w-10 h-10" alt="MariaDB" />
                    ) : connForm.type === 'SQLite' ? (
                      <img src="/assets/iconos sql/LogosSqlite.svg" className="w-10 h-10" alt="SQLite" />
                        ) : connForm.type === 'Oracle' ? (
                          <img src="/assets/iconos sql/DeviconOracle.svg" className="w-10 h-10" alt="Oracle" />
                    ) : (
                       <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-10 h-10" alt="PostgreSQL" />
                    )}
                        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 leading-tight">
                            <TypewriterTitle text={`Connect ${connForm.type || 'Database'}`} speedMs={48} startDelayMs={180} />
                        </h2>
                  </div>
                 
                    <div className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                     {connError && (
                        <div className="p-3 bg-red-900/10 text-red-500 rounded-xl text-[13px] font-medium border border-red-100 flex items-center gap-2">
                        <AppIcon name="error" className="h-[16px] w-[16px]" />
                           {connError}
                        </div>
                     )}
                     {testSuccess && (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[14px] font-medium border border-emerald-200 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                           <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <AppIcon name="check" className="h-[20px] w-[20px]" />
                           </div>
                           Connection verified! Redirecting...
                        </div>
                     )}
                     
                     <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-zinc-300 uppercase tracking-widest">Display Name*</label>
                        <input 
                          type="text" 
                          value={connForm.name || ""}
                          onChange={(e) => setConnForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/60 transition-colors font-mono placeholder:text-zinc-500" 
                        />
                     </div>

                     {connectionFields.map((field, i) => (
                       <div key={i} className="space-y-1.5">
                          <label className="text-[12px] font-semibold text-zinc-300 uppercase tracking-widest">{field.label}</label>
                          <input 
                            type={field.type}
                            value={(connForm as any)[field.key] || ""}
                            onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/60 transition-colors font-mono placeholder:text-zinc-500" 
                          />
                       </div>
                    ))}

                    {connForm.type === 'Azure SQL' && (
                       <div className="space-y-3 pt-2">
                            <label className="text-[12px] font-semibold text-zinc-300 uppercase tracking-widest">Authentication Method</label>
                          <div className="grid grid-cols-2 gap-3">
                             <button 
                               onClick={() => setConnForm(prev => ({ ...prev, authType: 'SQL' }))}
                               className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors ${connForm.authType !== 'AzureAD' ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600'}`}>
                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType !== 'AzureAD' ? 'border-zinc-200' : 'border-zinc-500'}`}>
                                 {connForm.authType !== 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-100"></div>}
                               </div>
                               SQL Authentication
                             </button>
                             <button 
                               onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD' }))}
                               className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors text-left leading-tight ${connForm.authType === 'AzureAD' ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-600'}`}>
                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType === 'AzureAD' ? 'border-zinc-200' : 'border-zinc-500'}`}>
                                 {connForm.authType === 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-100"></div>}
                               </div>
                               Microsoft Entra ID
                             </button>
                          </div>
                       </div>
                    )}

                    {connForm.authType === 'AzureADToken' && (
                       <div className="pt-2">
                         <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                               <AppIcon name="lock_open" className="h-[18px] w-[18px]" />
                             </div>
                             <div>
                               <div className="text-[13px] font-bold">Successfully authenticated</div>
                               <div className="text-[12px] opacity-80">{connForm.username}</div>
                             </div>
                           </div>
                           <button onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD', username: '', password: '' }))} className="text-[12px] font-semibold underline hover:text-emerald-900 transition-colors">
                             Sign out
                           </button>
                         </div>
                       </div>
                    )}

                    {connForm.authType === 'AzureAD' && (
                       <div className="pt-2">
                          <button 
                            onClick={handleMsalLogin}
                            className="w-full bg-[#2F2F2F] hover:bg-[#1f1f1f] text-white border border-[#2F2F2F] rounded-xl px-4 py-3.5 text-[14px] font-semibold transition-colors flex items-center justify-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21"><path fill="#f35325" d="M1 1h9v9H1z"/><path fill="#81bc06" d="M11 1h9v9h-9z"/><path fill="#05a6f0" d="M1 11h9v9H1z"/><path fill="#ffba08" d="M11 11h9v9h-9z"/></svg>
                            Sign in with Microsoft
                          </button>
                       </div>
                    )}

                    {(connForm.type !== 'SQLite' && (!connForm.authType || connForm.authType === 'SQL')) && [
                      { label: "Username*", key: "username", type: "text" },
                      { label: "Password*", key: "password", type: "password" }
                    ].map((field, i) => (
                       <div key={i + 10} className="space-y-1.5 pt-2">
                          <label className="text-[12px] font-semibold text-zinc-300 uppercase tracking-widest">{field.label}</label>
                          <input 
                            type={field.type}
                            value={(connForm as any)[field.key] || ""}
                            onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/60 transition-colors font-mono placeholder:text-zinc-500" 
                          />
                       </div>
                    ))}
                    
                    <div className="pt-4 flex gap-4">
                      {editingConnId && (
                        <button 
                          onClick={() => setCurrentView('manage_connections')}
                          className="w-1/3 bg-zinc-950 border border-zinc-700 text-zinc-200 font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-900 transition-colors flex justify-center items-center">
                            Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSaveConnection}
                        disabled={isTestingConnection}
                        className={`bg-zinc-900 text-white font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 disabled:bg-zinc-400 disabled:cursor-not-allowed ${editingConnId ? 'w-2/3' : 'w-full'}`}>
                          {isTestingConnection ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Testing...
                            </>
                          ) : testSuccess ? (
                            <>
                              <AppIcon name="verified" className="h-[18px] w-[18px]" />
                              Success!
                            </>
                          ) : (
                            <>
                              {editingConnId ? 'Save Changes' : 'Test and Save Connection'} <AppIcon name="arrow_forward" className="h-[18px] w-[18px]" />
                            </>
                          )}
                      </button>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Right documentation panel */}
            <div className="w-[320px] bg-zinc-950 border-l border-zinc-800 p-10 hidden xl:flex flex-col">
              <h3 className="text-[15px] font-semibold text-zinc-100 mb-8">Need help?</h3>
              <div className="space-y-10">
                 <div className="space-y-4">
                   <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Documentation</div>
                   <a className="flex items-center gap-3 text-[13px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors" href={docs.url} target="_blank" rel="noopener noreferrer">
                      <img src={docs.icon} className="w-8 h-8 object-contain" alt={connForm.type || 'Database'} />
                      {docs.title}
                    </a>
                 </div>
                 <div className="space-y-4">
                   <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Platform Guides</div>
                   <div className="space-y-2">
                     {docs.guides.map((plat) => (
                       <a key={plat.name} className="flex items-center gap-3 text-[13px] font-medium text-zinc-300 hover:text-zinc-100 transition-colors p-2 rounded-lg hover:bg-zinc-800/60 -ml-2" href={plat.url} target="_blank" rel="noopener noreferrer">
                         <div className="w-7 h-7 flex items-center justify-center shrink-0">
                           {plat.iconPath ? <img src={plat.iconPath} className="w-6 h-6 object-contain" alt={plat.name} /> : <AppIcon name={plat.symbol || 'database'} className="h-[18px] w-[18px] text-zinc-300" />}
                         </div>
                         {plat.name}
                       </a>
                     ))}
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VIEW: MANAGE CONNECTIONS */}
      {currentView === 'manage_connections' && (
        <div className="mosaic-center py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setCurrentView('welcome')}
            className="mb-6 flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <AppIcon name="arrow_back" className="h-[16px] w-[16px]" /> Back to Home
          </button>
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">
                <TypewriterTitle text="Manage Connections" speedMs={48} startDelayMs={180} />
              </h1>
              <p className="text-[14px] text-zinc-400 font-medium">View, edit, or remove configured database connections.</p>
            </div>
            <button 
              onClick={() => { setEditingConnId(null); setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL" }); setCurrentView('connect_azuresql'); }}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <AppIcon name="add" className="h-[16px] w-[16px]" /> Add Connection
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 bg-zinc-950 text-[12px] font-semibold text-zinc-400 uppercase tracking-widest">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Host</div>
              <div className="col-span-2">Database</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {connections.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-[14px]">No connections found. Add one to get started.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {connections.map((conn) => (
                  <div key={conn.id} className="grid grid-cols-12 gap-4 p-4 items-center text-[14px] hover:bg-zinc-800/50 transition-colors text-zinc-300">
                    <div className="col-span-3 font-medium text-zinc-100 truncate">
                      <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                               {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-6 h-6 object-contain" alt="Azure" />}
                               {(conn.type === 'PostgreSQL' || (!conn.type && !conn.authType)) && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-6 h-6 object-contain" alt="Postgres" />}
                               {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-6 h-6 object-contain" alt="MySQL" />}
                               {conn.type === 'MariaDB' && <img src="/assets/iconos sql/LogosMariadb.svg" className="w-6 h-6 object-contain" alt="MariaDB" />}
                               {conn.type === 'SQLite' && <img src="/assets/iconos sql/LogosSqlite.svg" className="w-6 h-6 object-contain" alt="SQLite" />}
                               {conn.type === 'Oracle' && <img src="/assets/iconos sql/DeviconOracle.svg" className="w-6 h-6 object-contain" alt="Oracle" />}
                               {conn.type && !['Azure SQL', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'Oracle'].includes(conn.type) && (
                                 <AppIcon name="database" className="h-[22px] w-[22px] text-zinc-100" />
                               )}
                            </div>   {conn.name}
                      </div>
                    </div>
                    <div className="col-span-2">{conn.type || 'PostgreSQL'}</div>
                    <div className="col-span-3 truncate font-mono text-[12px]">{conn.host || 'db.mypostgres.com'}</div>
                    <div className="col-span-2 truncate">{conn.database || 'analytics_db'}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button 
                        onClick={() => {
                           void (async () => {
                             try {
                               const session = await createChatSession(conn.id, 'New Chat');
                               setOpenTabs(prev => { 
                                   if (!prev.find(t => t.id === session.id)) {
                                       return [...prev, { type: 'chat', id: session.id, title: session.title, connectionId: conn.id }];
                                   }
                                   return prev;
                               });
                               setCurrentView(session.id);
                               setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                               addLog("SUCCESS", `Connected to ${conn.name}.`);
                             } catch (error) {
                               const message = error instanceof Error ? error.message : 'Failed to create chat.';
                               toast.error(message);
                               addLog("ERROR", message);
                             }
                           })();
                        }}
                        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                        title="Connect & Chat"
                      >
                        <AppIcon name="link" className="h-[16px] w-[16px]" />
                      </button>
                      <button 
                        onClick={() => { 
                           setEditingConnId(conn.id); 
                           setConnForm({ ...conn, type: conn.type || (conn.authType ? 'Azure SQL' : 'PostgreSQL') }); 
                           setCurrentView(conn.authType || conn.type === 'Azure SQL' ? 'connect_azuresql' : 'connect_postgres'); 
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors"
                        title="Edit"
                      >
                        <AppIcon name="edit" className="h-[16px] w-[16px]" />
                      </button>
                      <button 
                        onClick={() => {
                           if (confirm(`Are you sure you want to delete ${conn.name}?`)) {
                              toast.promise(
                                fetchWithAuth(`/api/connections/${conn.id}`, { method: 'DELETE' }).then(res => {
                                  if (!res.ok) throw new Error("Failed to delete connection.");
                                  return res;
                                }),
                                {
                                  loading: `Deleting ${conn.name}...`,
                                  success: () => {
                                    setConnections(prev => prev.filter(c => c.id !== conn.id));
                                    setChatSessions(prev => prev.filter(c => c.connectionId !== conn.id));
                                    setOpenTabs(prev => prev.filter(t => t.connectionId !== conn.id));
                                    if (currentView === conn.id) setCurrentView('manage_connections');
                                    addLog("SUCCESS", `Connection ${conn.name} deleted.`);
                                    return `Connection ${conn.name} deleted successfully.`;
                                  },
                                  error: `Failed to delete ${conn.name}.`
                                }
                              );
                           }
                        }}
                        className="w-8 h-8 rounded-lg border border-red-100 bg-red-900/10 text-red-500 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-colors"
                        title="Delete"
                      >
                        <AppIcon name="delete" className="h-[16px] w-[16px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
