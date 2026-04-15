import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TypewriterTitle } from './TypewriterTitle';
import { AppIcon } from './AppIcon';

interface LandingPageProps {
    onShowLegal: (doc: 'privacy' | 'terms') => void;
}

export function LandingPage({ onShowLegal }: LandingPageProps) {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const titleSpeedMs = 34;

    const handleLogin = () => {
        router.push('/login');
    };

    return (
        <div className="text-on-background bg-background min-h-screen font-sans selection:bg-primary selection:text-on-primary">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full flex justify-between items-center px-6 md:px-8 py-4 max-w-7xl mx-auto left-1/2 -translate-x-1/2 bg-background/80  z-50 border-b border-surface-variant">
                <Link href="/" className="text-xl font-bold tracking-tight text-on-background">InsightForge AI</Link>
                
                <div className="hidden md:flex items-center space-x-10 text-[11px] font-mono tracking-widest uppercase font-bold text-on-surface-variant">
                    <Link className="hover:text-primary transition-colors duration-300" href="/docs">Docs</Link>
                    <div className="flex items-center space-x-6 border-l border-surface-variant pl-6">
                        <button onClick={handleLogin} className="hover:text-primary transition-colors duration-300">Login</button>
                        <button onClick={handleLogin} className="bg-primary text-black px-6 py-2 font-bold hover:bg-primary-fixed transition-transform active:scale-95 rounded-none border border-primary">Try for free</button>
                    </div>
                </div>

                <button className="md:hidden text-on-background p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    <AppIcon name={mobileMenuOpen ? 'close' : 'menu'} className="h-6 w-6" />
                </button>

                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-background border-b border-surface-variant flex flex-col p-6 space-y-6 md:hidden animate-in slide-in-from-top-2 text-[11px] font-mono tracking-widest uppercase font-bold text-on-surface-variant">
                        <Link className="hover:text-primary transition-colors py-2 border-b border-surface-variant border-dashed" onClick={() => setMobileMenuOpen(false)} href="/docs">Docs</Link>
                        <button onClick={handleLogin} className="text-left py-2 hover:text-primary transition-colors">Login</button>
                        <button onClick={handleLogin} className="bg-primary text-black px-6 py-3 font-bold hover:bg-primary-fixed transition-transform w-full rounded-none">Try for free</button>
                    </div>
                )}
            </nav>

            <main className="relative pt-32">
                {/* Video Background Section */}
                <div className="absolute top-0 inset-x-0 h-[85vh] min-h-[600px] overflow-hidden">
                    <video 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                        className="w-full h-full object-cover"
                    >
                        <source src="https://res.cloudinary.com/dmlk7u0mq/video/upload/v1774368663/LANDING_PAGE_ybuzdy.mp4" type="video/mp4" />
                    </video>
                    {/* Minimalist transition to black at the bottom only */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black"></div>
                </div>



                {/* Hero Section */}
                <section className="max-w-5xl mx-auto px-6 text-center pb-24 md:pb-32 pt-8 md:pt-16 relative z-10">
                    <div className="inline-flex items-center space-x-2 bg-surface border border-outline-variant px-4 py-2 rounded-none mb-8 shadow-sm">
                        <AppIcon name="verified_user" className="h-[18px] w-[18px] text-primary" />
                        <span className="text-sm font-medium text-on-surface-variant">Enterprise-grade Security First</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-on-background leading-tight font-mono">
                        <TypewriterTitle
                            text="Conversational analytics"
                            speedMs={titleSpeedMs}
                            startDelayMs={140}
                            showCaret={false}
                            className="mono-theme"
                        />
                        <br />
                        <TypewriterTitle
                            text="for private databases."
                            speedMs={titleSpeedMs}
                            startDelayMs={1000}
                            className="mono-theme text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary"
                        />
                    </h1>
                    
                    <p className="text-lg md:text-xl text-on-surface-variant mb-12 max-w-3xl mx-auto leading-relaxed">
                        Query your structured data using natural language without compromising security. InsightForge AI integrates directly with your Azure SQL or Postgres environment to deliver agentic insights instantly.
                    </p>
                    <div className="max-w-2xl mx-auto mb-12 relative flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={handleLogin} className="w-full sm:w-auto bg-primary text-on-primary px-8 py-4 rounded-none font-bold text-lg hover:bg-primary-fixed transition-transform active:scale-95 shadow-md flex items-center justify-center group">
                            Start Free Trial
                            <AppIcon name="arrow_forward" className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                        </button>
                        <button onClick={handleLogin} className="w-full sm:w-auto bg-surface-container-high text-on-background px-8 py-4 rounded-none font-bold text-lg hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                            <AppIcon name="play_circle" className="h-5 w-5" />
                            View Demo
                        </button>
                    </div>
                </section>

                {/* Problem/Solution Section */}
                <section className="py-32 bg-surface-container-low border-y border-surface-variant overflow-hidden">
                    <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-24 items-center">
                        <div>
                            <span className="text-sm uppercase tracking-widest text-primary font-bold mb-4 block">The Friction</span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-on-background font-mono">
                                <TypewriterTitle
                                    text="Legacy data stacks are"
                                    speedMs={30}
                                    startDelayMs={180}
                                    showCaret={false}
                                    className="mono-theme"
                                />{' '}
                                <span className="opacity-40">
                                    <TypewriterTitle
                                        text="silent killers"
                                        speedMs={30}
                                        startDelayMs={920}
                                        showCaret={false}
                                        className="mono-theme"
                                    />
                                </span>{' '}
                                <TypewriterTitle
                                    text="of speed."
                                    speedMs={30}
                                    startDelayMs={1450}
                                    className="mono-theme"
                                />
                            </h2>
                            <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
                                Traditional tools wait for humans to map schemas. Questions rot in queues. Decisions are made on gut feeling while your warehouse sits idle.
                            </p>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-none"></div>
                            <div className="relative bg-surface p-10 rounded-[2rem] border border-surface-variant">
                                <span className="text-sm uppercase tracking-widest text-tertiary font-bold mb-4 block">The Evolution</span>
                                <h3 className="text-3xl font-bold mb-6 text-on-background font-display">Semantic Understanding</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    InsightForge doesn't just read tables; it learns your business logic. It understands that "Churn" is a behavior, not just a column, enabling true natural language reasoning.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Key Features Section */}
                <section className="py-32 bg-background">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="grid md:grid-cols-3 gap-12">
                            {/* Feature 1 */}
                            <div className="group">
                                <div className="w-24 h-24 rounded-3xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary group-hover:shadow-[0_0_35px_rgba(0,225,171,0.18)] transition-all duration-300">
                                    <AppIcon name="terminal" className="h-12 w-12 md:h-14 md:w-14 text-primary transition-transform duration-300 group-hover:scale-110" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Natural Language to SQL</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    No more syntax errors. Convert complex natural language queries into optimized, safe SQL statements in milliseconds.
                                </p>
                            </div>
                            {/* Feature 2 */}
                            <div className="group">
                                <div className="w-24 h-24 rounded-3xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary group-hover:shadow-[0_0_35px_rgba(0,225,171,0.18)] transition-all duration-300">
                                    <AppIcon name="layers" className="h-12 w-12 md:h-14 md:w-14 text-primary transition-transform duration-300 group-hover:scale-110" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Semantic Layer</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    Automatically maps relationships between disparate tables, creating a unified truth that aligns with how you think.
                                </p>
                            </div>
                            {/* Feature 3 */}
                            <div className="group">
                                <div className="w-24 h-24 rounded-3xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary group-hover:shadow-[0_0_35px_rgba(0,225,171,0.18)] transition-all duration-300">
                                    <AppIcon name="psychology" className="h-12 w-12 md:h-14 md:w-14 text-primary transition-transform duration-300 group-hover:scale-110" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Ontology-aware Insights</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    Understands business meaning. When you ask for 'high value customers', it knows exactly what that means for your industry.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Visual Flow Section */}
                <section className="py-32 bg-surface-container-low border-y border-surface-variant relative overflow-hidden">
                    <div className="max-w-5xl mx-auto px-8 relative z-10">
                        <style>{`
                            @keyframes flow-slide {
                                0% { left: -20%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { left: 100%; opacity: 0; }
                            }
                            @keyframes pulse-s1 { 0%, 20%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 5%, 15% { transform: scale(1.15); box-shadow: 0 0 25px rgba(0,225,171,0.6); z-index: 20; } }
                            @keyframes pulse-s2 { 0%, 25%, 55%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 35%, 45% { transform: scale(1.15); box-shadow: 0 0 30px rgba(0,225,171,0.9); z-index: 20; } }
                            @keyframes pulse-s3 { 0%, 55%, 85%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 65%, 75% { transform: scale(1.15); box-shadow: 0 0 25px rgba(0,225,171,0.6); z-index: 20; } }
                            @keyframes pulse-s4 { 0%, 85%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 92%, 98% { transform: scale(1.15); box-shadow: 0 0 30px rgba(123,208,255,0.8); z-index: 20; } }
                        `}</style>
                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 mt-8 md:mt-0">
                            {/* Animated Flow Line */}
                            <div className="absolute top-1/2 left-0 w-full h-[3px] -translate-y-1/2 overflow-hidden pointer-events-none hidden md:block z-0">
                                <div className="absolute h-full w-[25%] bg-gradient-to-r from-transparent via-primary to-transparent" style={{ animation: 'flow-slide 3.5s linear infinite' }}></div>
                            </div>

                            {/* Mobile Animated Flow Line (Vertical) */}
                            <div className="absolute left-1/2 top-0 w-[3px] h-full -translate-x-1/2 overflow-hidden pointer-events-none md:hidden z-0">
                                <div className="absolute w-full h-[25%] bg-gradient-to-b from-transparent via-primary to-transparent" style={{ animation: 'flow-slide-vertical 3.5s linear infinite' }}></div>
                            </div>
                            <style>{`
                                @keyframes flow-slide-vertical {
                                    0% { top: -20%; opacity: 0; }
                                    10% { opacity: 1; }
                                    90% { opacity: 1; }
                                    100% { top: 100%; opacity: 0; }
                                }
                            `}</style>

                            {/* Step 1 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-none bg-surface border border-outline flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s1 3.5s linear infinite' }}>
                                    <AppIcon name="chat_bubble" className="h-8 w-8 text-on-surface-variant" />
                                </div>
                                <span className="text-sm font-bold text-on-surface-variant">Question</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 2 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-none bg-primary flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s2 3.5s linear infinite' }}>
                                    <AppIcon name="schema" className="h-8 w-8 text-on-primary relative z-10" />
                                </div>
                                <span className="text-sm font-bold text-primary">Semantic</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 3 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-none bg-surface border border-outline flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s3 3.5s linear infinite' }}>
                                    <AppIcon name="database" className="h-8 w-8 text-on-surface-variant" />
                                </div>
                                <span className="text-sm font-bold text-on-surface-variant">SQL</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 4 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-none bg-tertiary flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s4 3.5s linear infinite' }}>
                                    <AppIcon name="lightbulb" className="h-8 w-8 text-on-tertiary relative z-10" />
                                </div>
                                <span className="text-sm font-bold text-tertiary">Insight</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-40">
                    <div className="max-w-4xl mx-auto px-8 text-center bg-surface-container-highest border border-surface-variant rounded-[3rem] py-24 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/20 blur-[100px] rounded-none"></div>
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-on-background relative z-10 font-mono leading-tight">
                            <TypewriterTitle
                                text="Start exploring your data"
                                speedMs={32}
                                startDelayMs={140}
                                showCaret={false}
                                className="mono-theme"
                            />
                            <br />
                            <TypewriterTitle
                                text="with real understanding"
                                speedMs={32}
                                startDelayMs={1020}
                                className="mono-theme"
                            />
                        </h2>
                        <div className="relative z-10">
                            <button onClick={handleLogin} className="bg-primary text-on-primary px-12 py-5 rounded-none font-bold text-xl hover:bg-primary-fixed transition-all hover:scale-105">
                                Try for free
                            </button>
                            <p className="mt-6 text-on-surface-variant font-medium">No credit card required. Setup in minutes.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto bg-background border-t border-surface-variant">
                <div className="mb-8 md:mb-0">
                    <div className="text-lg font-bold text-on-background mb-2">InsightForge AI</div>
                    <p className="text-on-surface-variant text-sm">© {new Date().getFullYear()} InsightForge AI. All rights reserved.</p>
                </div>
                <div className="flex space-x-8">
                    <button type="button" onClick={() => onShowLegal('privacy')} className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium">Privacy Policy</button>
                    <button type="button" onClick={() => onShowLegal('terms')} className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium">Terms of Service</button>
                    <a className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium" href="#">Security</a>
                    <a className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium" href="#">Status</a>
                </div>
            </footer>
        </div>
    );
}
