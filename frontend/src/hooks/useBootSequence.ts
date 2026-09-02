import { useEffect, useState } from "react";

/**
 * The real backend boot (config fetch, session refresh, dashboard preload) will
 * drive this later. For the prototype we run a short, believable staged
 * sequence that advances a progress bar and ends in `ready`.
 */
const STAGES = [
  { label: "Initializing application...", to: 16 },
  { label: "Loading system configuration...", to: 36 },
  { label: "Preparing local data...", to: 58 },
  { label: "Loading user session...", to: 76 },
  { label: "Preparing dashboard...", to: 92 },
  { label: "Ready", to: 100 },
];

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface BootState {
  progress: number;
  message: string;
  ready: boolean;
}

export function useBootSequence(totalMs = 1800): BootState {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(STAGES[0].label);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / totalMs);

      const idx = Math.min(STAGES.length - 1, Math.floor(t * STAGES.length));
      setMessage(STAGES[idx].label);

      const prev = idx === 0 ? 0 : STAGES[idx - 1].to;
      const cur = STAGES[idx].to;
      const local = Math.min(1, t * STAGES.length - idx);
      setProgress(Math.round(prev + (cur - prev) * easeInOut(local)));

      if (t >= 1) {
        clearInterval(id);
        setProgress(100);
        setMessage(STAGES[STAGES.length - 1].label);
        setTimeout(() => setReady(true), 240);
      }
    }, 40);

    return () => clearInterval(id);
  }, [totalMs]);

  return { progress, message, ready };
}
