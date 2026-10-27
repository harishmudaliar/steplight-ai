import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!token.trim()) {
      setErrorMessage('Enter the reset code from your instructions, or request a new password reset.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired reset token.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md">
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center items-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-primary flex items-center justify-center mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">vpn_key</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
            Choose a New Password
          </h1>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Create a gentle, secure passphrase for your space.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container text-xs flex items-center gap-2.5"
          >
            <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-center flex flex-col items-center gap-2 animate-fadeIn border border-emerald-200 dark:border-emerald-800">
            <span className="material-symbols-outlined text-[28px] text-emerald-600">check_circle</span>
            <span className="font-semibold text-sm">Password updated successfully!</span>
            <span className="text-xs">Your sessions have been refreshed. Redirecting to Log In...</span>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-token" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                Reset Token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from dev email sink"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                New Password (min 8 chars)
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || password !== confirmPassword || !token}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold mt-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Save New Password</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-secondary dark:text-outline-variant border-t border-surface-container-high/40 pt-4">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
};
