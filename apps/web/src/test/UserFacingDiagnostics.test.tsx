import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  isAuthenticated: false as boolean,
  getActivitySummary: vi.fn(),
  getPreferences: vi.fn(),
  apiClient: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: mocks.isAuthenticated,
    logout: vi.fn(),
    apiClient: mocks.apiClient,
  }),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() }),
}));

import { SettingsPage } from '../pages/SettingsPage';
import { ProgressPage } from '../pages/ProgressPage';

describe('user-facing diagnostics audit', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.isAuthenticated = false;
    mocks.apiClient.getPreferences = mocks.getPreferences;
    mocks.apiClient.getActivitySummary = mocks.getActivitySummary;
    mocks.getPreferences.mockResolvedValue({ geminiPersonalizationEnabled: false });
  });

  it('does not render developer secret or client configuration details in Settings', async () => {
    mocks.getPreferences.mockResolvedValue({ geminiPersonalizationEnabled: false });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await waitFor(() => expect(mocks.getPreferences).not.toHaveBeenCalled());

    expect(screen.getByRole('heading', { name: 'Application Settings' })).toBeInTheDocument();
    expect(screen.queryByText(/Security & Secret Isolation|GEMINI_API_KEY|JWT_SECRET_KEY|DATABASE_URL|Vite Whitelisted Variables|Client Configuration|API Base URL/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/127\.0\.0\.1:\d+|localhost:\d+|VITE_/i)).not.toBeInTheDocument();
  });

  it('shows user activity without requesting or rendering backend health and version diagnostics', async () => {
    mocks.getActivitySummary = vi.fn();
    mocks.apiClient.getActivitySummary = mocks.getActivitySummary;
    render(<ProgressPage />);

    expect(await screen.findByText('Sign in to see the progress events saved to your account.')).toBeInTheDocument();
    expect(mocks.getActivitySummary).not.toHaveBeenCalled();
    expect(screen.queryByText(/FastAPI|Backend Connection|Connected|Unavailable|127\.0\.0\.1|API Base URL/i)).not.toBeInTheDocument();
  });

  it('uses a friendly message when activity loading fails', async () => {
    mocks.isAuthenticated = true;
    mocks.getActivitySummary = vi.fn().mockRejectedValue(new Error('Traceback at C:\\private\\server.py'));
    mocks.apiClient.getActivitySummary = mocks.getActivitySummary;
    render(<ProgressPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your progress right now. Please try again.');
    expect(screen.queryByText(/Traceback|server\.py|Backend Connection/i)).not.toBeInTheDocument();
  });
});
