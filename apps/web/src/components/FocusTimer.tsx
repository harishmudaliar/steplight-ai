import React, { useEffect, useRef, useState } from 'react';
import { focusTimerStorageKey, useFocusTimer } from '../hooks/useFocusTimer';

interface FocusTimerProps {
  taskId: string;
  stepId: string;
  stepTitle: string;
  stepInstruction?: string;
  estimatedDurationSeconds?: number;
  capacity: string;
  busy?: boolean;
  onMarkComplete: () => void | Promise<void>;
  onTakeRest: () => void | Promise<void>;
}

export function formatTimerTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  taskId,
  stepId,
  stepTitle,
  stepInstruction,
  estimatedDurationSeconds,
  capacity,
  busy = false,
  onMarkComplete,
  onTakeRest,
}) => {
  const timer = useFocusTimer(focusTimerStorageKey(taskId, stepId), estimatedDurationSeconds, capacity);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const notificationKey = useRef<string | null>(null);
  const isBusy = busy || isCompleting;

  useEffect(() => {
    if (timer.status !== 'complete') {
      notificationKey.current = null;
      return;
    }
    if (notificationKey.current === stepId) return;
    notificationKey.current = stepId;
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus timer finished', { body: `Time is up for “${stepTitle}”. You can continue whenever you’re ready.` });
      }
    } catch {
      // The visible completion state remains available if native notifications are unavailable.
    }
  }, [timer.status, stepId, stepTitle]);

  const handleMarkComplete = async () => {
    setActionError(null);
    setIsCompleting(true);
    try {
      await onMarkComplete();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save this step yet.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleTakeRest = async () => {
    setActionError(null);
    try {
      await onTakeRest();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save your rest yet.');
    }
  };

  const handleDurationChange = (value: string) => {
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 1440) {
      timer.adjustDuration(Math.max(1, Math.round(minutes * 60)));
    }
  };

  const progress = timer.durationSeconds > 0
    ? Math.min(100, Math.max(0, (timer.elapsedSeconds / timer.durationSeconds) * 100))
    : 0;

  return (
    <section aria-label="Focus timer" className="my-space-lg rounded-2xl bg-surface-container-lowest border border-surface-container-high/60 p-space-md shadow-sm flex flex-col gap-space-md">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Focus timer</h2>
          <span className="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium capitalize text-on-secondary-fixed-variant">
            {capacity} capacity
          </span>
        </div>
        <p className="font-label-md text-label-md text-on-surface">{stepTitle}</p>
        {stepInstruction && <p className="font-body-sm text-body-sm text-on-surface-variant">{stepInstruction}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant">
          {timer.usedFallback ? 'Safe fallback:' : 'AI estimate:'} <strong className="text-on-surface">{formatTimerTime(timer.estimatedDurationSeconds)}</strong>
        </p>
        <label className="rounded-lg bg-surface-container-low px-3 py-2 text-on-surface-variant" htmlFor={`focus-duration-${stepId}`}>
          Chosen timer (min)
          <input
            id={`focus-duration-${stepId}`}
            aria-label="Chosen timer duration in minutes"
            className="ml-2 w-20 rounded-md border border-surface-container-high bg-surface-container-lowest px-2 py-1 text-on-surface"
            type="number"
            min="0.02"
            max="1440"
            step="0.25"
            value={(timer.durationSeconds / 60).toFixed(2)}
            disabled={timer.status !== 'idle' || isBusy}
            onChange={(event) => handleDurationChange(event.currentTarget.value)}
          />
        </label>
      </div>
      {timer.usedFallback && (
        <p className="text-sm text-on-surface-variant">No valid saved estimate was available. A safe default is selected; you can adjust it before starting.</p>
      )}

      <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-container-low p-space-md">
        <output aria-label="Time remaining" aria-live="off" className="font-mono text-5xl font-bold tabular-nums text-on-surface">
          {formatTimerTime(timer.remainingSeconds)}
        </output>
        <progress aria-label="Timer progress" className="h-2 w-full overflow-hidden rounded-full accent-primary" max={100} value={progress} />
        <p className="text-xs text-on-surface-variant">
          Elapsed {formatTimerTime(timer.elapsedSeconds)} of {formatTimerTime(timer.durationSeconds)}
        </p>
      </div>

      {timer.status === 'complete' ? (
        <div role="status" aria-live="assertive" className="flex flex-col gap-3 rounded-xl bg-secondary-container/70 p-4 text-on-secondary-fixed-variant">
          <div>
            <p className="font-semibold">Timer complete</p>
            <p className="text-sm">Your step is still here. Choose what feels right; it has not been marked complete.</p>
          </div>
          <button type="button" onClick={() => void handleMarkComplete()} disabled={isBusy} className="min-h-11 rounded-xl bg-primary-container px-4 font-semibold text-on-primary-container disabled:opacity-60">
            {isCompleting ? 'Saving step…' : 'Mark this step complete'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => timer.extend(120)} className="min-h-11 rounded-xl bg-surface-container-low px-3 font-medium text-on-surface">
              Extend by 2 minutes
            </button>
            <button type="button" onClick={() => void handleTakeRest()} disabled={isBusy} className="min-h-11 rounded-xl bg-surface-container-low px-3 font-medium text-on-surface disabled:opacity-60">
              Take a short rest
            </button>
          </div>
          <button type="button" onClick={timer.reset} className="min-h-10 rounded-xl border border-outline/40 px-4 font-medium text-on-surface">
            Reset to step estimate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {timer.status === 'idle' && (
            <button type="button" onClick={timer.start} className="min-h-11 rounded-xl bg-primary-container px-4 font-semibold text-on-primary-container">
              Start
            </button>
          )}
          {timer.status === 'running' && (
            <button type="button" onClick={timer.pause} className="min-h-11 rounded-xl bg-primary-container px-4 font-semibold text-on-primary-container">
              Pause
            </button>
          )}
          {timer.status === 'paused' && (
            <button type="button" onClick={timer.resume} className="min-h-11 rounded-xl bg-primary-container px-4 font-semibold text-on-primary-container">
              Resume
            </button>
          )}
          {timer.status !== 'idle' && (
            <button type="button" onClick={timer.reset} className="min-h-11 rounded-xl border border-outline/40 px-4 font-medium text-on-surface">
              Reset
            </button>
          )}
          {timer.status === 'idle' && timer.durationSeconds !== timer.estimatedDurationSeconds && (
            <button type="button" onClick={timer.reset} className="min-h-11 rounded-xl border border-outline/40 px-4 font-medium text-on-surface">
              Reset to estimate
            </button>
          )}
          {timer.status === 'idle' && (
            <p className="col-span-2 text-center text-sm text-on-surface-variant">The timer is optional. Pause or reset whenever you need.</p>
          )}
        </div>
      )}
      {actionError && <p role="alert" className="rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container">{actionError}</p>}
    </section>
  );
};
