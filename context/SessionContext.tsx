import { createContext, useContext, useState, ReactNode } from 'react';

type SetLog = { set_type: 'normal' | 'dropset' | 'backoff' | 'stripping'; reps_done: string; weight_used_kg: string };
type Exercise = { id: string; name: string; muscle_group: string | null; sets: number; reps: number; rest_seconds: number; notes: string | null; order_index: number; has_dropset: boolean; dropset_percentage: number | null; dropset_sets: number | null; has_backoff: boolean; backoff_percentage: number | null; backoff_sets: number | null; has_stripping: boolean; stripping_steps: number | null; stripping_percentage: number | null; stripping_reps_increase: number | null };
export type ExerciseLog = { exercise: Exercise; sets: SetLog[] };

export type ActiveSession = {
  planId: string;
  dayIndex: string | undefined;
  planName: string;
  logs: ExerciseLog[];
  sessionDate: Date;
};

type SessionContextType = {
  activeSession: ActiveSession | null;
  startSession: (session: ActiveSession) => void;
  updateLogs: (logs: ExerciseLog[]) => void;
  updateDate: (date: Date) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const startSession = (session: ActiveSession) => setActiveSession(session);
  const updateLogs = (logs: ExerciseLog[]) => setActiveSession(prev => prev ? { ...prev, logs } : prev);
  const updateDate = (date: Date) => setActiveSession(prev => prev ? { ...prev, sessionDate: date } : prev);
  const clearSession = () => setActiveSession(null);

  return (
    <SessionContext.Provider value={{ activeSession, startSession, updateLogs, updateDate, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
