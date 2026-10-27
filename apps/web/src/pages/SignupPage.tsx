import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CapacityLevel } from '@steplight/shared';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [energyPreference, setEnergyPreference] = useState<CapacityLevel>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    clearError();

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        email,
        password,
        displayName: name || 'Gentle Traveler',
        baselineCapacity: energyPreference,
      });

      navigate('/confirmation', {
        state: {
          email,
          name: name || 'Gentle Traveler',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create account.';
      setLocalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md">
      <div className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 md:p-8 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center items-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-primary flex items-center justify-center mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">person_add</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
            Create Your Safe Space
          </h1>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            No judgment. No rigid expectations. Just gentle momentum.
          </p>
        </div>

        {activeError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container text-xs flex items-center gap-2.5"
          >
            <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-name" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              What should we call you?
            </label>
            <input
              id="signup-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-email" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-password" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Create Password (min 8 characters)
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <span className="font-label-sm text-label-sm font-semibold text-on-surface dark:text-inverse-on-surface">
              Default Starting Energy
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEnergyPreference('low')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  energyPreference === 'low'
                    ? 'bg-secondary-container text-primary ring-2 ring-primary'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                }`}
              >
                <span>Low (&lt;2m)</span>
              </button>
              <button
                type="button"
                onClick={() => setEnergyPreference('medium')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  energyPreference === 'medium'
                    ? 'bg-secondary-container text-primary ring-2 ring-primary'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                }`}
              >
                <span>Medium (5-10m)</span>
              </button>
              <button
                type="button"
                onClick={() => setEnergyPreference('high')}
                className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  energyPreference === 'high'
                    ? 'bg-secondary-container text-primary ring-2 ring-primary'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                }`}
              >
                <span>High (Focus)</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold mt-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Setting up your sanctuary...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-secondary dark:text-outline-variant border-t border-surface-container-high/40 pt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};
