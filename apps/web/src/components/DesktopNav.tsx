import React from 'react';
import { NavLink } from 'react-router-dom';

const destinations = [
  ['/', 'Dashboard', 'space_dashboard', true],
  ['/planner', 'Today', 'today'],
  ['/goals', 'Goals', 'flag'],
  ['/tasks/all', 'Tasks', 'checklist'],
  ['/history', 'History', 'history'],
  ['/step-sequencer', 'Step Sequencer', 'auto_awesome'],
  ['/progress', 'Progress', 'insights'],
  ['/settings', 'Settings', 'settings'],
] as const;

export const DesktopNav: React.FC = () => <aside className="hidden w-60 shrink-0 border-r border-surface-container-high/70 bg-surface-container-lowest/70 px-3 py-6 lg:block" aria-label="Application navigation">
  <nav className="sticky top-24 flex flex-col gap-1" aria-label="Primary navigation">
    {destinations.map(([to, label, icon, end]) => <NavLink key={to} to={to} end={end} className={({isActive}) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive ? 'bg-secondary-container font-semibold text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}>
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span><span>{label}</span>
    </NavLink>)}
  </nav>
</aside>;
