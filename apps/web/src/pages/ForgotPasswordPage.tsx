import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setNotice('If an account exists for this email, reset instructions are ready. Contact the person who manages your Steplight account to receive your reset code.');
      setSubmitted(true);
    } catch {
      // Generic message to prevent email enumeration
      setNotice('If an account exists for this email, reset instructions have been requested. Please try again later or contact support.');
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md">
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center items-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-primary flex items-center justify-center mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">lock_reset</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
            Reset Password
          </h1>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            We will help you regain gentle access without stress.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-4 text-center items-center animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">mark_email_read</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-lg text-label-lg font-semibold text-on-surface dark:text-inverse-on-surface">
                Instructions Requested
              </span>
              <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant leading-relaxed">
                {notice || 'If an account exists for this email, reset instructions are ready. Contact the person who manages your Steplight account to receive your reset code.'}
              </p>
            </div>
            <Link
              to="/reset-password"
              className="w-full h-11 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-sm hover:opacity-95 transition-all font-semibold mt-2"
            >
              Enter Reset Token & Update Password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-email" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                Your Account Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@steplight.ai"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold mt-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Generating secure reset token...</span>
                </>
              ) : (
                <span>Send Single-Use Reset Link</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-secondary dark:text-outline-variant border-t border-surface-container-high/40 pt-4">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
};
