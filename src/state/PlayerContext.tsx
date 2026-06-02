import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';

interface PlayerValue {
  name: string | null;
  setName: (n: string | null) => void;
  /** True once the persisted name has loaded (so we don't flash the name prompt). */
  hydrated: boolean;
}

const Ctx = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadJSON<string | null>(KEYS.name, null).then((n) => {
      setNameState(n);
      setHydrated(true);
    });
  }, []);

  const setName = (n: string | null) => {
    const v = n && n.trim() ? n.trim() : null;
    setNameState(v);
    saveJSON(KEYS.name, v);
  };

  return <Ctx.Provider value={{ name, setName, hydrated }}>{children}</Ctx.Provider>;
}

export const usePlayer = (): PlayerValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer must be used within PlayerProvider');
  return v;
};
