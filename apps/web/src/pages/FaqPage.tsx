import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "What if I can't even complete the 2-minute step?",
    a: "That is completely okay! Resistance is informative data, not failure. Simply tap 'Can't • Make Smaller' on the sequencer screen. Steplight will shrink the requirement to a 15-second nano-action (such as 'Just look at the desktop icon' or 'Just open the folder, no reading required'). You can also press 'Rest for Now' with zero penalty.",
  },
  {
    q: "Does Steplight AI have streaks or punishments?",
    a: "Never. We believe streak counters weaponize guilt and trigger avoidance spirals when life happens. Steplight measures Movement (steps accomplished) and Compassion (safe pauses preserved). You can step away for weeks and your place is safely saved forever.",
  },
  {
    q: "How does capacity sizing work?",
    a: "Before breaking down a task, you select your immediate capacity: Low (friction reduction under 2 minutes), Medium (moderate single-track focus for 5-10 minutes), or High (ready for deeper momentum). The system sizes the step so you never feel intimidated.",
  },
  {
    q: "Is Steplight AI clinical diagnosis or medical therapy?",
    a: "No. Steplight AI is assistive technology engineered by Team OLYMPUS to support everyday executive bandwidth. It is non-diagnostic and does not replace medical treatment, mental health therapy, or psychiatric care.",
  },
  {
    q: "What is the difference between the website and the Windows Electron desktop app?",
    a: "They share the exact same responsive React codebase! The Windows desktop app runs locally with offline state persistence, secure sandbox isolation, and compact window sizing (900x600).",
  },
  {
    q: "What is Smart Focus mode and is it active?",
    a: "App and website blocking is a possible future feature. It is not available or active right now.",
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">help</span>
          <span>Common Inquiries</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface mt-1">
          Frequently Asked Questions
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Everything you need to know about our anti-shame cognitive pacing tools.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 overflow-hidden shadow-sm transition-all"
          >
            <button
              onClick={() => toggle(i)}
              aria-expanded={openIndex === i}
              className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-surface-container-low dark:hover:bg-surface-container-low/20 transition-colors"
            >
              <span className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                {faq.q}
              </span>
              <span
                className={`material-symbols-outlined text-secondary dark:text-outline-variant transition-transform duration-200 shrink-0 ${
                  openIndex === i ? 'rotate-180' : 'rotate-0'
                }`}
              >
                expand_more
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 pt-1 text-body-sm text-secondary dark:text-outline-variant border-t border-surface-container-high/30 dark:border-surface-container/20 animate-fadeIn leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container-low/20 border border-surface-container-high text-center text-sm">
        Still have a question or need gentle guidance? Check our{' '}
        <Link to="/help" className="text-primary font-semibold hover:underline">
          Crisis &amp; Help page
        </Link>{' '}
        or explore our{' '}
        <Link to="/ai-transparency" className="text-primary font-semibold hover:underline">
          AI Transparency Report
        </Link>.
      </div>
    </div>
  );
};
