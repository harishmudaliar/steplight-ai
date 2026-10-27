import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import { Footer } from './Footer';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts while user is typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/');
            break;
          case 't':
            e.preventDefault();
            navigate('/tasks');
            break;
          case 's':
            e.preventDefault();
            navigate('/step-sequencer');
            break;
          case 'p':
            e.preventDefault();
            navigate('/progress');
            break;
          case 'h':
            e.preventDefault();
            navigate('/help');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const getPageMeta = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return { subtitle: 'Dashboard', showBack: false };
    if (path === '/tasks') return { subtitle: 'Tasks', showBack: true };
    if (path === '/goals') return { subtitle: 'Your Goals', showBack: false };
    if (path.startsWith('/goals/')) return { subtitle: 'Goal Roadmap', showBack: true };
    if (path === '/planner') return { subtitle: 'Today’s Planner', showBack: false };
    if (path === '/tasks/all') return { subtitle: 'All Tasks', showBack: true };
    if (path.startsWith('/tasks/')) return { subtitle: 'Task Details', showBack: true };
    if (path === '/step-sequencer') return { subtitle: 'Step Sequencer', showBack: true };
    if (path === '/adaptive-step') return { subtitle: 'Active Step Flow', showBack: true };
    if (path === '/progress') return { subtitle: 'Progress', showBack: false };
    if (path === '/history') return { subtitle: 'Task History', showBack: true };
    if (path === '/settings') return { subtitle: 'Settings', showBack: false };
    if (path === '/profile') return { subtitle: 'Profile', showBack: true };
    if (path === '/notifications') return { subtitle: 'Notifications', showBack: true };
    if (path === '/help') return { subtitle: 'Support & Help', showBack: true };
    if (path === '/explainability') return { subtitle: 'Why This Step?', showBack: true };
    if (path === '/ai-transparency') return { subtitle: 'AI Transparency', showBack: true };
    if (path === '/features') return { subtitle: 'Features', showBack: true };
    if (path === '/how-it-works') return { subtitle: 'How It Works', showBack: true };
    if (path === '/about') return { subtitle: 'About OLYMPUS', showBack: true };
    if (path === '/faq') return { subtitle: 'FAQ', showBack: true };
    if (path === '/privacy') return { subtitle: 'Privacy Policy', showBack: true };
    if (path === '/terms') return { subtitle: 'Terms of Care', showBack: true };
    if (path === '/login') return { subtitle: 'Welcome Back', showBack: true };
    if (path === '/signup') return { subtitle: 'Create Account', showBack: true };
    if (path === '/onboarding') return { subtitle: 'Gentle Setup', showBack: false };
    if (path === '/completed') return { subtitle: 'Celebration', showBack: true };
    if (path === '/rest') return { subtitle: 'Pacing & Rest', showBack: true };
    if (path === '/offline') return { subtitle: 'Offline Mode', showBack: true };
    return { subtitle: 'Steplight AI', showBack: true };
  };

  const meta = getPageMeta();
  const isMarketingOrLegal = [
    '/welcome',
    '/features',
    '/how-it-works',
    '/about',
    '/faq',
    '/privacy',
    '/terms',
  ].includes(location.pathname);
  const isAccountFlow = ['/login', '/signup', '/forgot-password', '/reset-password', '/confirmation', '/onboarding'].includes(location.pathname);
  const showAppNavigation = !isMarketingOrLegal && !isAccountFlow;

  return (
    <div className="app-shell bg-surface dark:bg-[#111726] font-body-md text-on-surface dark:text-[#eff1f4] flex flex-col min-h-screen selection:bg-secondary-container selection:text-primary transition-colors">
      {/* Skip to Content Accessibility Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] px-4 py-2 bg-primary text-on-primary rounded-lg shadow-lg font-semibold"
      >
        Skip to main content
      </a>

      <Header title="Steplight AI" subtitle={meta.subtitle} showBack={meta.showBack} showMarketingLinks={isMarketingOrLegal} />
      {!online && (
        <div role="status" aria-live="polite" className="relative z-20 w-full bg-secondary-container text-on-secondary-container px-4 py-2 text-center text-sm">
          Offline: changes are not saved or queued. Reconnect and reload before editing.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {showAppNavigation && <DesktopNav />}
        <main id="main-content" className={`app-main relative flex min-w-0 flex-1 flex-col px-gutter pt-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pt-7 lg:pb-10 ${isMarketingOrLegal ? 'mx-auto w-full max-w-4xl' : 'mx-auto w-full max-w-7xl'}`}>
          <Outlet />
        </main>
      </div>
      {isMarketingOrLegal && <Footer />}
      {showAppNavigation && <BottomNav />}
    </div>
  );
};
