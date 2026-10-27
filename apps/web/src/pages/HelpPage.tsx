import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const HelpPage: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSentNotice(true);
    setFeedback('');
    setTimeout(() => setSentNotice(false), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
          <span>Crisis Support &amp; Care</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight mt-1">
          Support, Safety &amp; Guidance
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          If you are experiencing acute overwhelm or crisis, you are not alone. Please reach out to these compassionate resources.
        </p>
      </div>

      {/* Immediate Crisis Support Box */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-secondary-container/40 to-primary-fixed/30 dark:from-secondary-container/20 dark:to-primary/20 border border-secondary-container shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-primary font-semibold">
          <span className="material-symbols-outlined text-[24px]">call</span>
          <span className="font-headline-sm text-headline-sm">Free, Confidential Lifelines</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container shadow-sm flex flex-col gap-1">
            <span className="font-bold text-on-surface dark:text-inverse-on-surface">988 Suicide &amp; Crisis Lifeline</span>
            <span className="text-xs text-secondary dark:text-outline-variant">Call or text 988 (USA &amp; Canada)</span>
            <span className="text-xs text-primary font-semibold mt-1">Available 24/7 &bull; Free</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container shadow-sm flex flex-col gap-1">
            <span className="font-bold text-on-surface dark:text-inverse-on-surface">Crisis Text Line</span>
            <span className="text-xs text-secondary dark:text-outline-variant">Text HOME to 741741</span>
            <span className="text-xs text-primary font-semibold mt-1">Available 24/7 &bull; Free SMS</span>
          </div>
        </div>
        <p className="text-xs text-secondary dark:text-outline-variant">
          International users can find immediate confidential local lifelines at{' '}
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            findahelpline.com
          </a>.
        </p>
      </section>

      {/* Keyboard Shortcuts Cheat Sheet */}
      <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 text-on-surface dark:text-inverse-on-surface font-semibold">
          <span className="material-symbols-outlined text-[20px] text-primary">keyboard</span>
          <span className="font-headline-sm text-headline-sm">Keyboard Navigation Shortcuts</span>
        </div>
        <p className="text-xs text-secondary dark:text-outline-variant">
          Steplight AI is fully keyboard operable. Use these global shortcuts anywhere outside of text input fields:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container flex justify-between items-center">
            <span className="font-sans text-secondary">Dashboard:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high font-bold">Alt + D</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container flex justify-between items-center">
            <span className="font-sans text-secondary">Tasks:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high font-bold">Alt + T</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container flex justify-between items-center">
            <span className="font-sans text-secondary">Step Sequencer:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high font-bold">Alt + S</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container flex justify-between items-center">
            <span className="font-sans text-secondary">Progress:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high font-bold">Alt + P</kbd>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container flex justify-between items-center">
            <span className="font-sans text-secondary">Help &amp; Crisis:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high font-bold">Alt + H</kbd>
          </div>
        </div>
      </section>

      {/* Gentle Feedback Box */}
      <section className="p-6 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
          Send Feedback to Team OLYMPUS
        </h2>
        <p className="text-xs text-secondary dark:text-outline-variant">
          Did a step feel too heavy? Do you have an idea for gentler wording? We value every suggestion.
        </p>
        <form onSubmit={handleSendFeedback} className="flex flex-col gap-3">
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts gently..."
            className="w-full p-3 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-sm border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none shadow-inner"
          />
          {sentNotice && (
            <span className="text-xs text-emerald-700 font-semibold animate-fadeIn">
              Thank you! Your suggestion was logged for the team.
            </span>
          )}
          <button
            type="submit"
            className="self-end px-5 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:opacity-95 transition-all font-semibold"
          >
            Submit Feedback
          </button>
        </form>
      </section>

      <div className="text-center text-xs text-secondary dark:text-outline-variant">
        <Link to="/faq" className="text-primary hover:underline">
          Return to Frequently Asked Questions
        </Link>
      </div>
    </div>
  );
};
