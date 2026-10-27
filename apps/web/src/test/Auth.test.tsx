import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

describe('Steplight AI Phase 3 Frontend Authentication Integration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders login page with inputs and submits credentials to backend', async () => {
    const mockAuthResponse = {
      access_token: 'fake-access-jwt-token',
      refresh_token: 'fake-refresh-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: 'user-123',
        email: 'demo@steplight.ai',
        display_name: 'Gentle Traveler',
        baseline_capacity: 'medium',
        is_active: true,
        created_at: '2026-10-24T00:00:00Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockAuthResponse,
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'demo@steplight.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'gentlestep123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(localStorage.getItem('steplight_access_token')).toBe('fake-access-jwt-token');
      expect(localStorage.getItem('steplight_refresh_token')).toBe('fake-refresh-token');
    });
  });

  it('handles failed login with generic user-friendly error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/login')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Invalid email or password.' }),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'WrongPassword123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email or password\./i);
    });
  });

  it('triggers instant demo login with single click', async () => {
    const mockAuthResponse = {
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: 'demo-user-id',
        email: 'demo@steplight.ai',
        display_name: 'Gentle Traveler',
        baseline_capacity: 'medium',
        is_active: true,
        created_at: '2026-10-24T00:00:00Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockAuthResponse,
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const demoBtn = screen.getByText(/Enter with Instant Demo Account/i);
    fireEvent.click(demoBtn);

    await waitFor(() => {
      expect(localStorage.getItem('steplight_access_token')).toBe('demo-access-token');
    });
  });

  it('registers new account and sets energy preference', async () => {
    const mockRegResponse = {
      access_token: 'reg-access-token',
      refresh_token: 'reg-refresh-token',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: 'new-id',
        email: 'newtraveler@steplight.ai',
        display_name: 'New Traveler',
        baseline_capacity: 'medium',
        is_active: true,
        created_at: '2026-10-24T00:00:00Z',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/register')) {
        return {
          ok: true,
          status: 201,
          json: async () => mockRegResponse,
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <SignupPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/What should we call you\?/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Create Password/i);
    const createBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(nameInput, { target: { value: 'New Traveler' } });
    fireEvent.change(emailInput, { target: { value: 'newtraveler@steplight.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePassword123' } });

    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(localStorage.getItem('steplight_access_token')).toBe('reg-access-token');
    });
  });

  it('dispatches password reset to development email sink', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/forgot-password')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'If an account exists with this email, password reset instructions have been generated in the development sink.',
          }),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <AuthProvider>
          <ForgotPasswordPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Your Account Email/i);
    const submitBtn = screen.getByRole('button', { name: /Send Single-Use Reset Link/i });

    fireEvent.change(emailInput, { target: { value: 'demo@steplight.ai' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Instructions Requested/i)).toBeInTheDocument();
      expect(screen.queryByText(/Development Email Sink|backend\/dev_email_sink\.log/i)).not.toBeInTheDocument();
    });
  });

  it('resets password with single-use token', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/auth/reset-password')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: 'Password has been successfully updated.' }),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Not found' }),
      } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-single-use-token']}>
        <AuthProvider>
          <ResetPasswordPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const tokenInput = screen.getByLabelText(/Reset Token/i) as HTMLInputElement;
    expect(tokenInput.value).toBe('test-single-use-token');

    const newPwdInput = screen.getByLabelText(/^New Password/i);
    const confirmPwdInput = screen.getByLabelText(/Confirm New Password/i);
    const submitBtn = screen.getByRole('button', { name: /Save New Password/i });

    fireEvent.change(newPwdInput, { target: { value: 'UpdatedPassword123' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'UpdatedPassword123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('verifies backend secrets are completely isolated and NOT exposed to client bundle', () => {
    const rawEnv = import.meta.env as unknown as Record<string, unknown>;

    // Sensitive backend-only environment variables
    expect(rawEnv['GEMINI_API_KEY']).toBeUndefined();
    expect(rawEnv['JWT_SECRET_KEY']).toBeUndefined();
    expect(rawEnv['DATABASE_URL']).toBeUndefined();

    // Whitelisted client variables
    expect(import.meta.env.VITE_APP_NAME).toBeDefined();
    expect(import.meta.env.VITE_API_BASE_URL).toBeDefined();
  });
});
