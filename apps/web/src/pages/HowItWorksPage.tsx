import React from 'react';
import { Link } from 'react-router-dom';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">route</span>
          <span>Simple Methodology</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          How Steplight AI Works
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Transforming overwhelming mountains into single grains of sand in 3 compassionate steps.
        </p>
      </div>

      <div className="flex flex-col gap-6 relative">
        {/* Step 1 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
            1
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
              Name the Overwhelming Thing
            </h2>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
              Type the task that has been lingering on your mental horizon — whether it's "Prepare for DBMS Examination", "Finish Tax Documents", or "Clean Bedroom". Add any breadcrumbs or context notes if you have them, or leave it blank.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-primary flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
            2
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
              Check In With Your Real Capacity
            </h2>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
              Be radically honest about where your energy is right now.
              <span className="block mt-1 font-semibold text-on-surface dark:text-inverse-on-surface">
                &bull; Low Energy: We generate a tiny friction-reduction step under 2 minutes.
              </span>
              <span className="block font-semibold text-on-surface dark:text-inverse-on-surface">
                &bull; Medium Energy: A steady 5-10 minute single track action.
              </span>
              <span className="block font-semibold text-on-surface dark:text-inverse-on-surface">
                &bull; High Energy: Ready for a deeper dive.
              </span>
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
            3
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
              Do Only One Step &bull; Full Permission to Stop
            </h2>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
              You will never be presented with an intimidating 10-step checklist. You only ever see the single action in front of you. Once done, you have 100% permission to celebrate and stop, or gently ask for the next step.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Net Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-secondary-container/30 to-tertiary-fixed/20 border border-secondary-container flex items-start gap-4">
        <span className="material-symbols-outlined text-[28px] text-primary shrink-0 mt-0.5">
          safety_divider
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
            What if even Step 1 feels impossible?
          </span>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Click <strong>"Can't • Make Smaller"</strong>. Steplight will shrink the requirement into a 15-second nano-action (like opening the folder or waking up your screen). Resistance is data, not failure.
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <Link
          to="/tasks"
          className="px-8 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
        >
          <span>Try It Out Now</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};
