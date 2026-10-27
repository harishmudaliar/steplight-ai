import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md text-center items-center py-8">
      <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-8 shadow-sm flex flex-col items-center gap-6 w-full">
        <div className="w-16 h-16 rounded-full bg-secondary-container text-primary flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-[36px]">compass_calibration</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-primary font-bold uppercase tracking-wider">
            Page Not Found &bull; 404
          </span>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight">
            Lost your way? Zero shame.
          </h1>
          <p className="font-body-md text-body-md text-secondary dark:text-outline-variant leading-relaxed">
            The page you're looking for doesn't exist or has moved. Take a gentle breath and let's guide you back.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span>Return to Dashboard</span>
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-11 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            Go Back One Step
          </button>
        </div>

        <div className="pt-2 text-xs text-secondary dark:text-outline-variant">
          Need help? Visit our{' '}
          <Link to="/help" className="text-primary hover:underline">
            Crisis &amp; Help page
          </Link>
        </div>
      </div>
    </div>
  );
};
