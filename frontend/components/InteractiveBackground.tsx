"use client";

import { useEffect, useState } from "react";

export function InteractiveBackground() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#050505]">
      {/* Ambient background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/10 blur-[120px] mix-blend-screen pointer-events-none"></div>

      {/* Base very subtle dots */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Interactive bright dots on hover */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          backgroundImage: "radial-gradient(rgba(139, 92, 246, 0.8) 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px",
          maskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}
