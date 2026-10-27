import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface CompletionState {
  taskTitle?: string;
  stepTitle?: string;
}

export const CompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as CompletionState) || {};

  const taskTitle = state.taskTitle || 'Prepare for DBMS Examination';
  const stepTitle = state.stepTitle || 'Open your DBMS notes and locate Normalization section';

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md text-center items-center">
      <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-8 shadow-lg flex flex-col items-center gap-6 w-full relative overflow-hidden">
        {/* Ambient Celebration Halo */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-200/40 dark:bg-emerald-900/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary-fixed/40 dark:bg-primary/20 blur-3xl pointer-events-none"></div>

        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md animate-bounce">
          <span className="material-symbols-outlined text-[36px]">celebration</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 self-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-label-sm text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px]">check</span>
            Micro-Step Accomplished
          </span>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight">
            You showed up. That counts.
          </h1>
          <p className="font-body-md text-body-md text-secondary dark:text-outline-variant leading-relaxed">
            Completed: <strong className="text-on-surface dark:text-inverse-on-surface">"{stepTitle}"</strong> in {taskTitle}.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-secondary dark:text-outline-variant leading-relaxed w-full">
          <strong>Full Permission:</strong> You have 100% permission to close the app and rest right now. Progress is not a race. You broke inertia, and that is 90% of the battle.
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate('/step-sequencer', { state: { taskTitle, stepNumber: 2 } })}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            <span>I'm in momentum &bull; Next tiny step</span>
          </button>
          <button
            onClick={() => navigate('/rest')}
            className="w-full h-11 rounded-xl bg-secondary-container dark:bg-secondary-container/40 text-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">self_improvement</span>
            <span>I'm stopping here &bull; Enter Rest Mode</span>
          </button>
          <Link
            to="/"
            className="text-xs text-secondary dark:text-outline-variant hover:text-primary transition-colors py-1"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
