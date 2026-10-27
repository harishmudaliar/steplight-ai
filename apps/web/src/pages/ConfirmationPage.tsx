import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

interface ConfirmationState {
  name?: string;
  email?: string;
}

export const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as ConfirmationState) || {};

  const name = state.name || 'Friend';
  const email = state.email || 'your email';

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md text-center items-center">
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-8 shadow-sm flex flex-col items-center gap-6 w-full">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
            You're In, {name}.
          </h1>
          <p className="font-body-md text-body-md text-secondary dark:text-outline-variant leading-relaxed">
            Your space has been calibrated for zero shame. An onboarding confirmation has been registered for <span className="font-semibold text-on-surface dark:text-inverse-on-surface">{email}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-secondary-container/40 dark:bg-secondary-container/20 border border-secondary-container text-xs text-secondary dark:text-outline-variant text-left leading-relaxed w-full">
          <strong>Next step:</strong> You can take a 60-second gentle onboarding walkthrough, or jump straight into breaking down your first task.
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span>Start Gentle Onboarding</span>
          </button>
          <Link
            to="/"
            className="w-full h-11 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            Skip Directly to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
