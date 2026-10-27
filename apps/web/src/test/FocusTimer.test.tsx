import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FocusTimer } from '../components/FocusTimer';

describe('FocusTimer controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('shows the saved estimate and does not mark the step complete at expiration', () => {
    const onMarkComplete = vi.fn();
    const onTakeRest = vi.fn();
    render(<FocusTimer taskId="task-1" stepId="step-1" stepTitle="Open the draft"
      stepInstruction="Open the saved report draft." estimatedDurationSeconds={1} capacity="low"
      onMarkComplete={onMarkComplete} onTakeRest={onTakeRest} />);

    expect(screen.getByText('Open the draft')).toBeInTheDocument();
    expect(screen.getByText('Open the saved report draft.')).toBeInTheDocument();
    expect(screen.getByText(/AI estimate:/)).toHaveTextContent('00:01');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(1_000));

    expect(screen.getByText('Timer complete')).toBeInTheDocument();
    expect(onMarkComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Extend by 2 minutes' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('02:00');
  });

  it('offers explicit completion and rest actions only after expiration', () => {
    const onMarkComplete = vi.fn();
    const onTakeRest = vi.fn();
    render(<FocusTimer taskId="task-1" stepId="step-2" stepTitle="Save one note"
      estimatedDurationSeconds={1} capacity="low" onMarkComplete={onMarkComplete} onTakeRest={onTakeRest} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.click(screen.getByRole('button', { name: 'Take a short rest' }));
    expect(onTakeRest).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Mark this step complete' }));
    expect(onMarkComplete).toHaveBeenCalledOnce();
  });
});
