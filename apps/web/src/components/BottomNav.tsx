import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const itemClass = ({ isActive }: { isActive: boolean }) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`;

export const BottomNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [moreOpen]);
  const moreActive = ['/goals', '/history', '/progress', '/settings', '/profile', '/notifications'].some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));
  return <>
    {moreOpen && <button aria-label="Close navigation menu" className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMoreOpen(false)} />}
    {moreOpen && <div id="mobile-more-menu" role="menu" aria-label="More destinations" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-3 z-50 w-52 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-2 shadow-xl lg:hidden">
      {[['/goals', 'Goals', 'flag'], ['/history', 'History', 'history'], ['/progress', 'Progress', 'insights'], ['/settings', 'Settings', 'settings'], ['/notifications', 'Notifications', 'notifications']].map(([to, label, icon]) => <NavLink key={to} role="menuitem" aria-label={label} to={to} className={({isActive}) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${isActive ? 'bg-secondary-container text-primary font-semibold' : 'text-on-surface hover:bg-surface-container-low'}`}><span aria-hidden="true" className="material-symbols-outlined text-[20px]">{icon}</span>{label}</NavLink>)}
    </div>}
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-container-high/70 bg-surface-container-lowest/95 pb-safe shadow-[0_-4px_20px_rgba(23,33,61,0.06)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
      <div className="mx-auto flex h-[4.25rem] max-w-xl items-stretch px-2">
        <NavLink to="/" end className={itemClass} aria-label="Dashboard"><span className="material-symbols-outlined text-[22px]">space_dashboard</span><span>Home</span></NavLink>
        <NavLink to="/planner" className={itemClass} aria-label="Today planner"><span className="material-symbols-outlined text-[22px]">today</span><span>Today</span></NavLink>
        <NavLink to="/step-sequencer" className={({isActive}) => `${itemClass({isActive})} relative`} aria-label="Step Sequencer"><span className="material-symbols-outlined -mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-[22px] text-on-primary-container shadow-md">auto_awesome</span><span>Step</span></NavLink>
        <NavLink to="/tasks/all" className={itemClass} aria-label="Tasks"><span className="material-symbols-outlined text-[22px]">checklist</span><span>Tasks</span></NavLink>
        <button type="button" aria-label="More" aria-haspopup="menu" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen(open => !open)} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium ${moreActive || moreOpen ? 'text-primary' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined text-[22px]" aria-hidden="true">{moreOpen ? 'close' : 'more_horiz'}</span><span aria-hidden="true">More</span></button>
      </div>
    </nav>
  </>;
};
