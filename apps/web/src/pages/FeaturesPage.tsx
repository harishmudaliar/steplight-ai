import React from 'react';
import { Link } from 'react-router-dom';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">featured_play_list</span>
          <span>Core Capabilities</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          Features Built for Cognitive Calm
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Every tool in Steplight AI is intentionally engineered to minimize friction and prevent shame spirals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature 1 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">battery_horiz_075</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
              Available
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            3-Tier Energy Calibration
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
            Choose Low, Medium, or High capacity before starting. Low capacity limits tasks to sub-2-minute micro-actions that only ask you to initiate or set up your environment, requiring near-zero executive bandwidth.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">grain</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
              Available
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Recursive "Make It Smaller"
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
            If the current step still triggers avoidance or hesitation, click "Can't • Make Smaller". The system immediately downgrades the requirement to a 15-second physical action (e.g., "Just touch the folder on your screen").
          </p>
        </div>

        {/* Feature 3 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">self_improvement</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
              Available
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Guilt-Free Pausing &amp; Rest
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
            Steplight treats taking a rest as a positive self-care choice. Your active step is safely tucked away forever without penalty or streak reset.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">psychology_alt</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold">
              Available
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Transparent Heuristic Explainability
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
            Tap "Why This Step?" to see the exact behavioral psychology rationale behind the micro-action, grounding the recommendation in friction reduction and spatial priming.
          </p>
        </div>

        {/* Feature 5: planned distraction blocker */}
        <div className="p-6 rounded-2xl bg-surface-container-low dark:bg-surface-container-low/20 border border-dashed border-primary/40 shadow-sm flex flex-col gap-2.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <span className="material-symbols-outlined text-[22px]">lock_clock</span>
              <span>Smart Focus &amp; Distraction Blocker</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-label-sm text-label-sm font-bold">
              Planned
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
            Website and app blocking is being considered for a future release. It is not available yet.
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <Link
          to="/tasks"
          className="px-8 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
        >
          <span>Try Sizing a Task</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};
