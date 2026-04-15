'use client';
import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../lib/authConfig';
import Link from 'next/link';
import { TypewriterTitle } from '../../components/TypewriterTitle';
import { AppIcon } from '../../components/AppIcon';

export default function DocsPage() {
    const { instance } = useMsal();

    const handleLogin = () => {
        void instance.loginRedirect(loginRequest);
    };

    return (
        <div className="mono-theme min-h-screen bg-transparent text-on-background flex flex-col overflow-hidden">
            {/* Top NavBar Shared */}
            <nav className="mono-enter flex justify-between items-center px-8 py-4 w-full bg-background/80 backdrop-blur-md z-50 border-b border-outline">
                <Link href="/" className="text-xl font-bold tracking-tight text-on-background">InsightForge AI</Link>
                <div className="hidden md:flex items-center space-x-10 text-[11px] tracking-widest uppercase font-bold text-on-surface-variant">
                    <Link className="hover:text-primary transition-colors duration-300" href="/docs">Docs</Link>
                    <div className="flex items-center space-x-6 border-l border-surface-variant pl-6">
                        <button onClick={handleLogin} className="hover:text-primary transition-colors duration-300">Login</button>
                        <button onClick={handleLogin} className="bg-primary text-on-primary px-6 py-2 font-bold hover:bg-primary-fixed transition-transform active:scale-95 rounded-none border border-primary">Try for free</button>
                    </div>
                </div>
            
            </nav>

            <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar */}
            <aside className="mono-enter-delay-1 w-64 border-r border-outline h-screen overflow-y-auto flex-shrink-0 hide-scrollbar pt-12 pb-24">
                <nav className="space-y-8 px-4">
                    {/* Introduction */}
                    <div>
                        <div className="flex items-center space-x-2 text-sm font-bold text-on-background mb-3 uppercase tracking-wider">
                            <AppIcon name="auto_stories" className="h-[18px] w-[18px]" />
                            <span>Introduction</span>
                        </div>
                        <ul className="space-y-1">
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Getting Started</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Databases</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Chat with your Database</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-background bg-surface-variant border-l-2 border-[#00e1ab] rounded-r-md">SQL Query Editor</a></li>
                        </ul>
                    </div>

                    {/* Connectors */}
                    <div>
                        <div className="flex items-center space-x-2 text-sm font-bold text-on-background mb-3 uppercase tracking-wider">
                            <AppIcon name="cable" className="h-[18px] w-[18px]" />
                            <span>Connectors</span>
                        </div>
                        <ul className="space-y-1">
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Supported Connectors</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">PostgreSQL</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">TursoDB</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Cloudflare D1</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">MySQL</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">ClickHouse</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">MotherDuck</a></li>
                        </ul>
                    </div>

                    {/* Providers */}
                    <div>
                        <div className="flex items-center space-x-2 text-sm font-bold text-on-background mb-3 uppercase tracking-wider">
                            <AppIcon name="cloud" className="h-[18px] w-[18px]" />
                            <span>Providers</span>
                        </div>
                        <ul className="space-y-1">
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Digital Ocean</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Neon</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Supabase</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Render</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">AWS</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Heroku</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Railway MySQL</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Planetscale</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">ClickHouse Cloud</a></li>
                        </ul>
                    </div>

                    {/* Learn SQL */}
                    <div>
                        <div className="flex items-center space-x-2 text-sm font-bold text-on-background mb-3 uppercase tracking-wider">
                            <AppIcon name="terminal" className="h-[18px] w-[18px]" />
                            <span>Learn SQL</span>
                        </div>
                        <ul className="space-y-1 pt-1 border-t border-outline">
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">SQL Basics: Getting Started</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Select Clause</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Where Clause</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Comparison Operators</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Logical Operators</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Arithmetic Operators</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Special Operators</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Syntax Errors</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Semantic Errors</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">Runtime Errors</a></li>
                            <li><a href="#" className="block px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-background rounded-md transition-colors">With Clause</a></li>
                        </ul>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="mono-enter-delay-2 flex-1 overflow-y-auto h-screen px-12 py-16 scroll-smooth">
                <div className="max-w-4xl mx-auto flex gap-12">
                    {/* Article Content */}
                    <article className="flex-1">
                        <h1 className="text-4xl font-bold mb-6 text-on-background">
                            <TypewriterTitle text="SQL Query Workspace" speedMs={50} startDelayMs={220} />
                        </h1>
                        <p className="text-on-surface-variant leading-relaxed mb-10 text-lg">
                            For advanced users, analysts, and data engineers, InsightForge AI features a fully-fledged IDE for deep database interaction. You can bypass the natural language layer anytime to write, execute, and profile raw SQL directly against your securely connected data sources.
                        </p>

                        {/* App Screenshot Placeholder */}
                        <div className="mono-scanline w-full aspect-video rounded-xl bg-gradient-to-br from-indigo-600 via-cyan-500 to-emerald-400 p-[1px] mb-12 shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-[1px] bg-background rounded-xl overflow-hidden opacity-90 transition-opacity duration-300 group-hover:opacity-100 flex flex-col">
                                {/* Editor Header */}
                                <div className="h-10 bg-surface-container-low border-b border-outline flex items-center px-4 space-x-2">
                                    <div className="w-3 h-3 rounded-none bg-red-900/100/80"></div>
                                    <div className="w-3 h-3 rounded-none bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-none bg-green-500/80"></div>
                                    <div className="flex-1 flex justify-center">
                                        <div className="bg-surface-variant text-xs px-6 py-1 rounded-md text-on-surface-variant flex items-center shadow-inner">
                                            <AppIcon name="database" className="h-[14px] w-[14px] mr-2 text-purple-400" />
                                            Production DB - Query 1
                                        </div>
                                    </div>
                                </div>
                                {/* Editor Body splits */}
                                <div className="flex-1 flex">
                                    <div className="w-48 border-r border-outline bg-background p-3 hidden sm:block">
                                        <div className="text-xs font-mono text-primary mb-2">schemas</div>
                                        <div className="text-xs font-mono text-on-surface-variant mb-1 ml-2">▸ public</div>
                                        <div className="text-xs font-mono mb-1 ml-4 py-1 text-white bg-surface-variant rounded px-1">users</div>
                                        <div className="text-xs font-mono text-on-surface-variant mb-1 ml-4">orders</div>
                                        <div className="text-xs font-mono text-on-surface-variant mb-1 ml-4">products</div>
                                    </div>
                                    <div className="flex-1 bg-surface-container-lowest p-4 flex flex-col relative">
                                        <div className="text-sm leading-relaxed text-on-surface-variant flex-1">
                                            <span className="text-error">SELECT</span> *<br/>
                                            <span className="text-error">FROM</span> users<br/>
                                            <span className="text-error">WHERE</span> created_at {'>'} <span className="text-tertiary">'2026-01-01'</span><br/>
                                            <span className="text-error">ORDER BY</span> id <span className="text-error">DESC</span><br/>
                                            <span className="text-error">LIMIT</span> <span className="text-primary-fixed">100</span>;
                                        </div>
                                        <div className="h-1/2 border-t border-outline pt-2 mt-4">
                                            {/* Results table mock */}
                                            <div className="w-full bg-surface-container-low rounded border border-outline h-full overflow-hidden hidden sm:flex sm:flex-col">
                                                <div className="flex text-xs text-on-surface-variant border-b border-outline p-2 bg-surface-variant/50">
                                                    <div className="w-12">id</div>
                                                    <div className="w-32">name</div>
                                                    <div className="w-48">email</div>
                                                    <div className="flex-1">status</div>
                                                </div>
                                                <div className="p-2 space-y-2 opacity-50">
                                                    <div className="flex text-xs text-on-surface-variant"><div className="w-12 text-primary-fixed">1042</div><div className="w-32">Alice Smith</div><div className="w-48">alice@example.com</div><div className="flex-1 text-primary">Active</div></div>
                                                    <div className="flex text-xs text-on-surface-variant"><div className="w-12 text-primary-fixed">1041</div><div className="w-32">Bob Jones</div><div className="w-48">bob@company.com</div><div className="flex-1 text-yellow-500">Pending</div></div>
                                                    <div className="flex text-xs text-on-surface-variant"><div className="w-12 text-primary-fixed">1040</div><div className="w-32">Charlie Brown</div><div className="w-48">charlie@startup.io</div><div className="flex-1 text-primary">Active</div></div>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="absolute right-4 bottom-4 bg-primary text-on-primary px-4 py-1.5 rounded text-sm font-bold shadow-lg shadow-[#00e1ab]/20 hover:bg-primary-fixed transition-colors flex items-center">
                                            <AppIcon name="play_arrow" className="h-[16px] w-[16px] mr-1" /> Run Query
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sections */}
                        <section className="mb-12 mono-enter" id="opening">
                            <h2 className="text-2xl font-bold mb-4 border-b border-outline pb-2 text-on-background">
                                <TypewriterTitle text="Launching the Workspace" speedMs={42} startDelayMs={280} />
                            </h2>
                            <ol className="list-decimal pl-5 space-y-3 text-on-surface-variant leading-relaxed">
                                <li>Navigate to the Data Catalog and select your target organizational connection.</li>
                                <li>Click the "SQL Workspace" toggle situated in the side navigation panel.</li>
                                <li>Use the new tab action on the top right to open isolated execution contexts for multiple simultaneous queries.</li>
                            </ol>
                        </section>

                        <section className="mb-12 mono-enter-delay-1" id="exploring">
                            <h2 className="text-2xl font-bold mb-4 border-b border-outline pb-2 text-on-background">
                                <TypewriterTitle text="Navigating Your Schema" speedMs={42} startDelayMs={340} />
                            </h2>
                            <p className="text-on-surface-variant leading-relaxed mb-4">
                                InsightForge AI offers an intuitive metadata tree to inspect your data architecture. The left panel shows live reflections of all accessible schemas, tables, and views. Interacting with any entity automatically generates a base scaffold script to preview its structure without writing manual syntax.
                            </p>
                            <p className="text-on-surface-variant leading-relaxed">
                                To protect your infrastructure and reduce overhead, the system enforces a native pagination limit of 100 rows per execution by default, though you can freely override this behavior by appending a custom LIMIT to your script.
                            </p>
                        </section>

                        <section className="mb-12 mono-enter-delay-2" id="refreshing">
                            <h2 className="text-2xl font-bold mb-4 border-b border-outline pb-2 text-on-background">
                                <TypewriterTitle text="Synchronizing Metadata" speedMs={42} startDelayMs={400} />
                            </h2>
                            <p className="text-on-surface-variant leading-relaxed mb-4">
                                When external migrations or structural alterations occur outside of InsightForge, you can trigger a manual synchronization from the workspace header. This immediately fetches the latest object definitions from your remote server.
                            </p>
                            <p className="text-on-surface-variant leading-relaxed">
                                Note that any direct DDL operations (such as CREATE or ALTER statements) successfully executed inside our editor will automatically push a sync signal to keep your artificial intelligence's semantic understanding fully up to date.
                            </p>
                        </section>

                        <section className="mb-16 mono-enter" id="downloading">
                            <h2 className="text-2xl font-bold mb-4 border-b border-outline pb-2 text-on-background">
                                <TypewriterTitle text="Exporting Data" speedMs={42} startDelayMs={460} />
                            </h2>
                            <p className="text-on-surface-variant leading-relaxed">
                                Extracting your analyzed results is straightforward. Use the unified export menu located at the bottom of the data grid to save your current output. Fast CSV extraction is supported natively for immediate downstream use in external reports or BI tools.
                            </p>
                        </section>

                        {/* Pagination Bottom */}
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start pt-8 border-t border-outline mb-12">
                            <a href="#" className="flex flex-col mb-4 sm:mb-0 group">
                                <span className="text-xs text-on-surface-variant mb-1 transition-colors group-hover:text-primary">Previous article</span>
                                <span className="text-on-background font-medium flex items-center transition-colors group-hover:text-primary-fixed">
                                    <AppIcon name="arrow_back" className="h-[18px] w-[18px] mr-1" /> Chat with your Database
                                </span>
                            </a>
                            <a href="#" className="flex flex-col sm:items-end group">
                                <span className="text-xs text-on-surface-variant mb-1 transition-colors group-hover:text-primary">Next article</span>
                                <span className="text-on-background font-medium flex items-center transition-colors group-hover:text-primary-fixed">
                                    Supported Connectors <AppIcon name="arrow_forward" className="h-[18px] w-[18px] ml-1" />
                                </span>
                            </a>
                        </div>
                    </article>

                    {/* Right Sidebar - On this page */}
                    <aside className="w-56 hidden lg:block pt-2">
                        <div className="sticky top-16">
                            <h3 className="text-sm border-b border-outline pb-2 font-bold text-on-background mb-4">On this page</h3>
                            <ul className="space-y-3">
                                <li><a href="#opening" className="text-sm text-on-surface-variant hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 block">Launching the Workspace</a></li>
                                <li><a href="#exploring" className="text-sm text-on-surface-variant hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 block">Navigating Your Schema</a></li>
                                <li><a href="#refreshing" className="text-sm text-on-surface-variant hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 block">Synchronizing Metadata</a></li>
                                <li><a href="#downloading" className="text-sm text-on-surface-variant hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 block">Exporting Data</a></li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </main>
            </div>
        </div>
    );
}
