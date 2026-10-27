import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import type { TaskStatus } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, apiClient } = useAuth();
  const {
    currentTask,
    currentTaskLoading,
    currentTaskError,
    suggestedStep,
    suggestedStepLoading,
    suggestedStepError,
    isMutating,
    fetchTaskById,
    updateTask,
    fetchSuggestedStep,
    markStepComplete,
    startSuggestedStep,
    clearCurrentTask,
  } = useTask();

  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const routeState = location.state as {
    freshTask?: boolean;
    planError?: string;
    taskUpdated?: boolean;
    feedbackNotice?: string;
    historyPlanMissing?: boolean;
  } | null;
  const isFreshTask = routeState?.freshTask === true;
  const taskUpdated = routeState?.taskUpdated === true;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (id) {
      clearCurrentTask();
      fetchTaskById(id).then((task) => {
        if (task) setPlanError(routeState?.planError || null);
      });
    }
    return () => clearCurrentTask();
  }, [id, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = async () => {
    if (!currentTask) return;
    const newStatus: TaskStatus = currentTask.status === 'paused' ? 'active' : 'paused';
    try {
      await updateTask(currentTask.id, { status: newStatus });
      showToast(newStatus === 'paused' ? 'Task paused safely. Your place is saved.' : 'Welcome back! Resuming gently.');
    } catch {
      showToast('Could not update task status. Please try again.');
    }
  };

  const handleComplete = async () => {
    if (!currentTask) return;
    try {
      await updateTask(currentTask.id, { status: 'completed' });
      showToast('Task completed. Well done — every step counts.');
      setTimeout(() => navigate('/completed'), 1600);
    } catch {
      showToast('Could not mark task complete. Please try again.');
    }
  };

  const handleStepDone = async (stepId: string) => {
    if (!id) return;
    try {
      await markStepComplete(id, stepId);
      showToast('Step accomplished! Momentum logged.');
    } catch {
      showToast('Could not mark step complete. Please try again.');
    }
  };

  const handleStartSuggestedStep = async () => {
    if (!id || !currentTask || !suggestedStep || isMutating) return;
    try {
      const step = await startSuggestedStep(id, suggestedStep);
      navigate(`/step-sequencer?taskId=${currentTask.id}`, {
        state: {
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          capacity: currentTask.capacity,
          stepId: step.id,
          stepTitle: step.title,
          stepReason: step.reason,
          stepDuration: step.estimatedDuration,
          stepOrder: step.order,
          stepSource: suggestedStep.source,
          stepNotice: suggestedStep.fallbackNotice,
        },
      });
    } catch {
      showToast('Could not save this step yet. Please try again.');
    }
  };

  const handleContinueStep = async () => {
    if (!currentTask || !nextStep || isMutating) return;
    try {
      if (currentTask.status === 'paused') {
        await updateTask(currentTask.id, { status: 'active' });
      }
      navigate(`/step-sequencer?taskId=${currentTask.id}`, {
        state: {
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          capacity: currentTask.capacity,
          stepId: nextStep.id,
          stepTitle: nextStep.title,
          stepReason: nextStep.reason,
          stepInstruction: nextStep.instruction,
          stepSource: nextStep.source || undefined,
          stepDuration: nextStep.estimatedDuration,
          stepOrder: nextStep.order,
        },
      });
    } catch {
      showToast('Could not resume this step. Please try again.');
    }
  };

  const handleGetNewSuggestion = () => {
    if (id && !suggestedStepLoading) {
      const nextIndex = (suggestionIndex + 1) % 5;
      setSuggestionIndex(nextIndex);
      fetchSuggestedStep(id, nextIndex);
    }
  };

  // Loading state
  if (currentTaskLoading) {
    return (
      <div className="flex flex-col w-full gap-space-md animate-pulse">
        <div className="h-4 w-24 bg-surface-container-high rounded" />
        <div className="h-40 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60" />
        <div className="h-32 rounded-xl bg-surface-container-low" />
      </div>
    );
  }

  // Error state
  if (currentTaskError || (!currentTask && !currentTaskLoading)) {
    return (
      <div className="flex flex-col w-full gap-space-md items-center py-12 text-center">
        <span className="material-symbols-outlined text-[40px] text-tertiary">search_off</span>
        <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Task not found</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
          {currentTaskError || 'This task may have been removed or does not belong to your account.'}
        </p>
        <button
          type="button"
          onClick={() => id && fetchTaskById(id)}
          className="mt-2 h-10 px-4 rounded-xl border border-surface-container-high text-primary font-label-md text-label-md"
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/tasks/all')}
          className="mt-4 h-11 px-5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-2 hover:bg-primary transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Tasks
        </button>
      </div>
    );
  }

  const task = currentTask!;
  const planSteps = task.steps.filter(s => s.status !== 'skipped');
  const pendingSteps = task.steps.filter(s => s.status === 'pending');
  const completedSteps = task.steps.filter(s => s.status === 'completed');
  const nextStep = pendingSteps[0];
  const progressPct = planSteps.length > 0 ? Math.round((completedSteps.length / planSteps.length) * 100) : 0;

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-primary-fixed text-on-primary-fixed',
    paused: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    archived: 'bg-surface-container-high text-on-surface-variant',
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-secondary dark:text-outline-variant">
        <Link to="/tasks/all" className="hover:underline flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Tasks
        </Link>
        <span>/</span>
        <Link to="/history" className="hover:underline">History</Link>
        <span>/</span>
        <span className="text-on-surface dark:text-inverse-on-surface font-semibold truncate">{task.title}</span>
      </div>

      {/* Fresh task celebration */}
      {isFreshTask && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">celebration</span>
          <p className="font-body-sm text-body-sm text-emerald-800 dark:text-emerald-300">
            Task saved. Review your AI plan before starting.
          </p>
        </div>
      )}
      {taskUpdated && (
        <div role="status" aria-live="polite" className="rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container font-body-sm text-body-sm">
          Changes saved. Your next suggestion now reflects the updated task and capacity.
        </div>
      )}
      {routeState?.feedbackNotice && (
        <div role="status" aria-live="polite" className="rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container font-body-sm text-body-sm">
          {routeState.feedbackNotice} A fresh next-step suggestion is being prepared.
        </div>
      )}

      {routeState?.historyPlanMissing && (
        <p role="status" className="rounded-xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          This task has no saved actionable steps. Your task and any recorded completion history are still here. You can review the task and explicitly choose to generate a plan below.
        </p>
      )}

      {(!task.planModel || routeState?.historyPlanMissing) && task.status !== 'completed' && task.status !== 'archived' && <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3">
        <p>Your goal and notes will be sent to Google Gemini to generate an ordered plan.</p>
        {routeState?.historyPlanMissing && <p className="text-sm">Plan generation is optional. It will keep completed records and add new steps only after you choose the action.</p>}
        {planError && <p role="alert">{planError}</p>}
        <button className="h-11 rounded-xl bg-primary-container text-on-primary-container" disabled={isPlanning} onClick={async () => {
          setIsPlanning(true); setPlanError(null);
          try { await apiClient.generatePlan(task.id, task.version); await fetchTaskById(task.id); }
          catch (error) { setPlanError(error instanceof Error ? error.message : 'Generation failed. Please retry.'); }
          finally { setIsPlanning(false); }
        }}>{isPlanning ? 'Generating AI plan...' : 'Generate AI plan / Retry'}</button>
      </div>}
      {task.planModel && <div className="p-4 rounded-xl bg-secondary-container/40 flex flex-col gap-2">
        <p className="font-semibold">{task.planGuidance ? 'AI + Strategy Guidance' : 'AI Generated'}</p>
        <p>{task.description}</p>
        {task.originalInput && <p className="text-xs">Original goal: {task.originalInput}</p>}
        {!nextStep && completedSteps.length > 0 && <p role="status">Plan complete. You can explicitly mark the overall task complete.</p>}
        {!nextStep && completedSteps.length === 0 && <p role="status">No incomplete saved steps are available in this plan. Review it before deciding whether to add steps.</p>}
      </div>}
      {/* Task Header Card */}
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm capitalize ${STATUS_BADGE[task.status] || 'bg-surface-container text-secondary'}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm capitalize">
                {task.capacity} capacity
              </span>
            </div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
              {task.title}
            </h1>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
              Created for gentle pacing • No streak penalties
            </p>
          </div>

          <button
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
            className="h-10 px-4 rounded-xl border border-surface-container-high text-secondary dark:text-outline-variant hover:bg-surface-container-low transition-colors text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit</span>
          </button>
        </div>

        {/* Context Notes */}
        {task.notes && (
          <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-secondary dark:text-outline-variant flex flex-col gap-1">
            <span className="font-semibold text-on-surface dark:text-inverse-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">notes</span>
              Context &amp; Breadcrumbs:
            </span>
            <p>{task.notes}</p>
          </div>
        )}

        {/* Progress bar (only when steps exist) */}
        {task.steps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-secondary dark:text-outline-variant">
              <span>{completedSteps.length}/{planSteps.length} steps done</span>
              <span className="font-semibold text-primary">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {task.status !== 'completed' && task.status !== 'archived' && nextStep && (
            <button
              onClick={nextStep ? handleContinueStep : handleStartSuggestedStep}
              disabled={isMutating || (!nextStep && (!suggestedStep || task.status === 'paused'))}
              className="w-full sm:flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
              <span>{nextStep ? (task.status === 'paused' ? 'Resume Step' : 'Continue Step') : 'Start Next Small Step'}</span>
            </button>
          )}
          {task.status !== 'completed' && task.status !== 'archived' && (
            <button
              onClick={handlePause}
              disabled={isMutating}
              className="w-full sm:w-auto px-5 h-12 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
            >
              {task.status === 'paused' ? 'Resume from Pause' : 'Pause Safely'}
            </button>
          )}
          {task.status === 'active' && (
            <button
              onClick={handleComplete}
              disabled={isMutating}
              className="w-full sm:w-auto px-5 h-12 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 font-label-md text-label-md hover:bg-emerald-200 transition-colors"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Step suggestion — shown when there is no pending step */}
      {!nextStep && task.status === 'active' && (suggestedStep || suggestedStepLoading || suggestedStepError) && (
        <div className="rounded-2xl bg-gradient-to-br from-secondary-container/40 to-surface-container-lowest border border-secondary-container p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">auto_awesome</span>
              <span className="font-label-md text-label-md font-semibold text-on-surface">Suggested First Step</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${
                suggestedStep?.source === 'GEMINI'
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
              title={suggestedStep?.fallbackNotice ?? 'Step suggestion source is loading.'}
            >
              {suggestedStep?.source === 'GEMINI'
                ? 'Gemini Suggestion'
                : suggestedStep?.source === 'LOCAL_RAG'
                  ? 'Local Library Match'
                  : 'Local Fallback'}
            </span>
          </div>

          {suggestedStepLoading ? (
            <div className="animate-pulse flex flex-col gap-2">
              <div className="h-5 bg-surface-container-high rounded w-3/4" />
              <div className="h-4 bg-surface-container rounded w-full" />
            </div>
          ) : suggestedStepError ? (
            <div role="alert" className="flex items-center justify-between gap-3 text-error font-body-sm text-body-sm">
              <span>{suggestedStepError}</span>
              <button type="button" onClick={() => id && fetchSuggestedStep(id)} className="underline">Retry</button>
            </div>
          ) : suggestedStep ? (
            <>
              <div
                id="suggested-step-title"
                className="font-headline-sm text-headline-sm font-semibold text-on-surface leading-snug"
              >
                {suggestedStep.title}
              </div>
              <button
                type="button"
                onClick={() => setAccordionOpen(!accordionOpen)}
                className="flex items-center gap-1.5 text-primary font-label-sm text-label-sm"
                aria-expanded={accordionOpen}
              >
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                Why this step?
                <span className={`material-symbols-outlined text-[14px] transition-transform ${accordionOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {accordionOpen && (
                <p className="font-body-sm text-body-sm text-on-surface-variant animate-fadeIn">{suggestedStep.reason}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Est. {Math.round(suggestedStep.estimatedDuration / 60)} min
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGetNewSuggestion}
                    disabled={suggestedStepLoading}
                    className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Try another
                  </button>
                  <button
                    onClick={handleStartSuggestedStep}
                    disabled={isMutating}
                    className="h-9 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center gap-1.5 hover:bg-primary transition-colors shadow-sm disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                    Start this step
                  </button>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-outline/70 text-[10px]">{suggestedStep.fallbackNotice}</p>
            </>
          ) : null}
        </div>
      )}

      {/* Atomic Steps Outline */}
      {task.steps.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface px-1">
            Atomic Steps ({completedSteps.length} complete · {task.steps.filter((step) => step.status === 'skipped').length} set aside)
          </h2>
          <div className="flex flex-col gap-2">
            {task.steps.map((st) => (
              <div
                key={st.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  st.status === 'completed'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30 opacity-70'
                    : st.status === 'skipped'
                    ? 'bg-surface-container-low/60 dark:bg-surface-container-low/20 border-surface-container-high/40 opacity-70'
                    : st === nextStep
                    ? 'bg-surface-container-lowest dark:bg-surface-container-lowest/50 border-primary/40 shadow-sm'
                    : 'bg-surface-container-low/60 dark:bg-surface-container-low/20 border-surface-container-high/40 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      st.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : st === nextStep
                        ? 'bg-primary-container text-on-primary-container'
                          : st.status === 'skipped'
                          ? 'bg-surface-container text-outline'
                          : 'bg-surface-container text-secondary'
                    }`}
                  >
                    {st.status === 'completed'
                      ? <span className="material-symbols-outlined text-[14px]">check</span>
                      : st.status === 'skipped'
                      ? <span className="material-symbols-outlined text-[14px]">remove</span>
                      : st.order}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-label-md text-label-md font-medium truncate ${
                      st.status === 'completed'
                        ? 'line-through text-on-surface-variant'
                        : st.status === 'skipped'
                          ? 'text-outline'
                          : 'text-on-surface dark:text-inverse-on-surface'
                    }`}>
                      {st.title}
                    </span>
                    {st.instruction && <p className="text-sm whitespace-normal">{st.instruction}</p>}
                    {st.reason && <p className="text-xs whitespace-normal">Why: {st.reason}</p>}
                    {st.researchSuggestions?.map((suggestion, index) => <p className="text-xs whitespace-normal" key={index}>Research: {suggestion}</p>)}
                    <span className="text-[11px] text-secondary dark:text-outline-variant">
                      {Math.round(st.estimatedDuration / 60)} min {st.effort && ` ? ${st.effort} effort`}
                      {st.strategy && ` • ${st.strategy.replace(/_/g, ' ')}`}
                      {st.source && ` • ${st.source === 'GEMINI' ? 'Gemini' : st.source === 'LOCAL_RAG' ? 'local library' : 'local fallback'}`}
                    </span>
                  </div>
                </div>

                {st.status === 'pending' && (
                  <button
                    onClick={() => handleStepDone(st.id)}
                    disabled={isMutating}
                    aria-label={`Mark "${st.title}" as done`}
                    className="w-8 h-8 rounded-full border border-surface-container-high text-secondary hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300 transition-colors shrink-0 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                )}
                {st.status === 'completed' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[11px] font-semibold shrink-0">
                    Done
                  </span>
                )}
                {st.status === 'skipped' && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold shrink-0">
                    Set aside
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-fadeIn"
        >
          <div className="px-4 py-2 rounded-full bg-inverse-surface text-inverse-on-surface font-label-md text-label-md flex items-center gap-2 shadow-lg">
            <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
};
