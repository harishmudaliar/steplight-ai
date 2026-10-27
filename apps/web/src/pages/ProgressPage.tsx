import React, { useEffect, useState } from 'react';
import type { ActivitySummary } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';

export const ProgressPage: React.FC = () => {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiClient, isAuthenticated } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (!isAuthenticated) {
      setSummary(null);
      setLoading(false);
      return () => { active = false; };
    }
    apiClient.getActivitySummary()
      .then((activitySummary) => {
        if (!active) return;
        setSummary(activitySummary);
      })
      .catch(() => {
        if (active) setError('Unable to load your progress right now. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [apiClient, isAuthenticated]);

  const counts = summary ?? { totalEvents: 0, stepCompletions: 0, pauses: 0, resumes: 0, tasksCreated: 0 };
  const metrics: Array<{ icon: string; label: string; value: number }> = [
    { icon: 'check_circle', label: 'Steps completed', value: counts.stepCompletions },
    { icon: 'self_improvement', label: 'Pauses saved', value: counts.pauses },
    { icon: 'play_circle', label: 'Tasks resumed', value: counts.resumes },
    { icon: 'event_note', label: 'Tasks started', value: counts.tasksCreated },
  ];

  return (
    <div className="flex flex-col w-full gap-space-md">
      <div className="rounded-2xl bg-surface-container-low p-space-md border border-surface-container-high/50 flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">insights</span>
          <span>Gentle Progress • Zero Shame</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold tracking-tight mt-1">
          Your Progress
        </h1>
        <p className="font-body-md text-body-md text-secondary">
          A quiet summary of events you chose to record. These are not scores, goals, or streaks.
        </p>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-space-sm">
        {metrics.map(({ icon, label, value }) => (
          <div key={label} className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container-high/50 flex flex-col">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span className="font-label-sm text-label-sm font-semibold">{label}</span>
            </div>
            <span className="font-display-mobile text-display-mobile font-bold text-on-surface">
              {summary ? value : loading ? '…' : '—'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">stored activity events</span>
          </div>
        ))}
      </div>

      {!isAuthenticated && (
        <p className="rounded-xl bg-surface-container-low p-4 text-sm text-secondary">
          Sign in to see the progress events saved to your account.
        </p>
      )}

    </div>
  );
};
