import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTask } from '../context/TaskContext';
import type { StepFeedbackAction } from '@steplight/shared';
import { FocusTimer } from '../components/FocusTimer';
import { defaultFocusDuration } from '../utils/focusTimer';

interface LocationState {
  taskId?: string;
  taskTitle?: string;
  capacity?: string;
  stepId?: string;
  stepTitle?: string;
  stepReason?: string;
  stepInstruction?: string;
  stepDuration?: number;
  stepOrder?: number;
  stepSource?: 'GEMINI' | 'LOCAL_RAG' | 'LOCAL_FALLBACK';
  stepNotice?: string;
}

export const StepSequencerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as LocationState) || {};
  const {
    submitStepFeedback,
    fetchTaskById,
    isMutating,
  } = useTask();

  const [state, setState] = useState<LocationState>(routeState);
  const queryTaskId = new URLSearchParams(location.search).get('taskId');
  const routeTaskId = routeState.taskId || queryTaskId || undefined;
  const routeStepId = routeState.stepId;
  useEffect(() => {
    if (!routeTaskId) return;
    let active = true;
    Promise.resolve(fetchTaskById(routeTaskId)).then(task => {
      if (!active || !task) return;
      const requestedStep = routeStepId
        ? task.steps.find(step => step.id === routeStepId && step.status === 'pending')
        : undefined;
      const pending = requestedStep || task.steps.find(step => step.status === 'pending');
      if (!pending) { navigate(`/tasks/${task.id}`, { replace: true }); return; }
      setState({ taskId: task.id, taskTitle: task.title, capacity: task.capacity,
        stepId: pending.id, stepTitle: pending.title, stepReason: pending.reason,
        stepInstruction: pending.instruction, stepDuration: pending.estimatedDuration,
        stepOrder: pending.order, stepSource: pending.source || undefined });
    });
    return () => { active = false; };
  }, [routeTaskId, routeStepId, fetchTaskById, navigate]);
  const taskId = state.taskId;
  const taskTitle = state.taskTitle || 'Your Current Task';
  const capacity = state.capacity || 'low';
  const stepId = state.stepId;
  const stepTitle = state.stepTitle || 'Choose a saved task to begin';
  const stepReason = state.stepReason || '';
  const stepDuration = defaultFocusDuration(state.stepDuration, capacity).seconds;
  const stepSource = state.stepSource;

  const isLiveStep = !!taskId && !!stepId;

  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestKeyRef = useRef<{ action: StepFeedbackAction; stepId?: string; key: string } | null>(null);

  const sendFeedback = async (action: StepFeedbackAction) => {
    if (!taskId) return null;
    const requestKey = requestKeyRef.current;
    const key = requestKey && requestKey.action === action && requestKey.stepId === stepId
      ? requestKey.key
      : globalThis.crypto.randomUUID();
    requestKeyRef.current = { action, stepId, key };
    const result = await submitStepFeedback(
      taskId,
      { action, stepId },
      key
    );
    requestKeyRef.current = null;
    setActionError(null);
    return result;
  };

  const handleDone = async () => {
    if (isDone || !isLiveStep) return;
    setIsDone(true);

    try {
      const result = await sendFeedback('done');
      if (!result) return;
      navigate(`/tasks/${taskId}`, { state: { feedbackNotice: result.message } });
    } catch (err: unknown) {
      setIsDone(false);
      setActionError(err instanceof Error ? err.message : 'Could not save this step yet.');
    }
  };

  const handleMakeSmaller = async () => {
    if (!isLiveStep) return;
    try {
      const result = await sendFeedback('cant');
      if (!result?.step) return;
      navigate('/adaptive-step', {
        state: {
          taskId,
          taskTitle,
          previousStep: stepTitle,
          capacity,
          stepId: result.step.id,
          stepTitle: result.step.title,
          stepReason: result.step.reason,
          stepInstruction: result.step.instruction,
          stepSource: result.step.source || undefined,
          stepDuration: result.step.estimatedDuration,
          stepOrder: result.step.order,
        },
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not make this step smaller yet.');
    }
  };

  const handleAnother = async () => {
    if (!isLiveStep) return;
    try {
      await sendFeedback('another');
      navigate(`/tasks/${taskId}`);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not generate an alternative. Retry.'); }
  };

  const handleRest = async () => {
    if (taskId) {
      try {
        await sendFeedback('rest');
        navigate('/rest', { state: { taskId, taskTitle, stepId } });
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Could not save your pause yet.');
      }
    } else {
      navigate('/rest');
    }
  };

  const handleChange = async () => {
    if (taskId && isLiveStep) {
      try {
        await sendFeedback('change');
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Could not save this change request yet.');
        return;
      }
      navigate(`/tasks/${taskId}/edit`);
      return;
    }
    navigate('/tasks');
  };

  const handleDismiss = async () => {
    if (taskId) {
      try {
        await sendFeedback('dismiss');
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Could not dismiss this screen yet.');
        return;
      }
    }
    navigate('/');
  };

  const durationLabel = stepDuration < 60
    ? `${stepDuration} sec`
    : `${Math.round(stepDuration / 60)} min`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col pb-8">
      {isLiveStep && stepSource === 'GEMINI' && <button className="h-10 rounded-xl bg-secondary-container text-primary mb-3" disabled={isMutating} onClick={handleAnother}>Try another AI action</button>}
      {/* Capacity & Context Header */}
      <div className="flex items-center justify-between gap-space-sm mb-space-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary-container shrink-0" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">
            {taskTitle}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-secondary-fixed-variant shrink-0 shadow-sm border border-surface-container-highest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-label-sm text-label-sm capitalize">{capacity} Capacity</span>
        </div>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
        Your Next Small Step — zero overwhelm, just this one moment.
      </p>

      {/* Central Hero AI Action Card */}
      <div className="relative w-full rounded-2xl bg-gradient-to-b from-primary-fixed/20 via-surface-container-lowest to-surface-container-lowest p-space-lg shadow-xl shadow-primary-container/5 border border-primary-fixed/40 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-tertiary-fixed/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-space-md">
          {/* Top Tagline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-secondary-container/60 text-primary-container flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[20px] filled">auto_awesome</span>
              </div>
              <span className="font-label-md text-label-md text-primary font-semibold tracking-wide uppercase">
                {isLiveStep ? 'One Atomic Motion' : 'Suggested Motion'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {stepSource && (
                <span
                  className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm text-[10px] ${
                    stepSource === 'GEMINI'
                      ? 'bg-primary-fixed text-primary'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                  title={state.stepNotice}
                >
                  {stepSource === 'GEMINI'
                    ? 'AI Generated'
                    : stepSource === 'LOCAL_RAG'
                      ? 'Local Library Match'
                      : 'Local Fallback'}
                </span>
              )}
              <div className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant flex items-center gap-1 border border-surface-container">
                <span className="material-symbols-outlined text-[14px]">timer</span>
                <span className="font-label-sm text-label-sm">{durationLabel}</span>
              </div>
            </div>
          </div>

          {/* Core Step Text */}
          <div className="my-space-xs">
            <h1
              id="step-title"
              className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold leading-tight tracking-tight"
            >
              {stepTitle}
            </h1>
            {state.stepInstruction && <p className="font-body-md text-body-md text-on-surface mt-3">{state.stepInstruction}</p>}
          </div>

          {/* Strategy Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low w-fit max-w-full border border-surface-container-high/50">
            <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0">psychology</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {isLiveStep
                ? 'Live step from your task plan'
                : stepSource === 'GEMINI'
                  ? 'Suggested with Gemini after opt-in'
                  : stepSource === 'LOCAL_RAG'
                    ? 'Suggested from the local reviewed library'
                    : 'Suggested one-step action'}
            </span>
          </div>

          {/* Why This Step? Accordion */}
          {stepReason && (
            <div className="flex flex-col rounded-xl bg-surface-container-low transition-all duration-200 overflow-hidden border border-surface-container-high/40">
              <button
                type="button"
                id="accordion-btn"
                aria-expanded={accordionOpen}
                onClick={() => setAccordionOpen(!accordionOpen)}
                className="flex items-center justify-between w-full px-3.5 py-2.5 text-left transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 text-primary font-label-md text-label-md font-semibold">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  <span>Why This Step?</span>
                </div>
                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${accordionOpen ? 'rotate-180' : 'rotate-0'}`}>
                  expand_more
                </span>
              </button>
              {accordionOpen && (
                <div className="px-3.5 pb-3 pt-0.5 animate-fadeIn">
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{stepReason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Micro-Progress Badges */}
      <div className="mt-space-lg mb-space-md grid grid-cols-3 gap-space-sm">
        <div className="flex flex-col p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40">
          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-[16px]">psychiatry</span>
            <span className="font-label-sm text-label-sm">Friction</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface font-semibold">Gentle Start</span>
        </div>
        <div className="flex flex-col p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40">
          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-[16px]">battery_horiz_075</span>
            <span className="font-label-sm text-label-sm">Battery</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface font-semibold capitalize">{capacity}</span>
        </div>
        <div className="flex flex-col p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40">
          <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span className="font-label-sm text-label-sm">Expectation</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface font-semibold">Zero Pressure</span>
        </div>
      </div>

      {isLiveStep && taskId && stepId && <FocusTimer
        taskId={taskId}
        stepId={stepId}
        stepTitle={stepTitle}
        stepInstruction={state.stepInstruction}
        estimatedDurationSeconds={state.stepDuration}
        capacity={capacity}
        busy={isMutating || isDone}
        onMarkComplete={handleDone}
        onTakeRest={handleRest}
      />}

      {/* Interactive Controls */}
      <div className="flex flex-col gap-space-sm mt-space-sm">
        <button
          type="button"
          id="btn-done"
          onClick={handleDone}
          disabled={isDone || isMutating || !isLiveStep}
          className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center gap-2 font-label-lg text-label-lg shadow-md shadow-primary-container/20 transition-all active:scale-[0.98] hover:bg-primary font-semibold disabled:opacity-60"
        >
          {isDone || isMutating ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Done — Get Next Step</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-space-sm">
          <button
            type="button"
            id="btn-cant"
            onClick={handleMakeSmaller}
            disabled={isMutating || !isLiveStep}
            className="h-11 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center gap-1.5 font-label-md text-label-md transition-all active:scale-[0.98] hover:bg-surface-container-highest border border-surface-container-highest font-medium"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">grain</span>
            <span>Can't • Make Smaller</span>
          </button>

          <button
            type="button"
            id="btn-rest"
            onClick={handleRest}
            disabled={isMutating}
            className="h-11 rounded-xl bg-secondary-container/70 text-on-secondary-fixed flex items-center justify-center gap-1.5 font-label-md text-label-md transition-all active:scale-[0.98] hover:bg-secondary-container font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">bedtime</span>
            <span>Rest for Now</span>
          </button>
        </div>

        <div className="flex items-center justify-between px-space-xs pt-space-xs">
          <button
            type="button"
            id="btn-change"
              onClick={handleChange}
              disabled={isMutating}
            className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm transition-colors hover:text-on-surface py-2 px-1"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Change Task or Capacity</span>
          </button>
          <button
            type="button"
            id="btn-dismiss"
            onClick={handleDismiss}
            disabled={isMutating}
            className="flex items-center gap-1 text-outline font-label-sm text-label-sm transition-colors hover:text-on-surface py-2 px-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Dismiss (No penalty)</span>
          </button>
        </div>
      </div>

      {/* Reassurance Banner */}
      <div className="mt-space-xl p-space-md rounded-2xl bg-surface-container-low flex items-center gap-space-sm shadow-sm border border-surface-container-high/40">
        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[18px]">spa</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface font-semibold">Gentle Reminder</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Take all the time you need. Progress is not a race.
          </span>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container font-body-sm text-body-sm">
          {actionError}
        </p>
      )}
    </div>
  );
};
