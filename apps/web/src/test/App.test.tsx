import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Steplight AI Phase 2 Comprehensive Test Suite', () => {
  beforeEach(() => {
    window.history.pushState({}, 'Test', '/');
    document.documentElement.classList.remove('dark');
  });

  // 1. Core Converted Screens
  it('renders the guest dashboard hero and empathetic greeting', () => {
    render(<App />);
    expect(screen.getByText(/Guest Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/What feels manageable today\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Every meaningful journey begins with one small step/i)).toBeInTheDocument();
  });

  it('renders primary navigation items', () => {
    render(<App />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tasks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Step')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  // 2. Marketing & Public Pages
  it('renders public landing page at /welcome', () => {
    window.history.pushState({}, 'Landing', '/welcome');
    render(<App />);
    expect(screen.getByText(/Overcome executive overwhelm\. Find your next 2 minutes\./i)).toBeInTheDocument();
    expect(screen.getByText(/Get Started Gently/i)).toBeInTheDocument();
  });

  it('renders features page with Smart Focus coming soon label at /features', () => {
    window.history.pushState({}, 'Features', '/features');
    render(<App />);
    expect(screen.getByText(/Features Built for Cognitive Calm/i)).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText(/3-Tier Energy Calibration/i)).toBeInTheDocument();
  });

  it('renders how it works page at /how-it-works', () => {
    window.history.pushState({}, 'How It Works', '/how-it-works');
    render(<App />);
    expect(screen.getByText(/How Steplight AI Works/i)).toBeInTheDocument();
    expect(screen.getByText(/Name the Overwhelming Thing/i)).toBeInTheDocument();
  });

  it('renders about page for Team OLYMPUS at /about', () => {
    window.history.pushState({}, 'About', '/about');
    render(<App />);
    expect(screen.getByText(/About Steplight AI & Team OLYMPUS/i)).toBeInTheDocument();
    expect(screen.getByText(/Our Core Manifesto/i)).toBeInTheDocument();
  });

  it('renders FAQ page at /faq', () => {
    window.history.pushState({}, 'FAQ', '/faq');
    render(<App />);
    expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Does Steplight AI have streaks or punishments\?/i)).toBeInTheDocument();
  });

  it('renders privacy policy at /privacy', () => {
    window.history.pushState({}, 'Privacy', '/privacy');
    render(<App />);
    expect(screen.getByText(/Data Privacy & Trust/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Third-Party Advertising & Tracking/i)).toBeInTheDocument();
  });

  it('renders terms of care at /terms', () => {
    window.history.pushState({}, 'Terms', '/terms');
    render(<App />);
    expect(screen.getAllByText(/Terms of Care/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Non-Diagnostic Supportive Technology/i).length).toBeGreaterThanOrEqual(1);
  });

  // 3. Authentication Pages
  it('renders the login page without backend implementation details', () => {
    window.history.pushState({}, 'Login', '/login');
    render(<App />);
    expect(screen.getAllByText(/Welcome Back/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Live Backend Authentication|Argon2id|JWT sessions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Enter with Instant Demo Account/i)).toBeInTheDocument();
  });

  it('renders signup page at /signup', () => {
    window.history.pushState({}, 'Signup', '/signup');
    render(<App />);
    expect(screen.getByText(/Create Your Safe Space/i)).toBeInTheDocument();
    expect(screen.getByText(/Default Starting Energy/i)).toBeInTheDocument();
  });

  it('renders forgot password page at /forgot-password', () => {
    window.history.pushState({}, 'Forgot Password', '/forgot-password');
    render(<App />);
    expect(screen.getByText(/Reset Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Send Single-Use Reset Link/i)).toBeInTheDocument();
  });

  it('renders reset password page at /reset-password', () => {
    window.history.pushState({}, 'Reset Password', '/reset-password');
    render(<App />);
    expect(screen.getByText(/Choose a New Password/i)).toBeInTheDocument();
  });

  it('renders confirmation page at /confirmation', () => {
    window.history.pushState({}, 'Confirmation', '/confirmation');
    render(<App />);
    expect(screen.getByText(/You're In/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Gentle Onboarding/i)).toBeInTheDocument();
  });

  // 4. Onboarding
  it('renders multi-step onboarding wizard at /onboarding', () => {
    window.history.pushState({}, 'Onboarding', '/onboarding');
    render(<App />);
    expect(screen.getByText(/Gentle Onboarding • Step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Check In With Your Baseline/i)).toBeInTheDocument();
  });

  // 5. Task Management
  it('redirects unauthenticated task list visitors to login', async () => {
    window.history.pushState({}, 'All Tasks', '/tasks/all');
    render(<App />);
    expect(await screen.findAllByText(/Welcome Back/i)).not.toHaveLength(0);
  });

  it('redirects unauthenticated task detail visitors to login', async () => {
    window.history.pushState({}, 'Task Detail', '/tasks/dbms-prep');
    render(<App />);
    expect(await screen.findAllByText(/Welcome Back/i)).not.toHaveLength(0);
  });

  it('redirects unauthenticated task edit visitors to login', async () => {
    window.history.pushState({}, 'Task Edit', '/tasks/dbms-prep/edit');
    render(<App />);
    expect(await screen.findAllByText(/Welcome Back/i)).not.toHaveLength(0);
  });

  // 6. Execution & Pacing
  it('renders micro-celebration completion page at /completed', () => {
    window.history.pushState({}, 'Completed', '/completed');
    render(<App />);
    expect(screen.getByText(/You showed up\. That counts\./i)).toBeInTheDocument();
    expect(screen.getByText(/Micro-Step Accomplished/i)).toBeInTheDocument();
  });

  it('renders rest and pacing breathing bubble at /rest', () => {
    window.history.pushState({}, 'Rest', '/rest');
    render(<App />);
    expect(screen.getByText(/Rest Is Productive Too\./i)).toBeInTheDocument();
    expect(screen.getByText(/Self-Care Sanctuary/i)).toBeInTheDocument();
  });

  it('renders task history archive at /history', () => {
    window.history.pushState({}, 'History', '/history');
    render(<App />);
    expect(screen.getByText(/Activity & Compassion Log/i)).toBeInTheDocument();
    expect(screen.getByText(/Pauses saved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Steps' }));
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders explainability page at /explainability', () => {
    window.history.pushState({}, 'Explainability', '/explainability');
    render(<App />);
    expect(screen.getAllByText(/Why This Step\?/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Reviewed suggestions/i).length).toBeGreaterThan(0);
  });

  it('renders AI transparency page at /ai-transparency', () => {
    window.history.pushState({}, 'AI Transparency', '/ai-transparency');
    render(<App />);
    expect(screen.getByText(/What the AI Sees/i)).toBeInTheDocument();
    expect(screen.getByText(/Data sent to Google on an opted-in generation/i)).toBeInTheDocument();
    expect(screen.getByText(/Up to five retrieved strategy candidates/i)).toBeInTheDocument();
  });

  // 7. System, Account & Error
  it('redirects unauthenticated profile visitors to login', async () => {
    window.history.pushState({}, 'Profile', '/profile');
    render(<App />);
    expect(await screen.findAllByText(/Welcome Back/i)).not.toHaveLength(0);
  });

  it('renders help and crisis support at /help', () => {
    window.history.pushState({}, 'Help', '/help');
    render(<App />);
    expect(screen.getByText(/Support, Safety & Guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/988 Suicide & Crisis Lifeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Keyboard Navigation Shortcuts/i)).toBeInTheDocument();
  });

  it('renders gentle notifications at /notifications', () => {
    window.history.pushState({}, 'Notifications', '/notifications');
    render(<App />);
    expect(screen.getByText(/Gentle Notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Place Is Saved/i)).toBeInTheDocument();
  });

  it('shows an opt-in native notification control only in the desktop renderer', async () => {
    window.history.pushState({}, 'Settings', '/settings');
    const getDesktopSettings = vi.fn().mockResolvedValue({
      nativeNotificationsEnabled: false,
      notificationsSupported: true,
    });
    const setNativeNotificationsEnabled = vi.fn().mockResolvedValue({
      nativeNotificationsEnabled: true,
      notificationsSupported: true,
    });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        isDesktop: true,
        platform: 'win32',
        getDesktopSettings,
        setNativeNotificationsEnabled,
        notifyStepCompleted: vi.fn(),
      },
    });

    try {
      render(<App />);
      const notificationSwitch = await screen.findByRole('switch', {
        name: /Enable native step-finished notifications/i,
      });
      expect(notificationSwitch).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(notificationSwitch);
      await waitFor(() => expect(setNativeNotificationsEnabled).toHaveBeenCalledWith(true));
      await waitFor(() => expect(notificationSwitch).toHaveAttribute('aria-checked', 'true'));
    } finally {
      delete (window as Window & { electronAPI?: Window['electronAPI'] }).electronAPI;
    }
  });

  it('renders offline reassurance at /offline', () => {
    window.history.pushState({}, 'Offline', '/offline');
    render(<App />);
    expect(screen.getByText(/Connection Status|Working Without a Connection/i)).toBeInTheDocument();
    expect(screen.getByText(/Changes are not saved or queued while offline/i)).toBeInTheDocument();
    expect(screen.getByText(/^Check connection$/i)).toBeInTheDocument();
  });

  it('renders compassionate 404 page for unknown routes', () => {
    window.history.pushState({}, 'Not Found', '/some-unknown-path-xyz');
    render(<App />);
    expect(screen.getByText(/Lost your way\? Zero shame\./i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Dashboard/i)).toBeInTheDocument();
  });

  // 8. Theme Toggling
  it('toggles light/dark theme', () => {
    window.history.pushState({}, 'Settings', '/settings');
    render(<App />);

    const geminiSwitch = screen.getByRole('switch', { name: /Allow Gemini to use task details/i });
    expect(geminiSwitch).toHaveAttribute('aria-checked', 'false');
    expect(geminiSwitch).toBeDisabled();

    const darkBtn = screen.getByText('Dark');
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const lightBtn = screen.getByText('Light');
    fireEvent.click(lightBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // 9. Global Keyboard Navigation
  it('navigates with keyboard shortcut Alt+P to progress', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'p', altKey: true });
    expect(screen.getByText(/Your Progress/i)).toBeInTheDocument();
  });

  it('navigates with keyboard shortcut Alt+H to help', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'h', altKey: true });
    expect(screen.getByText(/Support, Safety & Guidance/i)).toBeInTheDocument();
  });
});
