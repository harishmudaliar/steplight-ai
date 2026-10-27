import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>(['Studying / Exams']);
  const [preferredDuration, setPreferredDuration] = useState('2 minutes');

  const toggleTaskType = (type: string) => {
    setSelectedTaskTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between px-1">
        <span className="font-label-sm text-label-sm text-secondary dark:text-outline-variant font-semibold">
          Gentle Onboarding &bull; Step {step} of 4
        </span>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-primary hover:underline font-medium"
        >
          Skip to Dashboard
        </button>
      </div>

      <div className="w-full h-1.5 bg-surface-container-high dark:bg-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-container rounded-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        ></div>
      </div>

      {/* Step 1: Energy check-in baseline */}
      {step === 1 && (
        <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">battery_charging_full</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                Check In With Your Baseline
              </h1>
              <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
                We calibrate to your real energy — never an idealized fantasy.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="p-4 rounded-xl border border-surface-container-high/60 dark:border-surface-container/60 hover:bg-surface-container-low dark:hover:bg-surface-container-low/20 cursor-pointer flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary">bedtime</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                    Often Low Energy / Overwhelmed
                  </span>
                  <span className="text-xs text-secondary dark:text-outline-variant">
                    Start with friction-reduction sub-2-minute micro steps
                  </span>
                </div>
              </div>
              <input type="radio" name="baseline" defaultChecked className="text-primary focus:ring-primary" />
            </label>

            <label className="p-4 rounded-xl border border-surface-container-high/60 dark:border-surface-container/60 hover:bg-surface-container-low dark:hover:bg-surface-container-low/20 cursor-pointer flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-tertiary">pace</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                    Fluctuating Focus
                  </span>
                  <span className="text-xs text-secondary dark:text-outline-variant">
                    Ask me each time before initiating
                  </span>
                </div>
              </div>
              <input type="radio" name="baseline" className="text-primary focus:ring-primary" />
            </label>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
          >
            <span>Continue</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Step 2: Overwhelming Task Categories */}
      {step === 2 && (
        <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">checklist_rtl</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                What Tends to Trigger Resistance?
              </h1>
              <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
                Select any areas where starting feels like an uphill battle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Studying / Exams', 'Work Projects', 'Life Admin & Forms', 'Household Chores', 'Creative Work', 'Email & Inboxes'].map(
              (category) => {
                const isSelected = selectedTaskTypes.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleTaskType(category)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'border-primary bg-secondary-container/40 text-primary font-semibold'
                        : 'border-surface-container-high/60 text-secondary dark:text-outline-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="text-sm">{category}</span>
                    <span className="text-[11px] opacity-75">{isSelected ? 'Selected' : 'Tap to add'}</span>
                  </button>
                );
              }
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="h-12 px-5 rounded-xl bg-surface-container-low dark:bg-surface-container text-secondary font-label-md text-label-md"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
            >
              <span>Continue</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Default Duration */}
      {step === 3 && (
        <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">timer</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
                Preferred Initial Step Size
              </h1>
              <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
                The smaller the action, the faster the nervous system relaxes.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { duration: '30 seconds', desc: 'Just touch the desk or open the notes app. Zero cognitive load.' },
              { duration: '2 minutes', desc: 'Find the specific page or write one line. Recommended standard.' },
              { duration: '5 minutes', desc: 'Slightly longer single-track step when you have moderate bandwidth.' },
            ].map((opt) => (
              <label
                key={opt.duration}
                onClick={() => setPreferredDuration(opt.duration)}
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  preferredDuration === opt.duration
                    ? 'border-primary bg-secondary-container/30 text-primary font-semibold'
                    : 'border-surface-container-high/60 hover:bg-surface-container-low'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-on-surface dark:text-inverse-on-surface">
                    {opt.duration}
                  </span>
                  <span className="text-xs text-secondary dark:text-outline-variant">{opt.desc}</span>
                </div>
                <input
                  type="radio"
                  name="duration"
                  checked={preferredDuration === opt.duration}
                  onChange={() => setPreferredDuration(opt.duration)}
                  className="text-primary focus:ring-primary"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="h-12 px-5 rounded-xl bg-surface-container-low dark:bg-surface-container text-secondary font-label-md text-label-md"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
            >
              <span>Review Sanctuary</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Summary & Celebration */}
      {step === 4 && (
        <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6 text-center items-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-secondary-container text-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[32px]">spa</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
              Your Sanctuary Is Ready
            </h1>
            <p className="font-body-md text-body-md text-secondary dark:text-outline-variant leading-relaxed">
              Default step set to <strong>{preferredDuration}</strong>. Whenever you feel overwhelmed, remember: you only ever need to take one step.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-left w-full flex flex-col gap-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-secondary dark:text-outline-variant">Pacing mode:</span>
              <span className="text-on-surface dark:text-inverse-on-surface">Gentle &bull; Zero Shame</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary dark:text-outline-variant">Focus areas:</span>
              <span className="text-on-surface dark:text-inverse-on-surface">{selectedTaskTypes.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary dark:text-outline-variant">Streaks:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Disabled (Peace of mind)</span>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">explore</span>
            <span>Enter Steplight AI</span>
          </button>
        </div>
      )}
    </div>
  );
};
