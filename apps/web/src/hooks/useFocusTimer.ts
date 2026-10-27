import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adjustFocusDuration,
  completeExpiredFocusTimer,
  createFocusTimerSession,
  defaultFocusDuration,
  extendFocusTimer,
  pauseFocusTimer,
  remainingFocusSeconds,
  resetFocusTimer,
  restoreFocusTimerSession,
  resumeFocusTimer,
  startFocusTimer,
  type FocusTimerSession,
} from '../utils/focusTimer';

export function focusTimerStorageKey(taskId: string, stepId: string): string {
  return `steplight.focus-timer.v1:${encodeURIComponent(taskId)}:${encodeURIComponent(stepId)}`;
}

function readSaved(storageKey: string, estimate: number, now: number): FocusTimerSession {
  try {
    return restoreFocusTimerSession(storageKey, estimate, window.localStorage.getItem(storageKey), now);
  } catch {
    return createFocusTimerSession(storageKey, estimate);
  }
}

export function useFocusTimer(storageKey: string, estimate: unknown, capacity: string) {
  const { seconds: estimatedDurationSeconds, usedFallback } = useMemo(
    () => defaultFocusDuration(estimate, capacity), [estimate, capacity],
  );
  const [session, setSession] = useState(() => readSaved(storageKey, estimatedDurationSeconds, Date.now()));
  const [now, setNow] = useState(() => Date.now());

  const activeSession = session.storageKey === storageKey
    && session.estimatedDurationSeconds === estimatedDurationSeconds
    ? session
    : createFocusTimerSession(storageKey, estimatedDurationSeconds);
  useEffect(() => {
    setSession(readSaved(storageKey, estimatedDurationSeconds, Date.now()));
    setNow(Date.now());
  }, [storageKey, estimatedDurationSeconds]);

  useEffect(() => {
    if (session.storageKey !== storageKey || session.estimatedDurationSeconds !== estimatedDurationSeconds) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } catch {
      // Timer continues to work for this page even if browser storage is unavailable.
    }
  }, [session, storageKey, estimatedDurationSeconds]);

  useEffect(() => {
    const syncClock = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      setSession((current) => {
        if (current.storageKey !== storageKey || current.status !== 'running') return current;
        return completeExpiredFocusTimer(current, timestamp);
      });
    };
    const interval = window.setInterval(syncClock, 250);
    document.addEventListener('visibilitychange', syncClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', syncClock);
    };
  }, [storageKey]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setSession(restoreFocusTimerSession(storageKey, estimatedDurationSeconds,
        event.newValue, Date.now()));
      setNow(Date.now());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey, estimatedDurationSeconds]);

  const transition = useCallback((update: (current: FocusTimerSession, timestamp: number) => FocusTimerSession) => {
    const timestamp = Date.now();
    setSession((current) => {
      const source = current.storageKey === storageKey
        && current.estimatedDurationSeconds === estimatedDurationSeconds
        ? current
        : readSaved(storageKey, estimatedDurationSeconds, timestamp);
      return update(source, timestamp);
    });
    setNow(timestamp);
  }, [storageKey, estimatedDurationSeconds]);

  const start = useCallback(() => transition(startFocusTimer), [transition]);
  const pause = useCallback(() => transition(pauseFocusTimer), [transition]);
  const resume = useCallback(() => transition(resumeFocusTimer), [transition]);
  const reset = useCallback(() => transition((current) => resetFocusTimer(current)), [transition]);
  const adjustDuration = useCallback((seconds: number) => transition((current) => adjustFocusDuration(current, seconds)), [transition]);
  const extend = useCallback((seconds = 120) => transition((current, timestamp) => extendFocusTimer(current, timestamp, seconds)), [transition]);

  return {
    status: activeSession.status,
    estimatedDurationSeconds,
    durationSeconds: activeSession.durationSeconds,
    remainingSeconds: remainingFocusSeconds(activeSession, now),
    elapsedSeconds: Math.max(0, activeSession.durationSeconds - remainingFocusSeconds(activeSession, now)),
    usedFallback,
    start,
    pause,
    resume,
    reset,
    adjustDuration,
    extend,
  };
}
