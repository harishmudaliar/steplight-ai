import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CapacityLevel, Task } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, apiClient } = useAuth();
  const {
    tasks,
    counts,
    countsLoading,
    isMutating,
    fetchTasks,
    fetchTaskCounts,
    countsError,
    updateTask,
    createTask,
  } = useTask();

  const createRef = useRef(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [capacity, setCapacity] = useState<CapacityLevel>('low');
  const [taskInput, setTaskInput] = useState('');
  const [breakdownMessage, setBreakdownMessage] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks({ status: 'active', page: 1, page_size: 5 });
      fetchTaskCounts();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick the most recent in-progress task to feature
  const activeTask: Task | null = tasks.find(t => t.status === 'active') ?? null;
  const nextStep = activeTask?.steps.find(s => s.status === 'pending') ?? null;

  const handleBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTask = taskInput.trim();
    if (!effectiveTask) { navigate('/tasks'); return; }

    if (!isAuthenticated) { navigate('/login'); return; }

    if (createRef.current) return;
    createRef.current = true;
    setIsPlanning(true);
    setBreakdownError(null);
    setBreakdownMessage('Saving your goal and generating a complete AI plan...');
    try {
      const task = await createTask({ title: effectiveTask, capacity });
      let planError: string | undefined;
      try { await apiClient.generatePlan(task.id, task.version); }
      catch (error) { planError = error instanceof Error ? error.message : 'Gemini could not generate a plan. Retry.'; }
      navigate(`/tasks/${task.id}`, { state: { freshTask: true, planError } });
    } catch (error: unknown) {
      setBreakdownMessage(null);
      setBreakdownError(error instanceof Error ? error.message : 'Could not save your task. Please try again.');
    } finally { createRef.current = false; setIsPlanning(false); }
  };

  const handleResumeStep = () => {
    if (activeTask) {
      navigate(`/tasks/${activeTask.id}`);
    } else {
      navigate('/tasks/all');
    }
  };

  const handleRest = async () => {
    if (activeTask) {
      try {
        await updateTask(activeTask.id, { status: 'paused' });
      } catch {
        // non-blocking
      }
    }
    setIsResting(true);
    navigate('/rest');
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-md">
      {/* Ambient Header */}
      <section className="relative w-full rounded-2xl bg-gradient-to-br from-tertiary-fixed/30 via-primary-fixed/20 to-surface-container-low p-space-md shadow-[0_2px_12px_-2px_rgba(82,101,232,0.06)] overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary-fixed/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-space-xs z-10">
          <div className="flex items-center justify-between gap-space-sm mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-lowest shadow-sm text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              {isAuthenticated ? 'Synced' : 'Guest Mode'}
            </span>
            <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">spa</span>
              Gentle Mode
            </span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold tracking-tight">
            {greeting}, {displayName}. What feels manageable today?
          </h1>
          <p className="font-body-md text-body-md text-secondary leading-relaxed">
            Every meaningful journey begins with one small step. Zero shame.
          </p>
        </div>
      </section>

      {/* SECTION 1: Start a New Task */}
      <section className="flex flex-col rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_20px_-2px_rgba(23,33,61,0.05)] border border-surface-container-high/60 relative overflow-hidden">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight font-semibold">Start a New Task</h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant">We'll break it down into gentle steps</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">bolt</span> AI Planning
          </span>
        </div>

        {/* Quick Capacity Selector */}
        <div className="flex flex-col gap-1.5 my-space-xs">
          <span className="font-label-sm text-label-sm text-secondary font-medium">Your current energy right now:</span>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Energy capacity levels">
            {(['low', 'medium', 'high'] as const).map((cap) => (
              <button
                key={cap}
                type="button"
                id={`cap-btn-${cap}`}
                onClick={() => setCapacity(cap)}
                aria-pressed={capacity === cap}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-full font-label-sm text-label-sm transition-all active:scale-95 capitalize ${
                  capacity === cap
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-sm font-semibold ring-1 ring-tertiary/20'
                    : 'bg-surface-container text-secondary hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {cap === 'low' ? 'bedtime' : cap === 'medium' ? 'grain' : 'psychology'}
                </span>
                {cap}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">Generating a plan sends your goal to Google Gemini. You can review the saved plan before starting.</p>
        {/* Task Input */}
        <form onSubmit={handleBreakdown} className="flex flex-col gap-2 mt-space-sm">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
              <span className="material-symbols-outlined text-[20px]">drive_file_rename_outline</span>
            </span>
            <input
              id="task-input-field"
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g., Complete Python Assignment"
              maxLength={255}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            id="breakdown-btn"
            disabled={isMutating || isPlanning}
            className="w-full h-11 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(82,101,232,0.25)] hover:opacity-95 active:scale-98 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">view_timeline</span>
            {taskInput.trim() ? 'Break this down gently' : 'Enter a task to break down'}
          </button>

          {breakdownMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-body-sm text-body-sm mt-1 animate-fadeIn">
              <span className="material-symbols-outlined text-[16px] text-primary animate-spin">progress_activity</span>
              <span>{breakdownMessage}</span>
            </div>
          )}
          {breakdownError && (
            <p role="alert" className="font-body-sm text-body-sm text-error">{breakdownError}</p>
          )}
        </form>
      </section>

      {/* SECTION 2: Continue Where You Left Off */}
      {activeTask && (
        <section className="flex flex-col rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_4px_20px_-2px_rgba(23,33,61,0.05)] border border-surface-container-high/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
              <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">In Progress</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1 shadow-sm capitalize">
              <span className="material-symbols-outlined text-[13px]">{activeTask.capacity === 'low' ? 'bedtime' : activeTask.capacity === 'medium' ? 'grain' : 'bolt'}</span>
              {activeTask.capacity} capacity
            </span>
          </div>

          <div className="mt-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">{activeTask.title}</h3>
            {activeTask.notes && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">{activeTask.notes}</p>
            )}
          </div>

          {/* Next Step Highlight */}
          {nextStep && (
            <div className="mt-space-sm p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-2 relative">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-secondary-container flex-shrink-0 flex items-center justify-center text-primary mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-primary font-semibold">
                    Next Step — Est. {Math.round(nextStep.estimatedDuration / 60)} min
                  </span>
                  <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">{nextStep.title}</p>
                </div>
              </div>
              {activeTask.steps.length > 0 && (
                <div className="flex items-center justify-between text-secondary font-label-sm text-label-sm mt-1">
                  <span>
                    {activeTask.steps.filter(s => s.status === 'completed').length} of {activeTask.steps.filter(s => s.status !== 'skipped').length} steps done
                  </span>
                  <span>{Math.round((activeTask.steps.filter(s => s.status === 'completed').length / Math.max(1, activeTask.steps.filter(s => s.status !== 'skipped').length)) * 100)}%</span>
                </div>
              )}
              {activeTask.steps.length > 0 && (
                <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((activeTask.steps.filter(s => s.status === 'completed').length / Math.max(1, activeTask.steps.filter(s => s.status !== 'skipped').length)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-space-sm mt-space-md">
            <button
              onClick={handleResumeStep}
              className="h-11 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(55,74,206,0.3)] hover:opacity-95 active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              <span>Resume</span>
            </button>
            <button
              onClick={handleRest}
              disabled={isMutating || isPlanning}
              className="h-11 rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg flex items-center justify-center gap-1.5 hover:bg-surface-variant active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">self_improvement</span>
              <span>Rest</span>
            </button>
          </div>

          {isResting && (
            <div className="mt-2 p-2 rounded-lg bg-surface-container text-on-surface-variant font-body-sm text-body-sm text-center animate-fadeIn">
              Step safely tucked away. Your place is saved.
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: Gentle Daily Summary (Live Counts) */}
      <section className="flex flex-col rounded-2xl bg-surface-container-low p-space-md shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between mb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">filter_vintage</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Gentle Summary</h3>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Today</span>
        </div>

        <div className="grid grid-cols-2 gap-space-sm my-space-xs">
          <div className="p-space-sm rounded-xl bg-surface-container-lowest flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <span className="material-symbols-outlined text-[18px]">footprint</span>
              <span className="font-label-sm text-label-sm">Active</span>
            </div>
            {countsError && (
              <div role="alert" className="flex items-center justify-between gap-3 text-error font-body-sm text-body-sm">
                <span>{countsError}</span>
                <button type="button" onClick={fetchTaskCounts} className="underline">Retry</button>
              </div>
            )}
            <span className="font-headline-lg-mobile text-headline-lg-mobile font-semibold text-on-surface">
              {countsLoading ? '—' : counts?.active ?? 0}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">tasks in progress</span>
          </div>

          <div className="p-space-sm rounded-xl bg-surface-container-lowest flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 text-secondary mb-1">
              <span className="material-symbols-outlined text-[18px]">pause_circle</span>
              <span className="font-label-sm text-label-sm">Paused</span>
            </div>
            <span className="font-headline-lg-mobile text-headline-lg-mobile font-semibold text-on-surface">
              {countsLoading ? '—' : counts?.paused ?? 0}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">resting safely</span>
          </div>

          <div className="p-space-sm rounded-xl bg-surface-container-lowest flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span className="font-label-sm text-label-sm">Completed</span>
            </div>
            <span className="font-headline-lg-mobile text-headline-lg-mobile font-semibold text-on-surface">
              {countsLoading ? '—' : counts?.completed ?? 0}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">finished gently</span>
          </div>

          <div className="p-space-sm rounded-xl bg-surface-container-lowest flex flex-col shadow-sm">
            <div className="flex items-center gap-1.5 text-tertiary mb-1">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span className="font-label-sm text-label-sm">Total</span>
            </div>
            <span className="font-headline-lg-mobile text-headline-lg-mobile font-semibold text-on-surface">
              {countsLoading ? '—' : counts?.total ?? 0}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">tasks ever created</span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm p-3 rounded-xl bg-primary-fixed/40 mt-1">
          <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">favorite</span>
          </div>
          <p className="font-body-md text-body-md text-on-primary-fixed-variant font-medium">
            You showed up. That is what counts.
          </p>
        </div>
      </section>

      {/* SECTION 4: Recent Tasks List */}
      <section className="flex flex-col gap-space-sm mt-space-xs">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Recent Tasks</h3>
          <button
            onClick={() => navigate('/tasks/all')}
            className="font-label-sm text-label-sm text-primary flex items-center gap-0.5 hover:underline"
          >
            View all
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        {tasks.length === 0 && !countsLoading ? (
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high/40 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-tertiary">spa</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">No tasks yet. Ready to add your first one?</p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-1 h-9 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center gap-1.5 hover:bg-primary transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">add</span> Create Task
            </button>
          </div>
        ) : (
          tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container-high/40 flex items-center justify-between gap-space-sm transition-transform active:scale-[0.99] cursor-pointer hover:bg-surface-container-lowest/80"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${task.id}`)}
            >
              <div className="flex items-start gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    {task.capacity === 'low' ? 'bedtime' : task.capacity === 'medium' ? 'grain' : 'bolt'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="font-label-lg text-label-lg text-on-surface truncate font-semibold">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm capitalize">
                      {task.capacity} capacity
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">task_alt</span>
                      {task.steps.filter(s => s.status === 'completed').length}/{task.steps.filter(s => s.status !== 'skipped').length} steps
                    </span>
                  </div>
                </div>
              </div>
              <button
                aria-label={`Open ${task.title}`}
                onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}`); }}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary hover:bg-secondary-container transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
