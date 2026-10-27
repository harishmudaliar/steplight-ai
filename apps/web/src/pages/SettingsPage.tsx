import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout, apiClient } = useAuth();
  const [defaultCapacity, setDefaultCapacity] = useState<'low' | 'medium' | 'high'>('low');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [geminiConsent, setGeminiConsent] = useState(false);
  const [geminiConsentLoading, setGeminiConsentLoading] = useState(false);
  const [geminiPreferenceLoading, setGeminiPreferenceLoading] = useState(isAuthenticated);
  const [geminiConsentError, setGeminiConsentError] = useState<string | null>(null);
  const isDesktop = Boolean(window.electronAPI?.isDesktop);
  const [nativeNotificationsEnabled, setNativeNotificationsEnabled] = useState(false);
  const [nativeNotificationsSupported, setNativeNotificationsSupported] = useState(false);
  const [nativeNotificationsLoading, setNativeNotificationsLoading] = useState(isDesktop);
  const [nativeNotificationsError, setNativeNotificationsError] = useState<string | null>(null);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setGeminiConsent(false);
      setGeminiPreferenceLoading(false);
      return;
    }
    let active = true;
    setGeminiPreferenceLoading(true);
    apiClient.getPreferences()
      .then((preferences) => {
        if (active) setGeminiConsent(preferences.geminiPersonalizationEnabled);
      })
      .catch(() => {
        if (active) setGeminiConsentError('Could not load your AI preferences. Please try again.');
      })
      .finally(() => {
        if (active) setGeminiPreferenceLoading(false);
      });
    return () => { active = false; };
  }, [apiClient, isAuthenticated]);

  useEffect(() => {
    const desktopApi = window.electronAPI;
    if (!desktopApi) return;
    let active = true;
    desktopApi.getDesktopSettings()
      .then((settings) => {
        if (!active) return;
        setNativeNotificationsEnabled(settings.nativeNotificationsEnabled);
        setNativeNotificationsSupported(settings.notificationsSupported);
      })
      .catch(() => {
        if (active) setNativeNotificationsError('Could not load notification settings. Please try again.');
      })
      .finally(() => {
        if (active) setNativeNotificationsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleExportData = async () => {
    if (!isAuthenticated) return;
    setExportNotice(null);
    try {
      const data = await apiClient.exportAccountData();
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `steplight-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportNotice('Your account export was downloaded.');
    } catch (error: unknown) {
      setExportNotice('Export failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGeminiConsentChange = async () => {
    if (!isAuthenticated || geminiConsentLoading) return;
    const nextValue = !geminiConsent;
    setGeminiConsentLoading(true);
    setGeminiConsentError(null);
    try {
      const updated = await apiClient.updatePreferences({ geminiPersonalizationEnabled: nextValue });
      setGeminiConsent(updated.geminiPersonalizationEnabled);
    } catch (error: unknown) {
      setGeminiConsentError('Could not update your AI preferences. Please try again.');
    } finally {
      setGeminiConsentLoading(false);
    }
  };

  const handleNativeNotificationsChange = async () => {
    const desktopApi = window.electronAPI;
    if (!desktopApi || nativeNotificationsLoading) return;
    setNativeNotificationsLoading(true);
    setNativeNotificationsError(null);
    try {
      const updated = await desktopApi.setNativeNotificationsEnabled(!nativeNotificationsEnabled);
      setNativeNotificationsEnabled(updated.nativeNotificationsEnabled);
      setNativeNotificationsSupported(updated.notificationsSupported);
    } catch (error: unknown) {
      setNativeNotificationsError('Could not update notification settings. Please try again.');
    } finally {
      setNativeNotificationsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed || !deletePassword || isDeletingAccount) return;
    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await apiClient.deleteAccount(deletePassword);
      await logout();
      navigate('/login', { replace: true });
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'Account deletion failed. Your account remains active.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Header Banner */}
      <div className="rounded-2xl bg-surface-container-low dark:bg-surface-container-low/30 p-space-md border border-surface-container-high/50 flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Your preferences</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface dark:text-inverse-on-surface font-semibold tracking-tight mt-1">
          Application Settings
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Make Steplight feel comfortable and work the way you prefer.
        </p>
      </div>

      {/* Theme & Sensory Preferences */}
      <section className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-4">
        <h2 className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
          Appearance &amp; Sensory Pacing
        </h2>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-on-surface dark:text-inverse-on-surface">Color Theme</span>
              <span className="text-xs text-secondary dark:text-outline-variant">Switch between gentle luminous and dark modes</span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-container-low dark:bg-surface-container">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  theme === 'light' ? 'bg-surface-container-lowest dark:bg-surface-container-high text-primary shadow-sm' : 'text-secondary'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">light_mode</span>
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  theme === 'dark' ? 'bg-surface-container-lowest dark:bg-surface-container-high text-primary shadow-sm' : 'text-secondary'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">dark_mode</span>
                <span>Dark</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40">
            <div className="flex flex-col">
              <span className="font-medium text-on-surface dark:text-inverse-on-surface">Default Energy Level</span>
              <span className="text-xs text-secondary dark:text-outline-variant">Your baseline starting capacity</span>
            </div>
            <div className="flex gap-1.5">
              {(['low', 'medium', 'high'] as const).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setDefaultCapacity(cap)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    defaultCapacity === cap
                      ? 'bg-secondary-container text-primary ring-1 ring-primary'
                      : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40">
            <div className="flex flex-col">
              <span className="font-medium text-on-surface dark:text-inverse-on-surface">Tactile Sound Effects</span>
              <span className="text-xs text-secondary dark:text-outline-variant">Soft micro-haptics on step completion</span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                soundEnabled ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {isDesktop && (
        <section className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-3">
          <h2 className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
            Windows Notifications
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-on-surface dark:text-inverse-on-surface">Gentle step-finished reminder</span>
              <span className="text-xs text-secondary dark:text-outline-variant">
                When enabled, a brief native notification appears after you mark a step done while Steplight is not focused. Windows notification settings also apply. No task title or personal details are included.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={nativeNotificationsEnabled}
              aria-label="Enable native step-finished notifications"
              disabled={(!nativeNotificationsSupported && !nativeNotificationsEnabled) || nativeNotificationsLoading}
              onClick={handleNativeNotificationsChange}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                nativeNotificationsEnabled ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container'
              } disabled:opacity-50`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${nativeNotificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          {!nativeNotificationsSupported && (
            <p className="text-xs text-secondary dark:text-outline-variant">Native notifications are not supported on this device.</p>
          )}
          {nativeNotificationsError && <p role="alert" className="text-xs text-error">{nativeNotificationsError}</p>}
        </section>
      )}

      <section className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-3">
        <h2 className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
          Optional Gemini Suggestions
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface dark:text-inverse-on-surface">Allow Gemini to use task details</span>
            <span className="text-xs text-secondary dark:text-outline-variant">
              When enabled, Steplight may share this task's title, optional context, capacity, and your preferred step duration with Google Gemini. Turn this off at any time; local suggestions remain available.
            </span>
            {!isAuthenticated && (
              <span className="text-xs text-secondary dark:text-outline-variant">Sign in to manage this account preference.</span>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={geminiConsent}
            aria-label="Allow Gemini to use task details"
            disabled={!isAuthenticated || geminiConsentLoading || geminiPreferenceLoading}
            onClick={handleGeminiConsentChange}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              geminiConsent ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container'
            } disabled:opacity-50`}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${geminiConsent ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        {geminiConsentError && <p role="alert" className="text-xs text-error">{geminiConsentError}</p>}
        <p className="text-xs text-secondary dark:text-outline-variant">
          Google processes the request under its service terms. No prompt text is stored in Steplight's generation metadata. Suggestions are not medical advice.
        </p>
      </section>

      {/* Active Session & Authentication Section */}
      <section className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">account_circle</span>
            Account &amp; Session Status
          </h2>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isAuthenticated
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}>
            {isAuthenticated ? 'Authenticated' : 'Guest Mode'}
          </span>
        </div>

        <div className="p-3 bg-surface-container-low dark:bg-surface-container rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-on-surface dark:text-inverse-on-surface text-sm">
              {user ? user.displayName : 'Guest Traveler'}
            </span>
            <span className="text-secondary dark:text-outline-variant font-mono">
              {user ? user.email : 'No persistent session active'}
            </span>
            {user && (
              <span className="text-[11px] text-primary mt-1">
                Baseline Capacity: <strong className="capitalize">{user.baselineCapacity}</strong>
              </span>
            )}
          </div>
          <div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-error-container/40 text-on-error-container hover:bg-error-container text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-semibold transition-opacity flex items-center gap-1.5 inline-flex"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Planned distraction blocker */}
      <section className="rounded-xl bg-surface-container-low dark:bg-surface-container-low/30 p-space-md border border-dashed border-primary/40 flex items-start gap-space-sm">
        <div className="w-8 h-8 rounded-full bg-secondary-container dark:bg-secondary-container/30 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[18px]">lock_clock</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold">
              Smart Focus &amp; Site Blocking
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
              Planned
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Optional app and website blocking is planned for a future update and is not active right now.
          </p>
        </div>
      </section>

      {/* Data Management & Export */}
      <section className="rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-3">
        <h2 className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface font-semibold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px]">database</span>
          Data Management
        </h2>
        {exportNotice && (
          <div role={exportNotice.startsWith('Export failed') ? 'alert' : 'status'} className="p-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-medium animate-fadeIn">
            {exportNotice}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleExportData()}
            disabled={!isAuthenticated}
            className="px-4 h-10 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Account JSON</span>
          </button>
          <Link
            to="/ai-transparency"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <span>AI Transparency Details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
        <p className="text-xs text-secondary dark:text-outline-variant">
          Account data and activity are retained while the account exists. Automatic age-based deletion is not currently configured.
          {!isAuthenticated && ' Sign in to export account data.'}
        </p>
        {isAuthenticated && (
          <div className="pt-3 border-t border-surface-container-high/60">
            {!deletePanelOpen ? (
              <button
                type="button"
                onClick={() => setDeletePanelOpen(true)}
                className="text-xs font-semibold text-error hover:underline"
              >
                Delete account and its stored data…
              </button>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error-container/20 p-4">
                <h3 className="text-sm font-semibold text-on-surface">Permanently delete this account?</h3>
                <p className="text-xs text-secondary">
                  This removes your profile, tasks, steps, preferences, activity, and associated records from the application database. This cannot be undone.
                </p>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Confirm your password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    className="h-10 rounded-lg border border-surface-container-high bg-surface-container-lowest px-3 text-sm"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(event) => setDeleteConfirmed(event.target.checked)}
                  />
                  I understand this permanently deletes my account data.
                </label>
                {deleteError && <p role="alert" className="text-xs text-error">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!deletePassword || !deleteConfirmed || isDeletingAccount}
                    onClick={() => void handleDeleteAccount()}
                    className="px-3 py-2 rounded-lg bg-error text-on-error text-xs font-semibold disabled:opacity-50"
                  >
                    {isDeletingAccount ? 'Deleting…' : 'Permanently delete account'}
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={() => {
                      setDeletePanelOpen(false);
                      setDeletePassword('');
                      setDeleteConfirmed(false);
                      setDeleteError(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
