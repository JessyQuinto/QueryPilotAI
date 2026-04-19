'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthRuntimeConfig, createMsalConfig, loginRequest, resolveAuthRuntimeConfig } from '../lib/authConfig';
import { LandingPage } from '../components/LandingPage';

type AuthProviderProps = {
    children: ReactNode;
    config: Partial<AuthRuntimeConfig>;
};

type LegalDocumentKey = 'privacy' | 'terms';

const legalDocuments: Record<LegalDocumentKey, { title: string; paragraphs: string[] }> = {
    privacy: {
        title: 'Politica de Privacidad',
        paragraphs: [
            '1) Datos que tratamos: credenciales de autenticacion, identificadores de sesion, eventos de uso y trazas operativas necesarias para seguridad, soporte y continuidad del servicio.',
            '2) Finalidad: validar acceso corporativo, proteger consultas analiticas, investigar incidentes y cumplir controles de auditoria interna y requisitos regulatorios aplicables.',
            '3) Base de uso: interes legitimo empresarial, obligacion de cumplimiento y politicas de seguridad de la organizacion que habilita este entorno.',
            '4) Retencion: los registros se conservan por ventanas definidas por gobierno de datos y pueden ser anonimizados o eliminados segun el ciclo de vida aprobado.',
            '5) Comparticion: no se comercializan datos personales; solo se procesan en servicios tecnicos autorizados para operacion, monitoreo y proteccion de la plataforma.',
            '6) Derechos: puedes solicitar revision, correccion o eliminacion segun los canales corporativos de privacidad y las limitaciones legales vigentes.'
        ]
    },
    terms: {
        title: 'Terminos del Servicio',
        paragraphs: [
            '1) Uso autorizado: el acceso es exclusivo para personal habilitado por la organizacion. Toda accion puede ser registrada para auditoria y seguridad operativa.',
            '2) Conducta prohibida: no se permite eludir controles, ejecutar consultas fuera de politicas, subir datos sin autorizacion o intentar acceso no permitido.',
            '3) Responsabilidad del usuario: verificar resultados antes de decisiones criticas y respetar clasificacion de datos, privacidad y normas internas de cumplimiento.',
            '4) Seguridad y continuidad: la plataforma puede aplicar bloqueos, limites de sesion o revocacion de acceso ante riesgo, abuso o incumplimiento.',
            '5) Disponibilidad: pueden existir mantenimientos, degradaciones temporales o cambios funcionales para mejorar seguridad y resiliencia del servicio.',
            '6) Aceptacion: al continuar, confirmas que entiendes estos terminos y aceptas operar bajo los guardrails tecnicos y legales definidos por tu organizacion.'
        ]
    }
};

export function AuthProvider({ children, config }: AuthProviderProps) {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

    // DEV MODE: show landing/login pages but skip real MSAL auth
    if (skipAuth) {
        return <DevAuthProvider>{children}</DevAuthProvider>;
    }

    return <MsalAuthProvider config={config}>{children}</MsalAuthProvider>;
}

function DevAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeDocument, setActiveDocument] = useState<LegalDocumentKey | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('dev_authenticated');
            if (saved === 'true') setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (!activeDocument) {
            document.body.style.overflow = '';
            return;
        }
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            modalRef.current?.focus();
        });
        return () => { document.body.style.overflow = ''; };
    }, [activeDocument]);

    const handleDevLogin = () => {
        sessionStorage.setItem('dev_authenticated', 'true');
        setIsAuthenticated(true);
        router.push('/dashboard');
    };

    const isPublicRoute = pathname?.startsWith('/docs');
    if (isPublicRoute) return <>{children}</>;

    if (!isAuthenticated) {
        if (pathname === '/login') {
            const legalDocument = activeDocument ? legalDocuments[activeDocument] : null;
            return (
                <div className="mosaic-center min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-mono overflow-hidden">
                    <div className="relative w-full max-w-md border border-zinc-800 bg-zinc-900/80 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.6)] mono-scanline mono-enter">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-zinc-700 bg-zinc-950 mono-enter-delay-1">
                            <div className="text-center leading-none">
                                <p className="text-[15px] font-bold tracking-wider text-primary">IF</p>
                                <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">AI</p>
                            </div>
                        </div>
                        <p className="mono-enter-delay-1 mt-5 text-center text-[11px] uppercase tracking-[0.24em] text-zinc-500">InsightForge Access</p>
                        <h1 className="mono-enter-delay-1 mt-2 text-center text-2xl font-bold text-zinc-100">
                            <span className="mono-caret-inline">Iniciar sesion</span>
                        </h1>
                        <p className="mono-enter-delay-2 mt-3 text-center text-sm leading-6 text-zinc-400">
                            Login corporativo para acceder al workspace de analitica segura.
                        </p>
                        <button type="button" onClick={handleDevLogin}
                            className="mono-enter-delay-2 mt-7 flex w-full items-center justify-center gap-3 border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" role="img">
                                <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                                <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
                                <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
                                <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
                            </svg>
                            Continuar con Microsoft Entra ID
                        </button>
                        <button type="button" onClick={() => router.push('/')}
                            className="mono-enter-delay-2 mt-3 w-full border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800">
                            Volver al inicio
                        </button>
                        <p className="mono-enter-delay-2 mt-6 text-center text-[11px] leading-5 text-zinc-500">
                            Al continuar aceptas politicas de seguridad, auditoria y cumplimiento corporativo.
                        </p>
                        <p className="mono-enter-delay-2 mt-2 text-center text-[11px] leading-5 text-zinc-500">
                            Leer{' '}
                            <button type="button" onClick={() => setActiveDocument('privacy')} className="underline underline-offset-2 hover:text-zinc-300 transition-colors">Politica de Privacidad</button>
                            {' '}y{' '}
                            <button type="button" onClick={() => setActiveDocument('terms')} className="underline underline-offset-2 hover:text-zinc-300 transition-colors">Terminos del Servicio</button>
                        </p>
                    </div>
                    {legalDocument ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
                            <div ref={modalRef} tabIndex={-1} className="w-full max-w-3xl border border-zinc-700 bg-[#0a0a0a] p-0 text-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] outline-none">
                                <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-6 py-4 font-mono">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Legal Document</p>
                                        <h2 className="mt-1 text-lg font-bold text-zinc-100">{legalDocument.title}</h2>
                                    </div>
                                    <button type="button" onClick={() => setActiveDocument(null)} className="border border-zinc-700 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">Cerrar</button>
                                </div>
                                <div className="max-h-[72vh] overflow-y-auto px-6 py-5 font-mono text-[13px] leading-7 text-zinc-300">
                                    <div className="mb-5 border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-[12px] text-zinc-400">Al continuar aceptas operar bajo politicas de seguridad, auditoria y cumplimiento corporativo.</div>
                                    <div className="space-y-4">{legalDocument.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        }

        return (
            <div className="relative min-h-screen font-sans selection:bg-blue-900 selection:text-white">
                <LandingPage onShowLegal={setActiveDocument} />
                {activeDocument ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
                        <div ref={modalRef} tabIndex={-1} className="w-full max-w-3xl border border-zinc-700 bg-[#0a0a0a] p-0 text-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] outline-none">
                            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-6 py-4 font-mono">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Legal Document</p>
                                    <h2 className="mt-1 text-lg font-bold text-zinc-100">{legalDocuments[activeDocument].title}</h2>
                                </div>
                                <button type="button" onClick={() => setActiveDocument(null)} className="border border-zinc-700 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">Cerrar</button>
                            </div>
                            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 font-mono text-[13px] leading-7 text-zinc-300">
                                <div className="mb-5 border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-[12px] text-zinc-400">Al continuar aceptas operar bajo politicas de seguridad, auditoria y cumplimiento corporativo.</div>
                                <div className="space-y-4">{legalDocuments[activeDocument].paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    return children;
}

function MsalAuthProvider({ children, config }: AuthProviderProps) {
    const [isMsalInitialized, setIsMsalInitialized] = useState(false);
    const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
    const [configurationError, setConfigurationError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const initializeMsal = async () => {
            try {
                const runtimeConfig = resolveAuthRuntimeConfig(config);
                const instance = new PublicClientApplication(createMsalConfig(runtimeConfig));

                await instance.initialize();
                instance.enableAccountStorageEvents();

                const redirectResponse = await instance.handleRedirectPromise();
                const activeAccount =
                    redirectResponse?.account ??
                    instance.getActiveAccount() ??
                    instance.getAllAccounts()[0] ??
                    null;

                if (activeAccount) {
                    instance.setActiveAccount(activeAccount);
                }

                if (!cancelled) {
                    setMsalInstance(instance);
                    setConfigurationError(null);
                }
            }
            catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : 'No fue posible inicializar la autenticacion.';
                    setConfigurationError(message);
                }
            }
            finally {
                if (!cancelled) {
                    setIsMsalInitialized(true);
                }
            }
        };

        initializeMsal();

        return () => {
            cancelled = true;
        };
    }, [config.authority, config.clientId, config.postLogoutRedirectUri, config.redirectUri]);

    if (!isMsalInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                Verificando autenticación...
            </div>
        );
    }

    if (!msalInstance) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="max-w-xl w-full rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Autenticacion</p>
                    <h1 className="mt-3 text-2xl font-bold text-zinc-900">La configuracion de acceso no es valida</h1>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">{configurationError ?? 'No fue posible cargar la configuracion de Microsoft Entra ID.'}</p>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">Verifica la autoridad publicada en el frontend y vuelve a desplegar el sitio con los valores correctos.</p>
                </div>
            </div>
        );
    }

    return (
        <MsalProvider instance={msalInstance}>
            <RequireAuth>{children}</RequireAuth>
        </MsalProvider>
    );
}

