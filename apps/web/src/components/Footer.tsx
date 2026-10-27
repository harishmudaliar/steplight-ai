import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-surface-container-high/60 dark:border-surface-container/60 pt-10 pb-16 px-gutter bg-surface-container-lowest/50 dark:bg-surface-container-lowest/20">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">flare</span>
              </div>
              <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface dark:text-inverse-on-surface">
                Steplight AI
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
              One Tiny Step. Zero Shame. Built with care by Team OLYMPUS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">
              System Operational &bull; Gentle Pacing Active
            </span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Product
            </span>
            <Link to="/features" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Features
            </Link>
            <Link to="/how-it-works" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link to="/tasks" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Task Breakdown
            </Link>
            <Link to="/explainability" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Why This Step?
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Philosophy &amp; Team
            </span>
            <Link to="/about" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              About Team OLYMPUS
            </Link>
            <Link to="/ai-transparency" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              AI Transparency
            </Link>
            <Link to="/history" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Gentle History
            </Link>
            <Link to="/faq" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              FAQ
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Account &amp; Auth
            </span>
            <Link to="/login" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Log In (Mock)
            </Link>
            <Link to="/signup" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Sign Up (Mock)
            </Link>
            <Link to="/onboarding" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Onboarding Flow
            </Link>
            <Link to="/profile" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Profile
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Support &amp; Trust
            </span>
            <Link to="/help" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Crisis &amp; Help
            </Link>
            <Link to="/privacy" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Terms of Care
            </Link>
            <Link to="/offline" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Offline Status
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-surface-container-high/40 dark:border-surface-container/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-outline dark:text-outline-variant">
          <span>&copy; {new Date().getFullYear()} Steplight AI. Non-diagnostic supportive technology.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/settings" className="hover:underline">Preferences</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
