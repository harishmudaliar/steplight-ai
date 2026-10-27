import { describe, it, expect, vi } from 'vitest';
import { ApiClient, createApiClient } from './client';
import { resolveApiBaseUrl } from './config';

describe('ApiClient', () => {
  it('should initialize with default base URL and trim trailing slash', () => {
    const client = new ApiClient({ baseUrl: 'http://localhost:8000/api/' });
    expect(client).toBeDefined();
  });

  it('should successfully fetch health response', async () => {
    const mockResponse = {
      status: 'ok',
      app: 'Steplight AI',
      version: '1.0.0',
      environment: 'development',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.getHealth();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should successfully fetch version response', async () => {
    const mockResponse = {
      version: '1.0.0',
      app_name: 'Steplight AI',
      tagline: 'One Tiny Step. Zero Shame.',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = createApiClient('http://localhost:8000/api');
    // Inject mock fetch
    (client as unknown as { fetchFn: typeof fetch }).fetchFn = mockFetch as unknown as typeof fetch;

    const result = await client.getVersion();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/version',
      expect.anything()
    );
    expect(result).toEqual(mockResponse);
  });

  it('sanitizes unexpected server details and validation payloads', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Traceback: DATABASE_URL=postgres://private/path' }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getHealth()).rejects.toThrow('Something went wrong. Please try again.');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: [{ msg: 'invalid input', input: 'private value' }] }),
    });
    await expect(client.getHealth()).rejects.toThrow('Please check the information and try again.');
  });

  it('preserves safe retryable plan errors', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ detail: 'Gemini could not generate a valid plan. Please retry.' }),
      }) as unknown as typeof fetch,
    });
    await expect(client.getHealth()).rejects.toThrow('Gemini could not generate a valid plan. Please retry.');
  });

  it('should authenticate user and store token', async () => {
    const mockAuthResponse = {
      access_token: 'fake-jwt-token-12345',
      refresh_token: 'fake-refresh-token-67890',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: 'u1',
        email: 'traveler@steplight.ai',
        display_name: 'Gentle Traveler',
        baseline_capacity: 'medium',
        is_active: true,
        created_at: '2026-10-24T00:00:00Z',
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAuthResponse,
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const tokens = await client.login({
      email: 'traveler@steplight.ai',
      password: 'gentlestep123',
    });

    expect(tokens.accessToken).toBe('fake-jwt-token-12345');
    expect(tokens.user.displayName).toBe('Gentle Traveler');
    expect(client.getToken()).toBe('fake-jwt-token-12345');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'traveler@steplight.ai', password: 'gentlestep123' }),
      })
    );
  });

  it('keeps credential failures distinct from network failures', async () => {
    const invalidCredentialsClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid email or password.' }),
      }) as unknown as typeof fetch,
    });
    await expect(invalidCredentialsClient.login({ email: 'person@example.test', password: 'wrong-password' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid email or password.' });

    const offlineClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch,
    });
    await expect(offlineClient.login({ email: 'person@example.test', password: 'test-password' }))
      .rejects.toMatchObject({ status: 0, message: 'Unable to connect right now. Check your connection and try again.' });
  });

  it('should inject Authorization Bearer header when token is set', async () => {
    const mockTasks = {
      tasks: [{
        id: 't1',
        user_id: 'u1',
        title: 'Breathe',
        capacity: 'low',
        status: 'in_progress',
        steps: [],
        created_at: '2026-10-24T00:00:00Z',
        updated_at: '2026-10-24T00:00:00Z',
      }],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTasks,
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
      initialToken: 'existing-secret-token',
    });

    const tasks = await client.getTasks();
    expect(tasks.tasks).toHaveLength(1);
    expect(tasks.tasks[0].status).toBe('active');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer existing-secret-token',
        }),
      })
    );
  });

  it('submits feedback with an idempotency key and maps the persisted transition', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'cant',
        state: 'active',
        task_status: 'active',
        task_version: 3,
        step: {
          id: 'step-smaller',
          task_id: 'task-1',
          order: 2,
          title: 'Find one related item, then stop.',
          reason: 'Suggested locally from recent feedback.',
          estimated_duration: 15,
          strategy: 'adaptive_smaller_step',
          status: 'pending',
          completed_at: null,
          created_at: '2026-10-25T00:00:00Z',
        },
        message: 'Here is a smaller optional action.',
      }),
    });
    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
      initialToken: 'access-token',
    });

    const result = await client.submitStepFeedback(
      'task-1',
      { action: 'cant', stepId: 'step-1' },
      'stable-request-key'
    );

    expect(result.step?.title).toBe('Find one related item, then stop.');
    expect(result.taskStatus).toBe('active');
    expect(result.taskVersion).toBe(3);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks/task-1/feedback',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'stable-request-key' }),
        body: JSON.stringify({ action: 'cant', step_id: 'step-1' }),
      })
    );
  });

  it('loads filtered activity pages and account privacy controls', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [{
            id: 'event-1',
            user_id: 'user-1',
            event_type: 'step_completed',
            metadata_json: '{"source":"LOCAL_RAG"}',
            created_at: '2026-10-25T00:00:00Z',
          }],
          total: 1,
          page: 2,
          page_size: 10,
          pages: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exported_at: '2026-10-25T00:00:00Z',
          retention: 'Retained while account exists.',
          account: { email: 'person@example.test' },
          preferences: null,
          tasks: [],
          activity_events: [],
          feedback: [],
          step_feedback_events: [],
          step_generations: [],
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: mockFetch as unknown as typeof fetch,
      initialToken: 'private-test-token',
    });

    const page = await client.getActivityPage({ category: 'steps', page: 2, pageSize: 10 });
    expect(page.total).toBe(1);
    expect(page.events[0].eventType).toBe('step_completed');
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/activity?category=steps&page=2&page_size=10',
      expect.anything()
    );

    const exported = await client.exportAccountData();
    expect(exported.tasks).toEqual([]);
    await client.deleteAccount('correct-password');
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/auth/me',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ password: 'correct-password' }),
      })
    );
  });

  it('retries a transient GET network failure once and never retries a write', async () => {
    const response = { ok: true, json: async () => ({ status: 'ok' }) };
    const getFetch = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response);
    const getClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: getFetch as unknown as typeof fetch,
    });
    const startedAt = Date.now();
    await expect(getClient.getHealth()).resolves.toEqual({ status: 'ok' });
    expect(Date.now() - startedAt).toBeLessThan(2000);
    expect(getFetch).toHaveBeenCalledTimes(2);

    const postFetch = vi.fn().mockRejectedValue(new TypeError('offline'));
    const postClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: postFetch as unknown as typeof fetch,
    });
    await expect(postClient.createTask({ title: 'No unsafe queue' })).rejects.toThrow('Unable to connect right now. Check your connection and try again.');
    expect(postFetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes an expired access token once before retrying the original request', async () => {
    const unauthorized = {
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Expired access token' }),
    };
    const refreshed = {
      ok: true,
      json: async () => ({ access_token: 'new-access-token' }),
    };
    const profile = {
      ok: true,
      json: async () => ({
        id: 'user-1',
        email: 'sync@example.test',
        display_name: 'Sync User',
        baseline_capacity: 'medium',
        is_active: true,
        created_at: '2026-10-25T00:00:00Z',
      }),
    };
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(profile);
    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: fetchFn as unknown as typeof fetch,
      initialToken: 'expired-access-token',
      initialRefreshToken: 'valid-refresh-token',
    });

    await expect(client.getProfile()).resolves.toMatchObject({ email: 'sync@example.test' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls[1][0]).toBe('http://localhost:8000/api/auth/refresh');
    expect(client.getToken()).toBe('new-access-token');
  });

  it('clears an invalid refresh session but preserves it during a network outage', async () => {
    const unauthorized = {
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Expired access token' }),
    };
    const invalidRefreshClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      initialToken: 'expired-access-token',
      initialRefreshToken: 'invalid-refresh-token',
      fetchFn: vi.fn().mockResolvedValueOnce(unauthorized).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      }) as unknown as typeof fetch,
    });
    const expiredHandler = vi.fn();
    invalidRefreshClient.setSessionExpiredHandler(expiredHandler);
    await expect(invalidRefreshClient.getProfile()).rejects.toMatchObject({ status: 401 });
    expect(invalidRefreshClient.getToken()).toBeNull();
    expect(expiredHandler).toHaveBeenCalledTimes(1);

    const offlineRefreshClient = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      initialToken: 'expired-access-token',
      initialRefreshToken: 'still-valid-refresh-token',
      fetchFn: vi.fn().mockResolvedValueOnce(unauthorized).mockRejectedValueOnce(new TypeError('Failed to fetch')) as unknown as typeof fetch,
    });
    const retainedHandler = vi.fn();
    offlineRefreshClient.setSessionExpiredHandler(retainedHandler);
    await expect(offlineRefreshClient.getProfile()).rejects.toMatchObject({
      status: 0,
      message: 'Unable to verify your session right now. Check your connection and try again.',
    });
    expect(offlineRefreshClient.getToken()).toBe('expired-access-token');
    expect(retainedHandler).not.toHaveBeenCalled();
  });

  it('preserves conflict status for explicit stale-edit handling', async () => {
    const client = new ApiClient({
      baseUrl: 'http://localhost:8000/api',
      fetchFn: vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'This task changed on another device.' }),
      }) as unknown as typeof fetch,
    });
    await expect(client.getHealth()).rejects.toMatchObject({
      status: 409,
      message: 'This task changed on another device.',
    });
  });

  it('sends the task snapshot version with optimistic updates', async () => {
    const response = {
      ok: true,
      json: async () => ({
        id: 'task-1',
        user_id: 'user-1',
        title: 'Updated title',
        notes: null,
        capacity: 'medium',
        status: 'active',
        version: 5,
        steps: [],
        created_at: '2026-10-25T00:00:00Z',
        updated_at: '2026-10-25T00:01:00Z',
      }),
    };
    const fetchFn = vi.fn().mockResolvedValue(response);
    const client = new ApiClient({
      baseUrl: 'https://api.example.test/api',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const task = await client.updateTask('task-1', { title: 'Updated title' }, 4);
    expect(task.version).toBe(5);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      headers: expect.objectContaining({ 'If-Match': '4' }),
    });
  });

  it('requires an HTTPS non-local API URL in production and retains the localhost development default', () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe('http://127.0.0.1:18765/api');
    expect(() => resolveApiBaseUrl(undefined, true)).toThrow('must be set');
    expect(() => resolveApiBaseUrl('http://localhost:8000/api', true)).toThrow('must use HTTPS');
    expect(() => resolveApiBaseUrl('https://user:password@api.example.test/api', true)).toThrow('credentials');
    expect(() => resolveApiBaseUrl('https://[::1]/api', true)).toThrow('must use HTTPS');
    expect(resolveApiBaseUrl('https://api.example.test/api/', true)).toBe('https://api.example.test/api');
  });
});
