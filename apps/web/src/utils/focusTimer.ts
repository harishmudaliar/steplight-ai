export type FocusTimerStatus = 'idle' | 'running' | 'paused' | 'complete';

export interface FocusTimerSession {
  storageKey: string;
  estimatedDurationSeconds: number;
  durationSeconds: number;
  remainingSeconds: number;
  status: FocusTimerStatus;
  endsAt: number | null;
}

const MAX_DURATION_SECONDS = 24 * 60 * 60;
const FALLBACK_DURATION_SECONDS: Record<string, number> = {
  low: 60,
  medium: 5 * 60,
  high: 15 * 60,
};

export function validDurationSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= MAX_DURATION_SECONDS;
}

export function defaultFocusDuration(estimate: unknown, capacity: string): { seconds: number; usedFallback: boolean } {
  if (validDurationSeconds(estimate)) return { seconds: Math.ceil(estimate), usedFallback: false };
  return { seconds: FALLBACK_DURATION_SECONDS[capacity] ?? FALLBACK_DURATION_SECONDS.low, usedFallback: true };
}

export function createFocusTimerSession(
  storageKey: string,
  estimatedDurationSeconds: number,
): FocusTimerSession {
  return {
    storageKey,
    estimatedDurationSeconds,
    durationSeconds: estimatedDurationSeconds,
    remainingSeconds: estimatedDurationSeconds,
    status: 'idle',
    endsAt: null,
  };
}

export function remainingFocusSeconds(session: FocusTimerSession, now: number): number {
  if (session.status === 'running' && session.endsAt !== null) {
    return Math.max(0, Math.ceil((session.endsAt - now) / 1000));
  }
  return Math.max(0, Math.min(session.durationSeconds, Math.ceil(session.remainingSeconds)));
}

export function startFocusTimer(session: FocusTimerSession, now: number): FocusTimerSession {
  if (session.status !== 'idle') return session;
  return { ...session, status: 'running', remainingSeconds: session.durationSeconds,
    endsAt: now + session.durationSeconds * 1000 };
}

export function pauseFocusTimer(session: FocusTimerSession, now: number): FocusTimerSession {
  if (session.status !== 'running') return session;
  const remainingSeconds = remainingFocusSeconds(session, now);
  return { ...session, status: remainingSeconds === 0 ? 'complete' : 'paused',
    remainingSeconds, endsAt: null };
}

export function resumeFocusTimer(session: FocusTimerSession, now: number): FocusTimerSession {
  if (session.status !== 'paused' || session.remainingSeconds <= 0) return session;
  return { ...session, status: 'running', endsAt: now + session.remainingSeconds * 1000 };
}

export function resetFocusTimer(session: FocusTimerSession): FocusTimerSession {
  return createFocusTimerSession(session.storageKey, session.estimatedDurationSeconds);
}

export function adjustFocusDuration(session: FocusTimerSession, seconds: number): FocusTimerSession {
  if (session.status !== 'idle' || !validDurationSeconds(seconds)) return session;
  const durationSeconds = Math.ceil(seconds);
  return { ...session, durationSeconds, remainingSeconds: durationSeconds };
}

export function extendFocusTimer(session: FocusTimerSession, now: number, seconds = 120): FocusTimerSession {
  if (session.status !== 'complete' || !validDurationSeconds(seconds)) return session;
  const extensionSeconds = Math.min(Math.ceil(seconds), MAX_DURATION_SECONDS - session.durationSeconds);
  if (extensionSeconds < 1) return session;
  return { ...session, durationSeconds: session.durationSeconds + extensionSeconds,
    remainingSeconds: extensionSeconds, status: 'running', endsAt: now + extensionSeconds * 1000 };
}

export function completeExpiredFocusTimer(session: FocusTimerSession, now: number): FocusTimerSession {
  if (session.status !== 'running' || remainingFocusSeconds(session, now) > 0) return session;
  return { ...session, status: 'complete', remainingSeconds: 0, endsAt: null };
}

export function restoreFocusTimerSession(
  storageKey: string,
  estimate: number,
  serialized: string | null,
  now: number,
): FocusTimerSession {
  const initial = createFocusTimerSession(storageKey, estimate);
  if (!serialized) return initial;
  try {
    const saved: unknown = JSON.parse(serialized);
    if (!saved || typeof saved !== 'object') return initial;
    const value = saved as Partial<FocusTimerSession>;
    if (value.storageKey !== storageKey || value.estimatedDurationSeconds !== estimate
      || !validDurationSeconds(value.durationSeconds)
      || !['idle', 'running', 'paused', 'complete'].includes(value.status || '')) return initial;
    const remainingSeconds = Number(value.remainingSeconds);
    if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0 || remainingSeconds > value.durationSeconds) return initial;
    const session: FocusTimerSession = {
      storageKey,
      estimatedDurationSeconds: estimate,
      durationSeconds: Math.ceil(value.durationSeconds),
      remainingSeconds: Math.ceil(remainingSeconds),
      status: value.status as FocusTimerStatus,
      endsAt: Number.isFinite(value.endsAt) ? Number(value.endsAt) : null,
    };
    if (session.status === 'running' && session.endsAt === null) return initial;
    return completeExpiredFocusTimer(session, now);
  } catch {
    return initial;
  }
}
