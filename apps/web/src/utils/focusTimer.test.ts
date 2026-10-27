import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { defaultFocusDuration } from './focusTimer';

describe('adaptive focus timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses valid saved step estimates and safe capacity defaults for missing estimates', () => {
    expect(defaultFocusDuration(60, 'low')).toEqual({ seconds: 60, usedFallback: false });
    expect(defaultFocusDuration(8 * 60, 'medium')).toEqual({ seconds: 480, usedFallback: false });
    expect(defaultFocusDuration(0, 'low')).toEqual({ seconds: 60, usedFallback: true });
    expect(defaultFocusDuration(Number.NaN, 'medium')).toEqual({ seconds: 300, usedFallback: true });
  });

  it('supports duration adjustment, timestamp countdown, pause, resume, and reset', () => {
    const { result } = renderHook(() => useFocusTimer('timer:task:step', 60, 'low'));
    expect(result.current.durationSeconds).toBe(60);
    act(() => result.current.adjustDuration(8 * 60));
    expect(result.current.durationSeconds).toBe(480);

    act(() => result.current.start());
    expect(result.current.status).toBe('running');
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.remainingSeconds).toBe(478);

    act(() => result.current.pause());
    const pausedAt = result.current.remainingSeconds;
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.status).toBe('paused');
    expect(result.current.remainingSeconds).toBe(pausedAt);

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.remainingSeconds).toBe(pausedAt - 1);

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.durationSeconds).toBe(60);
    expect(result.current.remainingSeconds).toBe(60);
  });

  it('marks expiration without completing a task and can extend the timer', () => {
    const { result } = renderHook(() => useFocusTimer('timer:task:short', 2, 'low'));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.status).toBe('complete');
    expect(result.current.remainingSeconds).toBe(0);

    act(() => result.current.extend(120));
    expect(result.current.status).toBe('running');
    expect(result.current.remainingSeconds).toBe(120);
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.durationSeconds).toBe(2);
  });

  it('keeps each step independent and restores a running deadline after refresh', () => {
    const { result, rerender, unmount } = renderHook(
      ({ step, estimate }: { step: string; estimate: number }) => useFocusTimer(`timer:task:${step}`, estimate, 'low'),
      { initialProps: { step: 'step-1', estimate: 60 } },
    );
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remainingSeconds).toBe(50);

    act(() => rerender({ step: 'step-2', estimate: 8 * 60 }));
    expect(result.current.status).toBe('idle');
    expect(result.current.durationSeconds).toBe(480);
    expect(result.current.remainingSeconds).toBe(480);

    act(() => rerender({ step: 'step-1', estimate: 60 }));
    expect(result.current.status).toBe('running');
    expect(result.current.remainingSeconds).toBe(50);
    unmount();

    act(() => vi.setSystemTime(Date.now() + 5_000));
    const restored = renderHook(() => useFocusTimer('timer:task:step-1', 60, 'low'));
    expect(restored.result.current.status).toBe('running');
    expect(restored.result.current.remainingSeconds).toBe(45);

    act(() => {
      vi.setSystemTime(Date.now() + 45_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(restored.result.current.status).toBe('complete');
    expect(restored.result.current.remainingSeconds).toBe(0);
  });
});
