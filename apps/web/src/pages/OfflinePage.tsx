import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { readOfflineTaskIndex } from '../utils/offlineTaskIndex';

export const OfflinePage: React.FC = () => {
  const { apiClient, user } = useAuth();
  const online = useOnlineStatus();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const cachedIndex = user ? readOfflineTaskIndex(user.id) : null;

  const handleCheckConnection = async () => {
    setChecking(true);
    setStatusMsg(null);
    try {
      await apiClient.getHealth();
      setStatusMsg('Steplight is reachable. Your next refresh will load the latest shared state.');
    } catch {
      setStatusMsg('Steplight could not be reached yet. Your saved task status index is still available below.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-space-md text-center items-center py-4">
      <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-8 shadow-sm flex flex-col items-center gap-6 w-full">
        <div className="w-16 h-16 rounded-full bg-secondary-container text-primary flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-[36px]">{online ? 'cloud_done' : 'cloud_off'}</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight">
            {online ? 'Connection Status' : 'Working Without a Connection'}
          </h1>
          <p className="font-body-md text-body-md text-secondary dark:text-outline-variant leading-relaxed">
            {online
              ? 'Your saved tasks are linked to your account. Check your connection before refreshing.'
              : 'Previously loaded pages may remain available, but changes will not sync until you are back online.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-xs text-secondary dark:text-outline-variant text-left leading-relaxed w-full">
          <strong>Offline behavior:</strong> Changes are not saved or queued while offline. Reconnect and reload before editing so you work from the latest version. If another device changed a task, Steplight will ask you to reload rather than overwrite it.
        </div>

        {cachedIndex && (
          <section className="w-full text-left" aria-labelledby="offline-index-title">
            <h2 id="offline-index-title" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
              Saved status index ({cachedIndex.tasks.length})
            </h2>
            <p className="mt-1 text-xs text-secondary dark:text-outline-variant">
              Saved {new Date(cachedIndex.savedAt).toLocaleString()}. Only task status is available here.
            </p>
            <ul className="mt-3 divide-y divide-surface-container-high/60">
              {cachedIndex.tasks.map((task) => (
                <li key={task.id} className="py-2 flex justify-between gap-3 text-sm">
                  <span className="capitalize text-on-surface dark:text-inverse-on-surface">Task status</span>
                  <span className="capitalize text-secondary dark:text-outline-variant">{task.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {statusMsg && (
          <div role="status" aria-live="polite" className="p-3 rounded-lg bg-secondary-container dark:bg-secondary-container/40 text-on-secondary-container text-xs w-full">
            {statusMsg}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleCheckConnection}
            disabled={checking}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold"
          >
            {checking ? 'Checking connection...' : 'Check connection'}
          </button>
          <Link
            to="/"
            className="w-full h-11 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface font-label-md text-label-md flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
