"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "../components/AppIcon";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="animate-pulse flex items-center gap-3">
        <AppIcon name="hourglass_empty" className="h-[24px] w-[24px] animate-spin" />
        Loading your workspace...
      </div>
    </div>
  );
}
