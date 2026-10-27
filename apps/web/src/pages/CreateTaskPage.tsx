import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CapacityLevel } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';

export const CreateTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, apiClient } = useAuth();
  const { createTask, isMutating, error, clearError } = useTask();

  const submitRef = useRef(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [capacity, setCapacity] = useState<CapacityLevel>('low');
  const [showToast, setShowToast] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const getCtaText = () => {
    switch (capacity) {
      case 'low': return { label: 'Find My First Step', sub: '• Under 2m' };
      case 'medium': return { label: 'Find Focused Step', sub: '• 5-10m' };
      case 'high': return { label: 'Launch Full Momentum', sub: '• Ready' };
    }
  };
  const cta = getCtaText();

  const handleInitiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) {
      setSubmitAttempted(true);
      return;
    }

    if (submitRef.current) return;
    clearError();

    if (!isAuthenticated) {
      // Unauthenticated users are redirected to login
      navigate('/login');
      return;
    }

    submitRef.current = true;
    setIsPlanning(true);
    try {
      setShowToast(true);
      const task = await createTask({
        title: taskInput.trim(),
        notes: taskNotes.trim() || undefined,
        capacity,
      });
      let planError: string | undefined;
      try {
        await apiClient.generatePlan(task.id, task.version);
      } catch (error) {
        planError = error instanceof Error ? error.message : 'Gemini could not generate a plan. Please retry.';
      }
      navigate(`/tasks/${task.id}`, { state: { freshTask: true, planError } });
    } catch {
      setShowToast(false);
      // error is set in context
    } finally {
      submitRef.current = false;
      setIsPlanning(false);
      setShowToast(false);
    }
  };

  const titleError = submitAttempted && !taskInput.trim();

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Warm & Empathic Header */}
      <div className="flex flex-col space-y-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container">
          <span className="material-symbols-outlined text-[16px]">eco</span>
          <span className="font-label-sm text-label-sm">Gentle Initiation • Zero Shame</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight mt-1 font-semibold">
          What's one thing you'd like to work on?
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Break down the barrier to starting. You only ever need to do one micro-step at a time.
        </p>
      </div>

      {/* Global API error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm animate-fadeIn"
        >
          <span className="material-symbols-outlined text-[18px]">error_outline</span>
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-auto text-on-error-container/70 hover:text-on-error-container"
            aria-label="Dismiss error"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <p className="font-body-sm text-body-sm text-on-surface-variant">Generating a plan sends your goal and notes to Google Gemini. Review the saved AI plan before starting. If generation fails, your original task is kept so you can retry.</p>
      {/* Main Formulation Card */}
      <form onSubmit={handleInitiation} className="space-y-space-md" noValidate>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container-high/60 space-y-space-md">
          {/* Task Name Input Field */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="task-input" className="font-label-md text-label-md text-on-surface flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-primary text-[18px]">radio_button_checked</span>
                Focus Target
              </label>
              <span className="font-label-sm text-label-sm text-on-surface-variant/70">Single task only</span>
            </div>
            <div className="relative flex items-center">
              <input
                id="task-input"
                type="text"
                value={taskInput}
                onChange={(e) => { setTaskInput(e.target.value); if (submitAttempted) setSubmitAttempted(false); }}
                placeholder="e.g., Prepare for DBMS Examination"
                maxLength={255}
                aria-required="true"
                aria-invalid={titleError}
                aria-describedby={titleError ? 'task-input-error' : undefined}
                className={`w-full h-12 bg-surface-container-low text-on-surface placeholder-outline font-body-md text-body-md px-3.5 pr-10 rounded-lg outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all shadow-inner ${
                  titleError ? 'ring-2 ring-error' : ''
                }`}
              />
              {taskInput && (
                <button
                  type="button"
                  id="clear-task-btn"
                  onClick={() => setTaskInput('')}
                  aria-label="Clear field"
                  className="absolute right-3 p-1 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>
            {titleError && (
              <p id="task-input-error" className="font-body-sm text-body-sm text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">error_outline</span>
                Please enter a task name before continuing.
              </p>
            )}
            <div className="flex justify-end">
              <span className={`font-label-sm text-label-sm ${taskInput.length > 230 ? 'text-error' : 'text-outline'}`}>
                {taskInput.length}/255
              </span>
            </div>
          </div>

          {/* Optional Context Field */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="task-notes" className="font-label-md text-label-md text-on-surface flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-secondary text-[18px]">notes</span>
                Context &amp; Breadcrumbs
                <span className="font-label-sm text-label-sm text-on-surface-variant/70 font-normal">(Optional)</span>
              </label>
            </div>
            <textarea
              id="task-notes"
              rows={2}
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="e.g., Slides in Google Drive, exam is on Friday"
              maxLength={2000}
              className="w-full bg-surface-container-low text-on-surface placeholder-outline font-body-md text-body-md p-3 rounded-lg outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all resize-none shadow-inner"
            />
            <div className="flex justify-end">
              <span className={`font-label-sm text-label-sm ${taskNotes.length > 1900 ? 'text-error' : 'text-outline'}`}>
                {taskNotes.length}/2000
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Level Selector Section */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[20px]">battery_charging_full</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Your Current Capacity</h2>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              Honest check-in
            </span>
          </div>

          {/* 3 Interactive Capacity Cards */}
          <div
            id="capacity-options-group"
            role="radiogroup"
            aria-label="Energy capacity levels"
            className="flex flex-col space-y-2.5"
          >
            {/* Low Capacity */}
            <div
              id="cap-low"
              role="radio"
              tabIndex={0}
              aria-checked={capacity === 'low'}
              onClick={() => setCapacity('low')}
              onKeyDown={(e) => e.key === 'Enter' && setCapacity('low')}
              className={`capacity-card relative overflow-hidden rounded-xl p-3.5 transition-all cursor-pointer border ${
                capacity === 'low'
                  ? 'bg-surface-container-lowest shadow-md bg-gradient-to-r from-surface-container-lowest via-secondary-container/20 to-surface-container-lowest border-primary/30'
                  : 'bg-surface-container-low hover:bg-surface-container border-transparent'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${capacity === 'low' ? 'bg-primary-container' : 'bg-transparent'}`} />
              <div className="flex items-start gap-3 pl-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${capacity === 'low' ? 'bg-secondary-container text-primary' : 'bg-surface-variant text-secondary'}`}>
                  <span className="material-symbols-outlined text-[22px]">nest_farsight_weather</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">Low Energy / Overwhelmed</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-container text-primary shrink-0">&lt; 2 mins</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Let's start with something tiny. Under 2 minutes of effortless friction reduction.</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${capacity === 'low' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-transparent'}`}>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </div>
            </div>

            {/* Medium Capacity */}
            <div
              id="cap-med"
              role="radio"
              tabIndex={0}
              aria-checked={capacity === 'medium'}
              onClick={() => setCapacity('medium')}
              onKeyDown={(e) => e.key === 'Enter' && setCapacity('medium')}
              className={`capacity-card relative overflow-hidden rounded-xl p-3.5 transition-all cursor-pointer border ${
                capacity === 'medium'
                  ? 'bg-surface-container-lowest shadow-md bg-gradient-to-r from-surface-container-lowest via-secondary-container/20 to-surface-container-lowest border-primary/30'
                  : 'bg-surface-container-low hover:bg-surface-container border-transparent'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${capacity === 'medium' ? 'bg-primary-container' : 'bg-transparent'}`} />
              <div className="flex items-start gap-3 pl-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${capacity === 'medium' ? 'bg-secondary-container text-primary' : 'bg-surface-variant text-secondary'}`}>
                  <span className="material-symbols-outlined text-[22px]">pace</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">Moderate Focus</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant shrink-0">5-10 mins</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">I'm ready for a steady, focused step. One single track action.</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${capacity === 'medium' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-transparent'}`}>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </div>
            </div>

            {/* High Capacity */}
            <div
              id="cap-high"
              role="radio"
              tabIndex={0}
              aria-checked={capacity === 'high'}
              onClick={() => setCapacity('high')}
              onKeyDown={(e) => e.key === 'Enter' && setCapacity('high')}
              className={`capacity-card relative overflow-hidden rounded-xl p-3.5 transition-all cursor-pointer border ${
                capacity === 'high'
                  ? 'bg-surface-container-lowest shadow-md bg-gradient-to-r from-surface-container-lowest via-secondary-container/20 to-surface-container-lowest border-primary/30'
                  : 'bg-surface-container-low hover:bg-surface-container border-transparent'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${capacity === 'high' ? 'bg-primary-container' : 'bg-transparent'}`} />
              <div className="flex items-start gap-3 pl-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${capacity === 'high' ? 'bg-secondary-container text-primary' : 'bg-surface-variant text-secondary'}`}>
                  <span className="material-symbols-outlined text-[22px]">bolt</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">High Energy</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant shrink-0">Deep Dive</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">I have natural momentum and can take on a bigger chunk.</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${capacity === 'high' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-transparent'}`}>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step suggestion notice */}
        <div className="rounded-xl p-3 bg-secondary-container/40 border border-secondary-container flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-primary shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[16px] filled">auto_awesome</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">Adaptive Stepping</span>
            <p className="font-body-sm text-body-sm text-on-secondary-container">
              A suggested first step will appear after saving — generated locally to match your capacity.
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col space-y-2 pt-1">
          <button
            type="submit"
            id="submit-cta-btn"
            disabled={isMutating || isPlanning}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(82,101,232,0.28)] transition-all active:scale-[0.98] hover:bg-primary disabled:opacity-60 disabled:cursor-wait"
          >
            {isMutating || isPlanning ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>{isPlanning ? "Generating AI plan..." : "Saving task..."}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px] filled">sparkles</span>
                <span>{cta.label}</span>
                <span className="text-xs opacity-80">{cta.sub}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-11 rounded-xl bg-transparent hover:bg-surface-container text-secondary font-label-md text-label-md flex items-center justify-center transition-colors"
          >
            Cancel &amp; return to Dashboard
          </button>
        </div>
      </form>

      {/* Success Toast */}
      <div
        id="success-toast"
        role="status"
        aria-live="polite"
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 max-w-xs w-[90%] bg-inverse-surface text-inverse-on-surface py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2.5 transition-all duration-300 z-50 ${
          showToast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-secondary-fixed text-[20px]">check_circle</span>
        <span className="font-body-sm text-body-sm">Task saved — loading your first step...</span>
      </div>
    </div>
  );
};
