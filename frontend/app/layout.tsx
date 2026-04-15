import "./globals.css";
import { AuthProvider } from "../providers/AuthProvider";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const uiFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ui" });
const displayFont = Space_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--font-display" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "InsightForge AI",
  description: "Governed analytics engineering agent for fraud"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authConfig = {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI,
    apiScope: process.env.NEXT_PUBLIC_API_SCOPE,
  };

  return (
    <html lang="es" className="h-full bg-black">
      <body className={`${uiFont.variable} ${displayFont.variable} ${monoFont.variable} mono-motion h-full font-sans bg-black text-[#f4f0e6]`}>
        <div className="bg-dots" />
        <AuthProvider config={authConfig}>
          <Toaster theme="dark" position="top-center" richColors />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
