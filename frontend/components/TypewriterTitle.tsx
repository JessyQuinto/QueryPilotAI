'use client';

import { useEffect, useState } from 'react';

interface TypewriterTitleProps {
  text: string;
  className?: string;
  speedMs?: number;
  startDelayMs?: number;
  showCaret?: boolean;
}

export function TypewriterTitle({
  text,
  className = '',
  speedMs = 24,
  startDelayMs = 0,
  showCaret = true
}: TypewriterTitleProps) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setVisibleChars((prev) => {
          if (prev >= text.length) {
            if (intervalId) clearInterval(intervalId);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs);
    }, startDelayMs);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speedMs, startDelayMs]);

  return (
    <span className={`${className} ${showCaret ? 'mono-caret-inline' : ''}`.trim()}>
      {text.slice(0, visibleChars)}
    </span>
  );
}
