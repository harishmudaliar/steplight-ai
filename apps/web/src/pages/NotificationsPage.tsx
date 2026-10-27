import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'gentle' | 'sync' | 'tip';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Your Place Is Saved',
    message: 'Your DBMS notes micro-step is safely waiting for you. Take your time.',
    time: '15 mins ago',
    read: false,
    type: 'gentle',
  },
  {
    id: 'n2',
    title: 'Cloud & Desktop Synced',
    message: 'All local changes were mirrored seamlessly across web and desktop.',
    time: '2 hours ago',
    read: false,
    type: 'sync',
  },
  {
    id: 'n3',
    title: 'Gentle Pacing Reminder',
    message: 'Whenever a step triggers resistance, remember you can shrink it to a 15-second action.',
    time: 'Yesterday',
    read: true,
    type: 'tip',
  },
];

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface tracking-tight">
            Gentle Notifications
          </h1>
          <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
            Supportive nudges with zero guilt or streak pressure.
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline font-medium"
            >
              Mark read
            </button>
            <span className="text-outline">&bull;</span>
            <button
              onClick={clearAll}
              className="text-xs text-secondary hover:text-error transition-colors font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface-container-low dark:bg-surface-container-low/20 border border-surface-container-high text-secondary dark:text-outline-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-primary">notifications_paused</span>
            <span className="font-semibold text-base text-on-surface dark:text-inverse-on-surface">All caught up</span>
            <p className="text-xs">No pending notifications. Enjoy your quiet, peaceful space.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                n.read
                  ? 'bg-surface-container-lowest/50 dark:bg-surface-container-lowest/20 border-surface-container-high/40 opacity-75'
                  : 'bg-surface-container-lowest dark:bg-surface-container-lowest/40 border-primary/30 shadow-sm'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-secondary-container dark:bg-secondary-container/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">
                  {n.type === 'gentle' ? 'spa' : n.type === 'sync' ? 'sync' : 'lightbulb'}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface truncate">
                    {n.title}
                  </span>
                  <span className="text-[11px] text-outline shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-secondary dark:text-outline-variant leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center gap-4 text-xs text-secondary dark:text-outline-variant pt-2">
        <Link to="/" className="text-primary hover:underline">
          Return to Dashboard
        </Link>
        <span>&bull;</span>
        <button
          onClick={() => navigate('/settings')}
          className="text-secondary dark:text-outline-variant hover:text-on-surface"
        >
          Notification Settings
        </button>
      </div>
    </div>
  );
};
