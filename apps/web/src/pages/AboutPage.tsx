import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">diversity_3</span>
          <span>Team OLYMPUS</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          About Steplight AI &amp; Team OLYMPUS
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          We built Steplight AI because conventional productivity tools actively punish the people who need them the most.
        </p>
      </div>

      {/* The Manifesto Card */}
      <section className="p-8 rounded-3xl bg-gradient-to-br from-tertiary-fixed/20 via-primary-fixed/20 to-surface-container-low dark:from-tertiary/10 dark:via-primary/10 dark:to-surface-container/20 border border-primary-fixed/40 shadow-sm flex flex-col gap-4">
        <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-semibold">
          Our Core Manifesto
        </span>
        <blockquote className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-semibold text-on-surface dark:text-inverse-on-surface leading-snug">
          "Executive dysfunction is not a character flaw. Resistance is not laziness. One tiny step taken with zero shame is worth a thousand unstarted grand plans."
        </blockquote>
        <span className="font-label-sm text-label-sm text-secondary dark:text-outline-variant">
          — Team OLYMPUS
        </span>
      </section>

      {/* Why We Built This */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            What Traditional Apps Do Wrong
          </h2>
          <ul className="text-body-sm text-secondary dark:text-outline-variant space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-error font-bold">&bull;</span>
              Flashing red overdue alerts that trigger immediate avoidance and guilt.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error font-bold">&bull;</span>
              Fragile streak counters that cause shame spirals when life interrupts.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-error font-bold">&bull;</span>
              Exposing overwhelming 30-item lists that freeze executive function.
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">check</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            The Steplight AI Way
          </h2>
          <ul className="text-body-sm text-secondary dark:text-outline-variant space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">&bull;</span>
              Single atomic action visible at any given moment.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">&bull;</span>
              Honoring user energy: Low, Medium, and High capacity sizing.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">&bull;</span>
              Safe pauses logged as self-compassion accomplishments.
            </li>
          </ul>
        </div>
      </section>

      {/* Non-diagnostic notice */}
      <section className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container-low/20 border border-surface-container-high text-xs text-secondary dark:text-outline-variant leading-relaxed">
        <strong>Important Disclaimer:</strong> Steplight AI is a supportive digital tool designed by Team OLYMPUS for cognitive pacing and task initiation. It is not intended to diagnose, treat, cure, or replace professional clinical therapy, medical advice, or psychiatric intervention.
      </section>

      <div className="flex justify-center gap-4">
        <Link to="/ai-transparency" className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
          Read our AI Transparency Guarantee <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};
