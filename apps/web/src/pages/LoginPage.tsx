import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginDemo, error, clearError } = useAuth();

  const [email, setEmail] = useState('demo@steplight.ai');
  const [password, setPassword] = useState('gentlestep123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    clearError();

    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      setLocalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setLocalError(null);
    clearError();
    try {
      await loginDemo();
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo account login failed.';
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
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mb-2 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface dark:text-inverse-on-surface">
            Welcome Back
          </h1>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Enter with zero pressure. One tiny step at a time.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-outline">
                <span className="material-symbols-outlined text-[18px]">mail</span>
              </span>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@steplight.ai"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-outline">
                <span className="material-symbols-outlined text-[18px]">key</span>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-outline hover:text-on-surface transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-secondary dark:text-outline-variant pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" defaultChecked className="rounded border-outline text-primary focus:ring-primary" />
              <span>Remember this session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold mt-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Opening your space...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">spa</span>
            <span>Enter with Instant Demo Account</span>
          </button>
        </form>

        <div className="text-center text-xs text-secondary dark:text-outline-variant border-t border-surface-container-high/40 pt-4">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
