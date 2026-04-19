import { useEffect, useState } from "react";

function computeSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function useElapsedSeconds(startedAt: string | null): number {
  const [seconds, setSeconds] = useState(() => computeSeconds(startedAt));

  useEffect(() => {
    setSeconds(computeSeconds(startedAt));
    if (!startedAt) return;
    const interval = window.setInterval(() => {
      setSeconds(computeSeconds(startedAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  return seconds;
}

export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
