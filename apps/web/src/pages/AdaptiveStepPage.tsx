import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { StepFeedbackAction } from '@steplight/shared';
import { useTask } from '../context/TaskContext';

interface AdaptiveStepLocation {
  taskId?: string;
  taskTitle?: string;
  previousStep?: string;
  capacity?: string;
  stepId?: string;
  stepTitle?: string;
  stepReason?: string;
  stepInstruction?: string;
  stepSource?: "GEMINI" | "LOCAL_RAG" | "LOCAL_FALLBACK";
  stepDuration?: number;
  stepOrder?: number;
}

export const AdaptiveStepPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as AdaptiveStepLocation) || {};
  const { submitStepFeedback, isMutating } = useTask();
  const [currentStepText, setCurrentStepText] = useState(state.stepTitle || '');
  const [currentInstruction, setCurrentInstruction] = useState(state.stepInstruction || "");
  const [currentDuration, setCurrentDuration] = useState(state.stepDuration ?? 15);
  const [currentSource, setCurrentSource] = useState(state.stepSource);
  const [currentStepReason, setCurrentStepReason] = useState(state.stepReason || '');
  const [currentStepId, setCurrentStepId] = useState(state.stepId);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestKeyRef = useRef<{ action: StepFeedbackAction; stepId?: string; key: string } | null>(null);

  const sendFeedback = async (action: StepFeedbackAction) => {
    if (!state.taskId) return null;
    const existing = requestKeyRef.current;
    const key = existing && existing.action === action && existing.stepId === currentStepId
      ? existing.key
      : globalThis.crypto.randomUUID();
    requestKeyRef.current = { action, stepId: currentStepId, key };
    const result = await submitStepFeedback(
      state.taskId,
      { action, stepId: currentStepId },
      key
    );
    requestKeyRef.current = null;
    setActionError(null);
    return result;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleTryStep = () => {
    if (!state.taskId || !currentStepId) {
      navigate('/tasks');
      return;
    }
    navigate(`/step-sequencer?taskId=${state.taskId}`, {
      state: {
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        capacity: state.capacity,
        stepId: currentStepId,
        stepTitle: currentStepText,
        stepReason: currentStepReason,
        stepInstruction: currentInstruction,
        stepSource: currentSource,
        stepDuration: currentDuration,
        stepOrder: state.stepOrder,
      },
    });
  };

  const handleMakeEvenSmaller = async () => {
    if (!currentStepId || !state.taskId) return;
    try {
      const result = await sendFeedback('cant');
      if (!result?.step) return;
      setCurrentStepId(result.step.id);
      setCurrentStepText(result.step.title);
      setCurrentStepReason(result.step.reason || '');
      setCurrentInstruction(result.step.instruction || '');
      setCurrentDuration(result.step.estimatedDuration);
      setCurrentSource(result.step.source || undefined);
      showToast(result.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not make this step smaller yet.');
    }
  };

  const handleRest = async () => {
    try {
      if (state.taskId) await sendFeedback('rest');
      navigate('/rest', { state: { taskId: state.taskId, taskTitle: state.taskTitle, stepId: currentStepId } });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not save your pause yet.');
    }
  };

  const handleChange = async () => {
    try {
      if (state.taskId && currentStepId) await sendFeedback('change');
      navigate(state.taskId ? `/tasks/${state.taskId}/edit` : '/tasks');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not save your change request yet.');
    }
  };

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Warm Relief Banner */}
      <div className="relative overflow-hidden rounded-xl bg-secondary-container text-on-secondary-container p-space-md mb-space-md shadow-sm border border-secondary-container">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-primary-fixed/40 blur-xl pointer-events-none"></div>
        <div className="relative flex items-start gap-space-sm">
          <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">spa</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-lowest/80 text-primary w-fit mb-1">
              <span className="material-symbols-outlined text-[14px]">favorite</span>
              <span className="font-label-sm text-label-sm font-semibold">Zero Judgment Space</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-secondary-container leading-tight font-semibold">
              No problem at all. We can make this smaller.
            </h2>
            <p className="font-body-sm text-body-sm text-on-secondary-variant mt-0.5">
              Resistance is useful feedback. We can adjust the task to what feels possible today.
            </p>
          </div>
        </div>
      </div>

      {/* AI Behavioral Strategy Indicator */}
      <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed mb-space-md shadow-sm border border-tertiary-fixed-dim">
        <span className="material-symbols-outlined text-[16px] text-tertiary">auto_fix_high</span>
        <span className="font-label-sm text-label-sm truncate font-medium">
          Smaller optional action, suggested locally from recent feedback
        </span>
      </div>

      {/* Step Calibration Bento Grid / Comparison Zone */}
      <div className="flex flex-col gap-space-sm mb-space-lg">
        {/* Previous Step (De-emphasized & Dimmed) */}
        <div className="p-space-md rounded-xl bg-surface-container-low text-on-surface-variant/80 transition-all border border-surface-container-high/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
              Previous Step
            </span>
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">psychology_alt</span>
              Set aside
            </span>
          </div>
          <p className="font-body-md text-body-md line-through text-outline decoration-outline-variant">
            {state.previousStep || 'The previous step'}
          </p>
        </div>

        {/* Soft Transition Bridge */}
        <div className="flex items-center justify-center gap-2 py-1 text-primary">
          <div className="h-px bg-surface-container-highest flex-1"></div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant shadow-sm border border-surface-container-highest">
            <span className="material-symbols-outlined text-[16px] text-primary">arrow_downward</span>
            <span className="font-label-sm text-label-sm font-medium">Broken down into a micro-action</span>
          </div>
          <div className="h-px bg-surface-container-highest flex-1"></div>
        </div>

        {/* NEW Scaled Down Action Card */}
        <div
          id="new-action-card"
          className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-md border border-primary/20"
        >
          {/* Glow Aura */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-secondary-container/50 blur-2xl pointer-events-none"></div>

          {/* Badge row */}
          <div className="flex items-center justify-between gap-2 mb-space-sm relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Right-Sized Action
            </span>
            <div className="flex items-center gap-1 text-primary font-label-sm text-label-sm bg-primary-fixed/40 px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span>~15 seconds</span>
            </div>
          </div>

          {/* Micro-task headline */}
          <div className="relative mb-space-md">
            <h3
              id="current-step-text"
              className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold transition-opacity duration-200"
            >
              {currentStepText || 'Choose one small action from a task.'}
            </h3>
            {currentInstruction && <p className="text-sm">{currentInstruction}</p>}
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {currentStepReason || 'This is optional. You can stop whenever you want.'}
            </p>
          </div>

          {/* Tactile Sensory Anchor Visual */}
          <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low mb-space-sm border border-surface-container-high/40">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[20px]">folder_open</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface truncate font-semibold">
                Task: {state.taskTitle || 'No task selected'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                Capacity: {state.capacity || 'not set'}
              </span>
            </div>
          </div>

          {/* Reassurance Pill */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary-fixed/30 text-on-primary-fixed-variant border border-primary-fixed">
            <span className="material-symbols-outlined text-[18px] shrink-0 text-primary">verified</span>
            <p className="font-body-sm text-body-sm font-medium">
              This action is optional. You can pause, change it, or leave without marking it complete.
            </p>
          </div>
        </div>
      </div>

      <p className="mb-space-lg rounded-xl bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
        This suggestion was generated locally from recent feedback; no AI request was needed.
      </p>

      {/* Interactive Action Stack */}
      <div className="flex flex-col gap-space-sm">
        {/* Primary CTA: Try This Step */}
        <button
          type="button"
          id="try-step-btn"
          onClick={handleTryStep}
          disabled={!currentStepId || isMutating}
          className="w-full h-12 px-space-lg rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform hover:bg-primary font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">play_arrow</span>
          <span>Try This Step</span>
        </button>

        {/* Secondary CTA: Still Too Big? */}
        <button
          type="button"
          id="make-smaller-btn"
          onClick={handleMakeEvenSmaller}
          disabled={!currentStepId || isMutating}
          className="w-full h-11 px-space-md rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform hover:bg-surface-container border border-surface-container-high font-medium"
        >
          <span className="material-symbols-outlined text-[18px] text-tertiary">grain</span>
          <span>Still Too Big? Make It Even Smaller</span>
        </button>

        {/* Gentle Fallback: Rest */}
        <button
          type="button"
          id="rest-btn"
          onClick={handleRest}
          disabled={isMutating}
          className="w-full h-11 px-space-md rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform hover:bg-tertiary-fixed-dim font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">bedtime</span>
          <span>Take a Rest Instead (Progress is Safe)</span>
        </button>

        {/* Tertiary: Change Capacity Mode */}
        <button
          type="button"
          onClick={handleChange}
          disabled={isMutating}
          className="w-full py-2.5 text-center text-secondary font-label-sm text-label-sm hover:text-on-surface transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Change Energy / Capacity Mode</span>
        </button>
      </div>

      {/* Micro-Feedback Toast Container */}
      <div
        id="toast-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-6 left-4 right-4 z-50 transition-all duration-300 pointer-events-none ${
          toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-xl bg-inverse-surface text-inverse-on-surface px-space-md py-space-sm shadow-xl flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary-fixed">check_circle</span>
          <span className="font-body-sm text-body-sm" id="toast-text">
            {toastMessage}
          </span>
        </div>
        {actionError && (
          <p role="alert" className="mt-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container font-body-sm text-body-sm">
            {actionError}
          </p>
        )}
      </div>
    </div>
  );
};
