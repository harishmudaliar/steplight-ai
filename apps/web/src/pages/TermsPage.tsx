import React from 'react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">gavel</span>
          <span>Supportive Agreement</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          Terms of Care
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Clear, human-readable guidelines establishing the protective boundaries of Steplight AI.
        </p>
      </div>

      <div className="space-y-6 text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            1. Non-Diagnostic Supportive Technology
          </h2>
          <p>
            Steplight AI supports task initiation and gentle pacing. It is <strong>not</strong> medical diagnosis, psychological counseling, clinical therapy, or psychiatric medication advice. If you are experiencing an acute mental health crisis, please consult licensed medical professionals or refer to the resources on our <Link to="/help" className="text-primary underline">Crisis &amp; Help page</Link>.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            2. Anti-Shame User Covenant
          </h2>
          <p>
            By using Steplight AI, you agree that you have full permission to pause, stop, or reject any task step suggested by the system. The platform will never penalize you with streak breaks, guilt alerts, or public shame.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            3. Account &amp; Authentication Status
          </h2>
          <p>
            Your account is personal to you. Keep your sign-in details private, and contact support if you believe someone else has accessed your account.
          </p>
        </section>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/60 text-xs">
        <span>Steplight AI &bull; Team OLYMPUS</span>
        <Link to="/privacy" className="text-primary hover:underline">
          Read Privacy Policy
        </Link>
      </div>
    </div>
  );
};
