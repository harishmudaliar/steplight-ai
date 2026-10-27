import React from 'react';
import { Link } from 'react-router-dom';

export const AiTransparencyPage: React.FC = () => (
  <div className="flex flex-col w-full gap-space-lg">
    <div className="flex flex-col gap-1">
      <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
        <span className="material-symbols-outlined text-[16px]">visibility</span>
        <span>AI transparency</span>
      </div>
      <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight mt-1">
        What the AI Sees
      </h1>
      <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
        Gemini is optional and off until you enable it in Settings. The details below explain what may be shared when it is enabled.
      </p>
    </div>

    <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
        Data sent to Google on an opted-in generation
      </h2>
      <p className="text-body-sm text-secondary dark:text-outline-variant">
        Steplight sends these task details to Gemini only when your saved preference is on and relevant guidance is available:
      </p>
      <ul className="list-disc pl-5 text-body-sm text-secondary dark:text-outline-variant space-y-1">
        <li>Task title (up to 255 characters) and optional task notes/context (up to 1,200 characters).</li>
        <li>Current capacity (Low, Medium, or High) and your preferred step duration.</li>
        <li>Up to five retrieved strategy candidates, including strategy ID, name, use case, sample action, capacity fit, and relevance score.</li>
        <li>Instructions for returning one structured, non-diagnostic, optional action.</li>
      </ul>
      <p className="text-body-sm text-secondary dark:text-outline-variant">
        Your email, password, and sign-in details are not included in this request.
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          Suggestions made on your device
        </h2>
        <p className="text-xs text-secondary dark:text-outline-variant">
          Steplight can use your task title, notes, and capacity to choose a reviewed suggestion without sending them to Google. If Gemini is unavailable, you may still receive a local suggestion.
        </p>
      </section>
      <section className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          When Gemini may be used
        </h2>
        <p className="text-xs text-secondary dark:text-outline-variant">
          Enabling Gemini does not send every task automatically. It is used only when relevant guidance is available. Google processes requests under its own service terms; Steplight cannot control Google's data retention.
        </p>
      </section>
    </div>

    <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
        What Steplight stores
      </h2>
      <p className="text-body-sm text-secondary dark:text-outline-variant">
        Steplight stores which suggestion source was used and basic generation records to support the feature. It does not store the prompt as part of those records. A started step keeps its source so you can understand where it came from.
      </p>
      <p className="text-body-sm text-secondary dark:text-outline-variant">
        The Gemini preference can be turned off at any time in <Link to="/settings" className="text-primary underline">Settings</Link>. Previously sent requests cannot be recalled by changing the preference.
      </p>
    </section>

    <section className="p-6 rounded-2xl bg-surface-container-low dark:bg-surface-container text-body-sm text-secondary dark:text-outline-variant">
      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface mb-2">
        Retention and account controls
      </h2>
      <p>
        Account data and activity are kept while the account exists; this app does not currently run an automatic age-based purge. You can export your account data or request account deletion in Settings. See the <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for the current application retention statement.
      </p>
    </section>

    <div className="flex justify-between items-center text-xs text-secondary dark:text-outline-variant pt-2 border-t border-surface-container-high/60">
      <span>Steplight AI Transparency</span>
      <Link to="/explainability" className="text-primary font-semibold hover:underline">How a step is chosen</Link>
    </div>
  </div>
);
