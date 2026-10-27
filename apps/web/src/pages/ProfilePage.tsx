import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CapacityLevel } from '@steplight/shared';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.displayName || 'Gentle Traveler');
  const [preferredEnergy, setPreferredEnergy] = useState<CapacityLevel>(user?.baselineCapacity || 'medium');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName);
      setPreferredEnergy(user.baselineCapacity);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: name,
        baselineCapacity: preferredEnergy,
      });
      setNotice('Profile preferences saved safely!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save profile.';
      setNotice(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setNotice('Signing out gently...');
    await logout();
    navigate('/login');
  };

  const initial = name ? name.trim().charAt(0).toUpperCase() : 'T';

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>User Account</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight mt-1">
          Your Profile &amp; Preferences
        </h1>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          Manage your personal identifiers and energy defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary-container text-primary flex items-center justify-center font-bold text-2xl shadow-inner">
            {initial}
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface">
              {user?.displayName || name}
            </span>
            <span className="text-xs text-secondary dark:text-outline-variant">{user?.email || 'Authenticated User'}</span>
            <span className="text-[11px] text-primary font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">verified_user</span>
              <span>Your account</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-name" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
            Display Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
            Default Energy Tendency
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setPreferredEnergy(lvl)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  preferredEnergy === lvl
                    ? 'bg-secondary-container text-primary ring-2 ring-primary'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                }`}
              >
                {lvl} Energy
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs text-center font-medium animate-fadeIn border border-emerald-200 dark:border-emerald-800">
            {notice}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all font-semibold"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Profile</span>
            )}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full sm:w-auto px-5 h-12 rounded-xl bg-surface-container-low dark:bg-surface-container text-error hover:bg-error-container hover:text-on-error-container transition-colors font-label-md text-label-md font-medium"
          >
            Sign Out
          </button>
        </div>
      </form>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Link
          to="/settings"
          className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-2 text-secondary dark:text-outline-variant font-medium"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
          <span>System Settings</span>
        </Link>
        <Link
          to="/history"
          className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container hover:bg-surface-container-high transition-colors flex items-center gap-2 text-secondary dark:text-outline-variant font-medium"
        >
          <span className="material-symbols-outlined text-[18px] text-tertiary">history</span>
          <span>View Past Activity</span>
        </Link>
      </div>
    </div>
  );
};
