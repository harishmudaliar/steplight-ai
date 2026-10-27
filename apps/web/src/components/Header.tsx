import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMarketingLinks?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Steplight AI',
  subtitle = 'Dashboard',
  showBack = false,
  showMarketingLinks = false,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const userInitial = user?.displayName ? user.displayName.trim().charAt(0).toUpperCase() : 'G';

  return (
    <header className="sticky top-0 inset-x-0 z-30 bg-surface/90 dark:bg-[#111726]/90 backdrop-blur-xl shadow-[0_1px_12px_rgba(23,33,61,0.04)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.3)] pt-safe border-b border-surface-container-high/40 dark:border-surface-container/30 transition-colors">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 px-gutter">
        <div className="flex min-w-0 flex-1 items-center gap-space-xs">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface transition-transform active:scale-95 hover:bg-surface-container dark:text-inverse-on-surface dark:hover:bg-surface-container-high"
              aria-label="Go back to previous page"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
            </button>
          )}

          <Link
            to="/"
            className="group flex min-w-0 items-center gap-space-sm cursor-pointer select-none"
            aria-label="Steplight AI Dashboard Home"
          >
            {/* Compassionate Steplight Lantern Logo */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-sm transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[20px]">flare</span>
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="block max-w-[30vw] truncate font-label-lg text-label-lg font-semibold tracking-tight text-on-surface dark:text-inverse-on-surface sm:max-w-none">
                {title}
              </span>
              <span className="block max-w-[36vw] truncate font-label-sm text-label-sm font-normal leading-none text-on-surface-variant dark:text-outline-variant sm:max-w-none">
                {subtitle}
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right Header Affordances */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Public links on larger screens */}
          {showMarketingLinks && <nav className="hidden md:flex items-center gap-4 text-sm font-medium mr-2">
            <Link to="/features" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              Features
            </Link>
            <Link to="/how-it-works" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link to="/about" className="text-secondary dark:text-outline-variant hover:text-primary transition-colors">
              About
            </Link>
          </nav>}

          {/* Sync indicator */}
          <div className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-surface-container-low dark:bg-surface-container shadow-[0_1px_4px_rgba(23,33,61,0.02)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant dark:text-outline-variant">Synced</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container dark:text-outline-variant dark:hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => navigate('/notifications')}
            aria-label="View gentle notifications"
            className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container dark:text-outline-variant dark:hover:bg-surface-container-high sm:flex"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="w-2 h-2 rounded-full bg-primary absolute top-2 right-2"></span>
          </button>

          {/* Profile Avatar / Settings Shortcut or Sign In */}
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md text-primary ring-2 ring-primary/20 transition-transform active:scale-95 dark:bg-secondary-container/40"
              aria-label={`User Profile (${user?.displayName || 'Traveler'})`}
            >
              <span className="font-semibold text-primary">{userInitial}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary-container px-2 text-xs font-semibold text-on-primary-container transition-all hover:bg-primary sm:px-3"
              aria-label="Sign In"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
