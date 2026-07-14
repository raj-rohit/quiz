import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { applyResult, emptyProgress, Progress, QuizResult } from './progress';
import { migrateByPack } from './nation';

export type { Progress, QuizResult } from './progress';

interface ProgressValue {
  progress: Progress;
  record: (r: QuizResult) => void;
}

const Ctx = createContext<ProgressValue | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress());

  useEffect(() => {
    loadJSON<Progress>(KEYS.progress, emptyProgress()).then((p) => {
      const migrated = { ...p, byPack: migrateByPack(p.byPack ?? {}) };
      setProgress(migrated);
    });
  }, []);

  const record: ProgressValue['record'] = (r) => {
    setProgress((prev) => {
      const next = applyResult(prev, r, today());
      saveJSON(KEYS.progress, next);
      return next;
    });
  };

  return <Ctx.Provider value={{ progress, record }}>{children}</Ctx.Provider>;
}

export const useProgress = (): ProgressValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress must be used within ProgressProvider');
  return v;
};
