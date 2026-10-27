import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-primary-fixed/30 via-tertiary-fixed/20 to-surface-container-low dark:from-primary/10 dark:via-tertiary/10 dark:to-surface-container-low/20 p-8 md:p-12 border border-surface-container-high/60 overflow-hidden shadow-lg shadow-primary-container/5 text-center flex flex-col items-center">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-fixed/40 dark:bg-primary/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-tertiary-fixed/30 dark:bg-tertiary/20 blur-3xl pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest dark:bg-surface-container text-primary font-label-sm text-label-sm shadow-sm mb-4">
          <span className="material-symbols-outlined text-[16px] text-tertiary">spa</span>
          <span>One Tiny Step. Zero Shame.</span>
        </div>

        <h1 className="font-display-mobile md:font-display text-display-mobile md:text-display text-on-surface dark:text-inverse-on-surface font-bold tracking-tight max-w-2xl leading-tight">
          Overcome executive overwhelm. Find your next 2 minutes.
        </h1>

        <p className="font-body-lg text-body-lg text-secondary dark:text-outline-variant max-w-xl mt-4 leading-relaxed">
          The compassionate anti-overwhelm task sequencer built for ADHD, burnout, and anxiety. No guilt streaks, no 10-step lists. Just one manageable atomic action sized to your energy.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full sm:w-auto px-8 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(82,101,232,0.28)] hover:bg-primary transition-all active:scale-95 font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span>Get Started Gently</span>
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 h-12 rounded-xl bg-surface-container-lowest dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-lg text-label-lg border border-surface-container-high/60 hover:bg-surface-container-low transition-colors"
          >
            Log In (Mock)
          </button>
        </div>
      </section>

      {/* The 3 Core Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary-container dark:bg-secondary-container/40 flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined text-[22px]">psychology</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Capacity-Aware Sizing
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Check in with your real battery: Low (&lt;2 min friction reduction), Medium (5-10 min focus), or High. We never force multi-step momentum when you're running on empty.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary-container dark:bg-secondary-container/40 flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined text-[22px]">favorite</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Zero-Shame Architecture
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            No red alert banners. No broken streaks. Pausing to rest is celebrated as healthy cognitive pacing. If a step feels too heavy, shrink it to a 15-second nano-action.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-2">
          <div className="w-10 h-10 rounded-xl bg-secondary-container dark:bg-secondary-container/40 flex items-center justify-center text-primary mb-2">
            <span className="material-symbols-outlined text-[22px]">devices</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
            Web &amp; Desktop Synced
          </h2>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            One shared interface across your browser and native Windows desktop app. Offline capable with instant local state preservation.
          </p>
        </div>
      </section>

      {/* Quick Testimonial / Non-diagnostic note */}
      <section className="p-6 rounded-2xl bg-surface-container-low dark:bg-surface-container-low/30 border border-surface-container-high/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Designed with Neurodivergent Empathy
            </span>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
              Developed by Team OLYMPUS for executive function support. Not clinical therapy.
            </p>
          </div>
        </div>
        <Link
          to="/how-it-works"
          className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1 shrink-0"
        >
          Explore How It Works <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </section>
    </div>
  );
};
