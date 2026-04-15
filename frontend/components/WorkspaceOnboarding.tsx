import { useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";

type LegalDocumentKey = 'privacy' | 'terms';

const legalDocuments: Record<LegalDocumentKey, { title: string; paragraphs: string[] }> = {
    privacy: {
        title: 'Política de Privacidad',
        paragraphs: [
            '1) Datos tratados: autenticacion, identificadores de sesion, eventos de uso y telemetria minima para mantener seguridad y trazabilidad.',
            '2) Finalidad: control de acceso, proteccion de consultas analiticas, soporte tecnico y respuesta ante incidentes operativos.',
            '3) Conservacion: los registros se mantienen por politicas de gobierno de datos y pueden anonimizarse o eliminarse al finalizar su ciclo de vida.',
            '4) Comparticion: la informacion se procesa unicamente en servicios autorizados para operar la plataforma; no se comercializa con terceros.',
            '5) Derechos: puedes solicitar revision o correccion a traves de los procesos internos de privacidad y cumplimiento de tu organizacion.'
        ]
    },
    terms: {
        title: 'Términos del Servicio',
        paragraphs: [
            '1) Acceso autorizado: solo usuarios habilitados por la organizacion pueden utilizar el sistema en contextos aprobados.',
            '2) Uso permitido: toda interaccion queda sujeta a monitoreo, auditoria y politicas de seguridad vigentes.',
            '3) Restricciones: queda prohibido evadir controles, procesar datos no autorizados o intentar acciones fuera de la gobernanza definida.',
            '4) Responsabilidad: el usuario debe validar resultados antes de decisiones sensibles y respetar normas de privacidad y cumplimiento.',
            '5) Medidas de proteccion: el servicio puede bloquear o limitar operaciones ante riesgo, abuso o incumplimientos detectados.'
        ]
    }
};

interface WorkspaceOnboardingProps {
    handleOnboardingComplete: (data: { name: string; industry: string; firstConnectionType?: string | null }) => void;
    isAddingWorkspace: boolean;
}

export function WorkspaceOnboarding({ handleOnboardingComplete, isAddingWorkspace }: WorkspaceOnboardingProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [profile, setProfile] = useState({ name: '', role: '' });
  const [workspace, setWorkspace] = useState({ name: '', industry: 'Technology', teamSize: '1-10' });
  const [useCases, setUseCases] = useState<string[]>([]);
  
  // Terms & Privacy State
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [sqlValidation, setSqlValidation] = useState(true);
  const [dataMasking, setDataMasking] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);
  const [activeDocument, setActiveDocument] = useState<LegalDocumentKey | null>(null);
    const [firstConnectionType, setFirstConnectionType] = useState<string | null>(null);
    const legalModalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!activeDocument) {
            document.body.style.overflow = '';
            return;
        }

        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            legalModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            legalModalRef.current?.focus();
        });

        return () => {
            document.body.style.overflow = '';
        };
    }, [activeDocument]);

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
    const handleFinish = () => handleOnboardingComplete({ ...workspace, firstConnectionType });

  const toggleUseCase = (useCase: string) => {
      setUseCases(prev => prev.includes(useCase) ? prev.filter(c => c !== useCase) : [...prev, useCase]);
  };

  return (
    <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-6 relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#1a1a1a]">
            <div 
               className="h-full bg-[#a78bfa] transition-all duration-500 ease-out"
               style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
        </div>

        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           
           {/* STEP 1: WORKSPACE & PROFILE (MERGED) */}
           {step === 1 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-[#111111] border border-[#333333] rounded-none flex items-center justify-center mb-6">
                              <AppIcon name="waving_hand" className="h-[28px] w-[28px] text-[#f4f0e6]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">Welcome to InsightForge AI</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Set up your workspace and profile in seconds.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Workspace / Company Name</label>
                       <input 
                         type="text" 
                         value={workspace.name}
                         onChange={e => { setWorkspace(prev => ({ ...prev, name: e.target.value })); setProfile(prev => ({ ...prev, name: e.target.value })); }}
                         placeholder="e.g. Acme Corp"
                         className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors" 
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Industry</label>
                          <select 
                            value={workspace.industry}
                            onChange={e => setWorkspace(prev => ({ ...prev, industry: e.target.value }))}
                            className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors appearance-none">
                              <option value="Technology">Technology</option>
                              <option value="Finance">Finance & Banking</option>
                              <option value="Healthcare">Healthcare</option>
                              <option value="Retail">Retail & E-commerce</option>
                              <option value="Manufacturing">Manufacturing</option>
                              <option value="Other">Other</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Your Role</label>
                          <select 
                            value={profile.role}
                            onChange={e => setProfile(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors appearance-none"
                          >
                              <option value="" disabled>Select...</option>
                              <option value="Data Analyst">Data Analyst / Scientist</option>
                              <option value="Software Engineer">Software Engineer</option>
                              <option value="Product Manager">Product Manager</option>
                              <option value="C-Level">Executive / Founder</option>
                              <option value="Other">Other</option>
                          </select>
                       </div>
                    </div>
                    <button 
                       onClick={handleNext}
                       disabled={!workspace.name.trim() || !profile.role}
                       className="w-full bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                       Continue
                    </button>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 1 of 4</div>
                 </div>
             </div>
           )}

           {/* STEP 2: USE CASES */}
           {step === 2 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">What's your primary goal?</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Select all that apply. We'll tailor your experience.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6">
                    <div className="space-y-3">
                       {[
                           "Generate SQL queries from natural language",
                           "Understand complex or legacy databases",
                           "Create quick analytics dashboards",
                           "Ad-hoc data search & exploration"
                       ].map(useCase => (
                           <button 
                             key={useCase}
                             onClick={() => toggleUseCase(useCase)}
                             className={`w-full text-left p-4 rounded-none border transition-all flex items-center gap-4 ${useCases.includes(useCase) ? 'border-zinc-900 bg-[#111111] text-[#f4f0e6]' : 'border-[#333333] bg-[#0a0a0a] text-[#b5b5b5] hover:border-zinc-300'}`}
                           >
                               <div className={`w-5 h-5 rounded-none flex items-center justify-center shrink-0 border ${useCases.includes(useCase) ? 'border-zinc-900 bg-[#a78bfa] text-black' : 'border-zinc-300 bg-[#0a0a0a]'}`}>
                                   {useCases.includes(useCase) && <AppIcon name="check" className="h-[14px] w-[14px]" />}
                               </div>
                               <span className="text-[14px] font-medium">{useCase}</span>
                           </button>
                       ))}
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors">Back</button>
                       <button onClick={handleNext} disabled={useCases.length === 0} className="w-2/3 bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 2 of 4</div>
                 </div>
             </div>
           )}

           {/* STEP 3: TERMS & PRIVACY */}
           {step === 3 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">Privacy & Terms</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Please review our policies before continuing.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-8">
                    
                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="pt-1">
                            <div className={`w-5 h-5 rounded-none flex items-center justify-center border transition-colors ${acceptedTerms ? 'border-zinc-900 bg-[#a78bfa] text-black' : 'border-zinc-300 bg-[#0a0a0a] group-hover:border-zinc-400'}`}>
                                {acceptedTerms && <AppIcon name="check" className="h-[14px] w-[14px]" />}
                            </div>
                        </div>
                        <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                        <div>
                            <div className="text-[14px] text-[#f4f0e6] font-medium">I agree to the Terms of Service</div>
                            <div className="text-[13px] text-[#a3a3a3] leading-relaxed mt-1">
                                I have read and agree to the <button type="button" onClick={(e) => { e.preventDefault(); setActiveDocument('terms'); }} className="underline hover:text-[#f4f0e6]">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setActiveDocument('privacy'); }} className="underline hover:text-[#f4f0e6]">Privacy Policy</button> governing the use of InsightForge AI.
                            </div>
                        </div>
                    </label>

                    <hr className="border-[#222222]" />

                    {/* Toggles */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-[13px] font-bold text-[#f4f0e6] uppercase tracking-widest mb-4">Security & Compliance Settings</h3>
                        
                        {/* SQL Validation */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <AppIcon name="verified_user" className="h-5 w-5 text-[#d1cdbd]" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">SQL Validation</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Automatically check generated SQL for syntax errors and security vulnerabilities.</div>
                            </div>
                            <button 
                                onClick={() => setSqlValidation(!sqlValidation)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${sqlValidation ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${sqlValidation ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Data Masking */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <AppIcon name="masks" className="h-5 w-5 text-[#d1cdbd]" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">Data Masking</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Dynamically obfuscate sensitive data fields in query results based on user roles.</div>
                            </div>
                            <button 
                                onClick={() => setDataMasking(!dataMasking)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${dataMasking ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${dataMasking ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Audit Logging */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <AppIcon name="receipt_long" className="h-5 w-5 text-[#d1cdbd]" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">Audit Logging</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Maintain a comprehensive record of all queries, access attempts, and configuration changes.</div>
                            </div>
                            <button 
                                onClick={() => setAuditLogging(!auditLogging)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${auditLogging ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${auditLogging ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <hr className="border-[#222222] my-4" />

                        <div className="flex items-center justify-between gap-4 pt-2">
                            <div>
                                <div className="text-[14px] text-[#f4f0e6] font-medium">Telemetry & Telemetry Data</div>
                                <div className="text-[13px] text-[#a3a3a3]">Allow us to monitor crash reports and feature usage to improve the app.</div>
                            </div>
                            <button 
                                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                                className={`w-11 h-6 rounded-none border transition-colors relative shrink-0 ${analyticsEnabled ? 'bg-blue-600 border-blue-400' : 'bg-slate-200 border-slate-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-none absolute top-1 transition-transform ${analyticsEnabled ? 'left-6 bg-white' : 'left-1 bg-[#0a0a0a]'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[14px] text-[#f4f0e6] font-medium">Marketing Communications</div>
                                <div className="text-[13px] text-[#a3a3a3]">Receive news, feature updates, and best practices occasionally.</div>
                            </div>
                            <button 
                                onClick={() => setMarketingEnabled(!marketingEnabled)}
                                className={`w-11 h-6 rounded-none border transition-colors relative shrink-0 ${marketingEnabled ? 'bg-blue-600 border-blue-400' : 'bg-slate-200 border-slate-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-none absolute top-1 transition-transform ${marketingEnabled ? 'left-6 bg-white' : 'left-1 bg-[#0a0a0a]'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors">Back</button>
                       <button onClick={handleNext} disabled={!acceptedTerms} className="w-2/3 bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 3 of 4</div>
                 </div>
             </div>
           )}

           {/* STEP 4: CONNECT DB (OPTIONAL) */}
           {step === 4 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-none mx-auto flex items-center justify-center mb-6">
                              <AppIcon name="database" className="h-[28px] w-[28px] text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6] text-center">Connect your database</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3] text-center">You're all set! Add a data source now or skip for later.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6 text-center">
                    
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                {[
                                     { name: 'Azure SQL', icon: '/assets/iconos sql/DeviconAzuresqldatabase.svg' },
                                     { name: 'PostgreSQL', icon: '/assets/iconos sql/DeviconPostgresqlWordmark.svg' },
                                     { name: 'MySQL', icon: '/assets/iconos sql/LogosMysql.svg' },
                                     { name: 'MariaDB', icon: '/assets/iconos sql/LogosMariadb.svg' },
                                     { name: 'SQLite', icon: '/assets/iconos sql/LogosSqlite.svg' }
                                ].map((db) => (
                                     <button
                                        key={db.name}
                                        type="button"
                                        onClick={() => setFirstConnectionType(prev => prev === db.name ? null : db.name)}
                                        className={`border rounded-none p-4 flex flex-col items-center justify-center gap-2 transition-colors ${firstConnectionType === db.name ? 'border-[#a78bfa] bg-[#141022]' : 'border-[#333333] bg-[#111111] hover:border-zinc-500'}`}
                                     >
                                         <img src={db.icon} className="w-8 h-8 opacity-90" alt={db.name} />
                                         <span className={`text-[12px] font-bold ${firstConnectionType === db.name ? 'text-[#f4f0e6]' : 'text-[#b5b5b5]'}`}>{db.name}</span>
                                     </button>
                                ))}
                    </div>

                          <div className="space-y-3">
                             <button 
                                 onClick={handleFinish}
                                 disabled={isAddingWorkspace || !firstConnectionType}
                                 className="w-full bg-[#a78bfa] text-black font-bold rounded-none py-4 text-[14px] hover:bg-[#8b5cf6] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                 {isAddingWorkspace ? 'Creating Workspace...' : `Create Workspace and Connect ${firstConnectionType || ''}`}
                             </button>

                             <button 
                                 onClick={() => {
                                    setFirstConnectionType(null);
                                                     handleOnboardingComplete({ ...workspace, firstConnectionType: null });
                                 }}
                                 disabled={isAddingWorkspace}
                                 className="w-full bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                 {isAddingWorkspace ? 'Creating Workspace...' : 'Skip and go to Dashboard'}
                             </button>
                          </div>
                    
                    <p className="text-[13px] text-[#a3a3a3] font-medium pt-2">
                        You can add connections anytime from the sidebar.
                    </p>
                 </div>
             </div>
           )}

        </div>

        {activeDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                    ref={legalModalRef}
                    tabIndex={-1}
                    className="w-full max-w-3xl border border-[#333333] bg-[#0a0a0a] p-0 shadow-[0_20px_80px_rgba(0,0,0,0.65)] outline-none animate-in zoom-in-95 duration-200"
                >
                    <div className="flex items-center justify-between border-b border-[#222222] bg-[#111111] px-6 py-4 font-mono">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a8a8a]">Legal Document</p>
                            <h2 className="mt-1 text-lg font-bold text-[#f4f0e6]">{legalDocuments[activeDocument].title}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveDocument(null)}
                            className="border border-[#333333] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#b5b5b5] transition-colors hover:bg-[#1a1a1a] hover:text-[#f4f0e6]"
                        >
                            Close
                        </button>
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto px-6 py-5 font-mono text-[13px] leading-7 text-[#b5b5b5]">
                        <div className="mb-5 border border-[#222222] bg-[#111111] px-4 py-3 text-[12px] text-[#8a8a8a]">
                            Este documento aplica para el uso empresarial de InsightForge AI y sus controles de seguridad analitica.
                        </div>
                        <div className="space-y-4">
                            {legalDocuments[activeDocument].paragraphs.map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
