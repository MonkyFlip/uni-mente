import {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from 'react';
import { TOUR_STEPS, TourStep } from './tourSteps';

interface TourContextType {
  active:    boolean;
  stepIndex: number;
  steps:     TourStep[];
  current:   TourStep | null;
  start:     () => void;
  next:      () => void;
  skip:      () => void;
  total:     number;
}

const TourContext = createContext<TourContextType | null>(null);

const STORAGE_KEY = (rol: string) => `unimente_tour_v1_${rol}`;

export function TourProvider({
  children,
  rol,
}: {
  children: ReactNode;
  rol: string | undefined;
}) {
  const [active,    setActive]    = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps: TourStep[] = TOUR_STEPS[rol ?? ''] ?? [];

  // Launch automatically on first login for this role
  useEffect(() => {
    if (!rol || steps.length === 0) return;
    const done = localStorage.getItem(STORAGE_KEY(rol));
    if (!done) {
      // Small delay so layout is fully rendered
      const t = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(t);
    }
  }, [rol]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    if (rol) localStorage.setItem(STORAGE_KEY(rol), '1');
  }, [rol]);

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i >= steps.length - 1) { finish(); return 0; }
      return i + 1;
    });
  }, [steps.length, finish]);

  const skip = useCallback(() => { finish(); }, [finish]);

  const current = active && steps.length > 0 ? steps[stepIndex] : null;

  return (
    <TourContext.Provider value={{
      active, stepIndex, steps, current, start, next, skip,
      total: steps.length,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be inside TourProvider');
  return ctx;
}
