import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTask } from '../context/TaskContext';

export const RestResumePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { taskTitle?: string }) || {};
  const { tasks, isLoading, isMutating, error, fetchTasks, updateTask } = useTask();
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTasks({ status: 'paused', page: 1, page_size: 20 });
  }, [fetchTasks]);

  const handleResume = async (task: (typeof tasks)[number]) => {
    try {
      setResumeError(null);
      const resumed = task.status === 'paused'
        ? await updateTask(task.id, { status: 'active' })
        : task;
      const pendingStep = resumed.steps.find((step) => step.status === 'pending');
      if (pendingStep) {
        navigate(`/step-sequencer?taskId=${resumed.id}`, {
          state: {
            taskId: resumed.id,
            taskTitle: resumed.title,
            capacity: resumed.capacity,
            stepId: pendingStep.id,
            stepTitle: pendingStep.title,
            stepReason: pendingStep.reason,
            stepInstruction: pendingStep.instruction,
            stepSource: pendingStep.source || undefined,
            stepDuration: pendingStep.estimatedDuration,
            stepOrder: pendingStep.order,
          },
        });
      } else {
        navigate(`/tasks/${resumed.id}`);
      }
    } catch (err: unknown) {
      setResumeError(err instanceof Error ? err.message : 'Could not resume this task yet.');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-lg text-center items-center py-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-1.5 self-center px-3 py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">spa</span>
          <span>Self-Care Sanctuary</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
          Rest Is Productive Too.
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant max-w-sm">
          Your tasks and current step are safely frozen in time. Take all the space you need.
        </p>
      </div>

      <div className="my-6 flex items-center justify-center">
        <div className="w-36 h-36 rounded-full bg-secondary-container dark:bg-secondary-container/40 flex flex-col items-center justify-center text-primary shadow-sm p-4">
          <span className="material-symbols-outlined text-[32px] mb-1">spa</span>
          <span className="font-label-md text-label-md font-semibold">Rest, your way</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-secondary dark:text-outline-variant max-w-sm leading-relaxed">
        <strong>Pacing preserved:</strong> Your task and unfinished step are saved. There is no timer or required breathing exercise.
      </div>

      {resumeError && <p role="alert" className="w-full rounded-xl bg-error-container px-4 py-3 text-on-error-container text-sm">{resumeError}</p>}
      {error && <p role="alert" className="w-full rounded-xl bg-error-container px-4 py-3 text-on-error-container text-sm">{error}</p>}

      <div className="flex flex-col gap-3 w-full" aria-live="polite">
      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface text-left">
        Paused tasks
      </h2>
      {isLoading ? (
        <p role="status" className="text-left text-sm text-on-surface-variant">Loading saved pauses…</p>
      ) : tasks.filter((task) => task.status === 'paused').length === 0 ? (
        <p className="text-left text-sm text-on-surface-variant">
          No paused tasks right now{state.taskTitle ? ` for ${state.taskTitle}` : ''}. Your unfinished task remains available in your task list.
        </p>
      ) : (
        tasks.filter((task) => task.status === 'paused').map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => void handleResume(task)}
            disabled={isMutating}
            className="w-full min-h-12 rounded-xl bg-surface-container-low px-4 py-3 text-left text-on-surface hover:bg-surface-container border border-surface-container-high"
          >
            <span className="block font-semibold">{task.title}</span>
            <span className="block text-sm text-on-surface-variant capitalize">{task.capacity} capacity · place saved</span>
          </button>
        ))
      )}
      </div>

      <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => navigate('/tasks/all')}
          className="w-full h-11 rounded-xl bg-surface-container-low dark:bg-surface-container text-secondary font-label-md text-label-md hover:text-on-surface transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
