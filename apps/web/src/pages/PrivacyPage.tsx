import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">privacy_tip</span>
          <span>Data Privacy &amp; Trust</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          Privacy Policy
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Your tasks and mental energy are deeply personal. We protect your autonomy with radical transparency.
        </p>
      </div>

      <div className="space-y-6 text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            1. Zero Third-Party Advertising &amp; Tracking
          </h2>
          <p>
            Steplight AI contains no advertising pixels, tracker SDKs, or data brokers. We do not sell, rent, or trade your task entries, notes, or usage patterns to any outside company under any circumstances.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            2. Local Storage &amp; Offline Cache
          </h2>
          <p>
            Your theme and sign-in session are saved on this device in your browser or desktop app. This local information is not encrypted by Steplight. When offline, previously loaded pages may remain available, but task details are not saved for offline access and changes are not queued. Your tasks, steps, preferences, and activity are stored securely with your account. Account data should be protected in transit and accessible only to the signed-in account.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            3. AI Transparency
          </h2>
          <p>
            Gemini is off by default. A request is sent only when Gemini is enabled in your account preferences and relevant guidance is available. Steplight may share the task title, optional notes/context, capacity, preferred duration, and up to five relevant suggestions with Google. The prompt is not stored in generation records or the shared suggestion library. Local suggestions do not send task text to Google. Google processes opted-in requests under its own service terms and retention controls.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            4. Your Right to Disconnect &amp; Delete
          </h2>
          <p>
            Settings provides an account-data export. Account deletion requires password confirmation and removes associated account records. Steplight currently has no automatic age-based purge: account data is retained while the account exists. Password reset links expire after 15 minutes; sign-in sessions expire after 7 days. This application does not claim to control provider-side retention or service backups.
          </p>
        </section>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/60 text-xs">
        <span>Last Updated: October 2026 &bull; Team OLYMPUS</span>
        <Link to="/terms" className="text-primary hover:underline">
          Read Terms of Care
        </Link>
      </div>
    </div>
  );
};
