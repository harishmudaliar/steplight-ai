import React from 'react';
import { Link } from 'react-router-dom';

export const ExplainabilityPage: React.FC = () => (
  <div className="flex flex-col w-full gap-space-lg">
    <div className="flex flex-col gap-1">
      <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
        <span className="material-symbols-outlined text-[16px]">psychology</span>
        <span>How Suggestions Are Chosen</span>
      </div>
      <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight mt-1">
        Why This Step?
      </h1>
      <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
        Suggestions are options, not instructions. The explanation shown with each step reflects its actual source and stored rationale.
      </p>
    </div>

    <div className="space-y-4">
      <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          Reviewed suggestions
        </h2>
        <p className="font-body-sm text-secondary dark:text-outline-variant leading-relaxed">
          Steplight considers your task, its context, and your current capacity when choosing from reviewed suggestions. The step's explanation describes why that action may fit; you can always choose a different action.
        </p>
      </section>

      <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          Gemini suggestion (optional)
        </h2>
        <p className="font-body-sm text-secondary dark:text-outline-variant leading-relaxed">
          If you turn on Gemini in Settings and relevant guidance is available, Gemini may suggest an action and a short explanation. These suggestions are generated content, not clinical reasoning or a diagnosis.
        </p>
      </section>

      <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          Other suggestions and your feedback
        </h2>
        <p className="font-body-sm text-secondary dark:text-outline-variant leading-relaxed">
          If a reviewed suggestion is unavailable, Steplight can offer a simpler local action. Choosing “Can't” can also bring up a smaller option. You can pause, skip, or stop whenever you need to.
        </p>
      </section>

      <section className="p-6 rounded-2xl bg-surface-container-low dark:bg-surface-container text-body-sm text-secondary dark:text-outline-variant">
        <p>
          “Why this step?” shows the explanation saved with that suggestion. It is a helpful summary, not a complete account of every factor used to choose it.
        </p>
      </section>
    </div>

    <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-secondary dark:text-outline-variant flex items-center justify-between gap-4">
      <span>Want to see precisely what is sent to Google when you opt in?</span>
      <Link to="/ai-transparency" className="text-primary font-semibold hover:underline shrink-0">AI Transparency</Link>
    </div>
  </div>
);
