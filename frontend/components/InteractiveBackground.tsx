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
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base very subtle dots */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.4) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Interactive bright dots on hover */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(167, 139, 250, 0.95) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          maskImage: `radial-gradient(250px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(250px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}
