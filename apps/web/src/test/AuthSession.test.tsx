import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { HashRouter, MemoryRouter, Link, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { SignupPage } from '../pages/SignupPage';
import { LoginPage } from '../pages/LoginPage';

const user = {
  id: 'session-user', email: 'session@example.com', display_name: 'Session Tester',
  baseline_capacity: 'medium', is_active: true, created_at: '2026-10-25T00:00:00Z',
};

function Dashboard() {
  const { user: profile, logout } = useAuth();
  return <><h1>Dashboard {profile?.displayName}</h1><button onClick={logout}>Logout</button></>;
}

function Content() {
  return <AuthProvider>
    <Link to="/">Dashboard</Link>
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/confirmation" element={<p>Registered</p>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  </AuthProvider>;
}

describe.each(['browser', 'electron hash'] as const)('%s auth session', (mode) => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '/signup';
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.location.hash = ''; });

  function mount(path = '/signup') {
    if (mode === 'electron hash') {
      window.location.hash = path;
      return render(<HashRouter><Content /></HashRouter>);
    }
    return render(<MemoryRouter initialEntries={[path]}><Content /></MemoryRouter>);
  }

  it('signs up, logs out, logs in and restores a saved session before guarding the dashboard', async () => {
    let resolveProfile: ((response: Response) => void) | undefined;
    const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) return new Promise<Response>(resolve => { resolveProfile = resolve; });
      if (url.endsWith('/auth/logout')) return response({ message: 'Logged out' });
      if (url.endsWith('/auth/register') || url.endsWith('/auth/login')) {
        return response({ access_token: 'access', refresh_token: 'refresh', user, token_type: 'bearer', expires_in: 1800 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    let view = mount();
    fireEvent.change(screen.getByLabelText(/What should we call you/i), { target: { value: user.display_name } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText(/Create Password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await screen.findByText('Registered');
    expect(fetchMock.mock.calls[0][0]).toBe(`${import.meta.env.VITE_API_BASE_URL}/auth/register`);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ email: user.email, display_name: user.display_name });
    expect(localStorage.getItem('steplight_refresh_token')).toBe('refresh');
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    await screen.findByRole('heading', { name: 'Dashboard Session Tester' });
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('button', { name: 'Sign In' });
    expect(localStorage.getItem('steplight_access_token')).toBeNull();
    expect(localStorage.getItem('steplight_refresh_token')).toBeNull();
    expect(fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/logout'))?.[1]?.body).toBe(JSON.stringify({ refresh_token: 'refresh' }));
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await screen.findByRole('heading', { name: 'Dashboard Session Tester' });
    view.unmount();
    view = mount('/');
    await waitFor(() => expect(resolveProfile).toBeDefined());
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
    resolveProfile!(response(user));
    await screen.findByRole('heading', { name: 'Dashboard Session Tester' });
    expect(fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/me'))?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access' });
    view.unmount();
  });
});
