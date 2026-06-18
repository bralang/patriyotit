'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Project, Settings, Worker } from '@/lib/types';
import { createClient } from '@/lib/supabase';
import { getProjects, checkAutoArchive } from '@/lib/projects';
import { getSettings } from '@/lib/settings';

type ActiveTimers = Record<string, number>; // key: `${projectId}-${stageIndex}-${workerId}` → start ts

interface AppState {
  projects: Project[];
  settings: Settings;
  currentWorker: Worker | null;
  activeTimers: ActiveTimers;
  darkMode: boolean;
  loading: boolean;
}

interface AppContextValue extends AppState {
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  startTimer: (projectId: number, stageIndex: number, workerId: number) => void;
  stopTimer: (projectId: number, stageIndex: number, workerId: number) => number;
  getElapsed: (projectId: number, stageIndex: number, workerId: number) => number;
  toggleDark: () => void;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Settings>({
    statuses: [], types: [], workers: [], packages: [],
  });
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [activeTimers, setActiveTimers] = useState<ActiveTimers>({});
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ActiveTimers>({});
  timerRef.current = activeTimers;

  const refresh = useCallback(async () => {
    const [p, s] = await Promise.all([getProjects(), getSettings()]);
    await checkAutoArchive(p);
    setProjects(p);
    setSettings(s);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const [p, s, { data: { user } }] = await Promise.all([
          getProjects(),
          getSettings(),
          supabase.auth.getUser(),
        ]);
        await checkAutoArchive(p);
        setProjects(p);
        setSettings(s);
        if (user?.id) {
          const w = s.workers.find(w => w.user_id === user.id) ?? null;
          setCurrentWorker(w);
        }
      } catch (err) {
        console.error('Initial data load failed:', err);
      } finally {
        setLoading(false);
      }
    })();

    if (localStorage.getItem('darkMode')) {
      setDarkMode(true);
      document.body.classList.add('dark');
    }

    const supabase = createClient();
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        if (Object.keys(timerRef.current).length === 0) refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const timerKey = (pid: number, si: number, wid: number) => `${pid}-${si}-${wid}`;

  const startTimer = useCallback((pid: number, si: number, wid: number) => {
    setActiveTimers(prev => ({ ...prev, [timerKey(pid, si, wid)]: Date.now() }));
  }, []);

  const stopTimer = useCallback((pid: number, si: number, wid: number): number => {
    const key = timerKey(pid, si, wid);
    const start = timerRef.current[key];
    const elapsed = start ? Date.now() - start : 0;
    setActiveTimers(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    return elapsed;
  }, []);

  const getElapsed = useCallback((pid: number, si: number, wid: number): number => {
    const key = timerKey(pid, si, wid);
    const start = timerRef.current[key];
    return start ? Date.now() - start : 0;
  }, []);

  const toggleDark = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      document.body.classList.toggle('dark', next);
      localStorage.setItem('darkMode', next ? '1' : '');
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      projects, settings, currentWorker, activeTimers, darkMode, loading,
      setProjects, setSettings,
      startTimer, stopTimer, getElapsed, toggleDark, refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