function RequireAuth({ children }: { children: ReactNode }) {
    const { instance } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [activeDocument, setActiveDocument] = useState<LegalDocumentKey | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const isLoginRoute = pathname === '/login';

    useEffect(() => {
        if (!activeDocument) {
            document.body.style.overflow = '';
            return;
        }

        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            modalRef.current?.focus();
        });

        return () => {
            document.body.style.overflow = '';
        };
    }, [activeDocument]);

    useEffect(() => {
        if (isAuthenticated && isLoginRoute) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, isLoginRoute, router]);

    const isPublicRoute = pathname?.startsWith('/docs');
    const legalDocument = activeDocument ? legalDocuments[activeDocument] : null;

    if (isPublicRoute) {
        return <>{children}</>;
    }

    if (!isAuthenticated) {
        if (isLoginRoute) {
            return (
                <div className="mosaic-center min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-mono overflow-hidden">
                    <div className="relative w-full max-w-md border border-zinc-800 bg-zinc-900/80 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.6)] mono-scanline mono-enter">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-zinc-700 bg-zinc-950 mono-enter-delay-1">
                            <div className="text-center leading-none">
                                <p className="text-[15px] font-bold tracking-wider text-primary">IF</p>
                                <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">AI</p>
                            </div>
                        </div>

                        <p className="mono-enter-delay-1 mt-5 text-center text-[11px] uppercase tracking-[0.24em] text-zinc-500">InsightForge Access</p>
                        <h1 className="mono-enter-delay-1 mt-2 text-center text-2xl font-bold text-zinc-100">
                            <span className="mono-caret-inline">Iniciar sesion</span>
                        </h1>
                        <p className="mono-enter-delay-2 mt-3 text-center text-sm leading-6 text-zinc-400">
                            Login corporativo para acceder al workspace de analitica segura.
                        </p>

                        <button
                            type="button"
                            onClick={() => { void instance.loginRedirect(loginRequest); }}
                            className="mono-enter-delay-2 mt-7 flex w-full items-center justify-center gap-3 border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" role="img">
                                <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                                <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
                                <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
                                <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
                            </svg>
                            Continuar con Microsoft Entra ID
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="mono-enter-delay-2 mt-3 w-full border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
                        >
                            Volver al inicio
                        </button>

                        <p className="mono-enter-delay-2 mt-6 text-center text-[11px] leading-5 text-zinc-500">
                            Al continuar aceptas politicas de seguridad, auditoria y cumplimiento corporativo.
                        </p>

                        <p className="mono-enter-delay-2 mt-2 text-center text-[11px] leading-5 text-zinc-500">
                            Leer
                            {' '}
                            <button
                                type="button"
                                onClick={() => setActiveDocument('privacy')}
                                className="underline underline-offset-2 hover:text-zinc-300 transition-colors"
                            >
                                Politica de Privacidad
                            </button>
                            {' '}
                            y
                            {' '}
                            <button
                                type="button"
                                onClick={() => setActiveDocument('terms')}
                                className="underline underline-offset-2 hover:text-zinc-300 transition-colors"
                            >
                                Terminos del Servicio
                            </button>
                        </p>
                    </div>

                    {legalDocument ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
                            <div
                                ref={modalRef}
                                tabIndex={-1}
                                className="w-full max-w-3xl border border-zinc-700 bg-[#0a0a0a] p-0 text-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] outline-none"
                            >
                                <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-6 py-4 font-mono">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Legal Document</p>
                                        <h2 className="mt-1 text-lg font-bold text-zinc-100">{legalDocument.title}</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDocument(null)}
                                        className="border border-zinc-700 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                                    >
                                        Cerrar
                                    </button>
                                </div>

                                <div className="max-h-[72vh] overflow-y-auto px-6 py-5 font-mono text-[13px] leading-7 text-zinc-300">
                                    <div className="mb-5 border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-[12px] text-zinc-400">
                                        Al continuar aceptas operar bajo politicas de seguridad, auditoria y cumplimiento corporativo.
                                    </div>
                                    <div className="space-y-4">
                                        {legalDocument.paragraphs.map((paragraph) => (
                                            <p key={paragraph}>{paragraph}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        }

        return (
            <div className="relative min-h-screen font-sans selection:bg-blue-900 selection:text-white">
                <LandingPage onShowLegal={setActiveDocument} />

                {legalDocument ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm">
                        <div
                            ref={modalRef}
                            tabIndex={-1}
                            className="w-full max-w-3xl border border-zinc-700 bg-[#0a0a0a] p-0 text-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] outline-none"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-800 bg-[#111111] px-6 py-4 font-mono">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Legal Document</p>
                                    <h2 className="mt-1 text-lg font-bold text-zinc-100">{legalDocument.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveDocument(null)}
                                    className="border border-zinc-700 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 font-mono text-[13px] leading-7 text-zinc-300">
                                <div className="mb-5 border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-[12px] text-zinc-400">
                                    Al continuar aceptas operar bajo politicas de seguridad, auditoria y cumplimiento corporativo.
                                </div>
                                <div className="space-y-4">
                                    {legalDocument.paragraphs.map((paragraph) => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
                
            </div>
        );
    }

    if (isAuthenticated && isLoginRoute) {
        return null;
    }

    return children;
}

