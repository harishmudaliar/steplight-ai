import type {
  HealthResponse,
  VersionResponse,
  User,
  BackendUserOut,
  AuthTokens,
  BackendTokenResponse,
  LoginCredentials,
  RegisterPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  UserPreferences,
  BackendPreferencesOut,
  Task,
  BackendTaskOut,
  Step,
  BackendStepOut,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskListResponse,
  BackendTaskListOut,
  TaskCounts,
  SuggestedStep,
  BackendSuggestedStepOut,
  StepFeedbackRequest,
  StepFeedbackResult,
  BackendStepFeedbackOut,
  ActivityEvent,
  BackendActivityEventOut,
  BackendActivityPageOut,
  BackendActivitySummaryOut,
  ActivityPage,
  ActivitySummary,
  PrivacyExport,
  CapacityLevel,
  TaskStatus,
  TaskFilters,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  initialToken?: string | null;
  initialRefreshToken?: string | null;
}

function mapUser(raw: BackendUserOut): User {
  return {
    id: raw.id,
    email: raw.email,
    displayName: raw.display_name,
    baselineCapacity: (raw.baseline_capacity as CapacityLevel) || 'medium',
    isActive: raw.is_active,
    createdAt: raw.created_at,
  };
}

function mapStep(raw: BackendStepOut): Step {
  return {
    id: raw.id,
    taskId: raw.task_id,
    instruction: raw.instruction,
    effort: raw.effort,
    researchSuggestions: raw.research_suggestions,
    order: raw.order,
    title: raw.title,
    reason: raw.reason,
    estimatedDuration: raw.estimated_duration,
    strategy: raw.strategy,
    source: raw.source as Step['source'],
    generationId: raw.generation_id,
    status: (raw.status as Step['status']) || 'pending',
    version: raw.version ?? 1,
    completedAt: raw.completed_at,
    createdAt: raw.created_at,
  };
}

function mapTaskStatus(raw: string): TaskStatus {
  const status = raw === 'in_progress' ? 'active' : raw;
  if (status === 'active' || status === 'paused' || status === 'completed' || status === 'archived') {
    return status;
  }
  throw new Error(`Unsupported task status received from API: ${raw}`);
}

function mapTask(raw: BackendTaskOut): Task {
  return {
    id: raw.id,
    userId: raw.user_id,
    originalInput: raw.original_input,
    description: raw.description,
    planModel: raw.plan_model,
    planGuidance: raw.plan_guidance,
    title: raw.title,
    notes: raw.notes,
    capacity: (raw.capacity as CapacityLevel) || 'medium',
    status: mapTaskStatus(raw.status),
    version: raw.version ?? 1,
    steps: (raw.steps || []).map(mapStep),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapPreferences(raw: BackendPreferencesOut): UserPreferences {
  return {
    id: raw.id,
    userId: raw.user_id,
    theme: (raw.theme as UserPreferences['theme']) || 'light',
    defaultDuration: raw.default_duration,
    soundEnabled: raw.sound_enabled,
    gentleReminders: raw.gentle_reminders,
    geminiPersonalizationEnabled: raw.gemini_personalization_enabled,
    updatedAt: raw.updated_at,
  };
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private token: string | null = null;
  private storedRefreshToken: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;
  private sessionExpiredHandler: (() => void) | null = null;

  constructor(config?: Partial<ApiClientConfig>) {
    const rawUrl = config?.baseUrl || 'http://127.0.0.1:18765/api';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
    this.fetchFn = config?.fetchFn || ((...args) => globalThis.fetch(...args));
    this.token = config?.initialToken || null;
    this.storedRefreshToken = config?.initialRefreshToken || null;
  }

  public setToken(token: string | null): void {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setRefreshToken(token: string | null): void {
    this.storedRefreshToken = token;
  }

  public setSessionExpiredHandler(handler: (() => void) | null): void {
    this.sessionExpiredHandler = handler;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const method = (options?.method || 'GET').toUpperCase();

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    const send = () => this.fetchFn(url, { ...options, headers });
    let res: Response;
    try {
      res = await send();
    } catch {
      if (method === 'GET') {
        await delay(150);
        try {
          res = await send();
        } catch {
          throw new ApiError('Unable to connect right now. Check your connection and try again.', 0);
        }
      } else {
        throw new ApiError('Unable to connect right now. Check your connection and try again.', 0);
      }
    }

    const isTokenEndpoint = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
      '/auth/forgot-password',
      '/auth/reset-password',
    ].includes(cleanEndpoint);
    if (res.status === 401 && !isTokenEndpoint) {
      const refreshedToken = await this.refreshAccessToken();
      if (refreshedToken) {
        headers.Authorization = `Bearer ${refreshedToken}`;
        res = await send();
      }
    }

    if (method === 'GET' && [502, 503, 504].includes(res.status)) {
      await delay(150);
      res = await send();
    }

    if (!res.ok) {
      let errorMessage = 'Something went wrong. Please try again.';
      try {
        const errorBody = await res.json();
        if (errorBody && errorBody.detail) {
          const isSafePlanFailure = res.status === 503 && typeof errorBody.detail === 'string'
            && errorBody.detail.startsWith('Gemini could not generate a valid plan');
          if (typeof errorBody.detail === 'string' && !containsInternalDetails(errorBody.detail)
            && (res.status < 500 || isSafePlanFailure)) {
            errorMessage = errorBody.detail;
          } else if (Array.isArray(errorBody.detail)) {
            errorMessage = 'Please check the information and try again.';
          }
        }
      } catch {
        // Keep the user-facing message generic when the server body is unreadable.
      }
      throw new ApiError(errorMessage, res.status);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return (await res.json()) as T;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    if (!this.storedRefreshToken) {
      this.token = null;
      this.sessionExpiredHandler?.();
      return null;
    }

    this.refreshInFlight = (async () => {
      let response: Response;
      try {
        response = await this.fetchFn(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.storedRefreshToken }),
        });
      } catch {
        throw new ApiError('Unable to verify your session right now. Check your connection and try again.', 0);
      }
      if (!response.ok) {
        if (response.status === 401 || response.status === 400) {
          this.token = null;
          this.storedRefreshToken = null;
          this.sessionExpiredHandler?.();
          return null;
        }
        throw new ApiError('Session refresh is temporarily unavailable. Please try again.', response.status);
      }
      let payload: { access_token?: string };
      try {
        payload = (await response.json()) as { access_token?: string };
      } catch {
        throw new ApiError('Session refresh is temporarily unavailable. Please try again.', 502);
      }
      if (!payload.access_token) {
        throw new ApiError('Session refresh is temporarily unavailable. Please try again.', 502);
      }
      this.token = payload.access_token;
      return payload.access_token;
    })();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  // System
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  public async getVersion(): Promise<VersionResponse> {
    return this.request<VersionResponse>('/version');
  }

  // Authentication
  public async register(payload: RegisterPayload): Promise<AuthTokens> {
    const raw = await this.request<BackendTokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        display_name: payload.displayName,
        baseline_capacity: payload.baselineCapacity,
      }),
    });
    this.setToken(raw.access_token);
    this.setRefreshToken(raw.refresh_token);
    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      user: mapUser(raw.user),
    };
  }

  public async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const raw = await this.request<BackendTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
    this.setToken(raw.access_token);
    this.setRefreshToken(raw.refresh_token);
    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      user: mapUser(raw.user),
    };
  }

  public async refreshToken(refreshToken: string): Promise<string> {
    const raw = await this.request<{ access_token: string; token_type: string; expires_in: number }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    this.setToken(raw.access_token);
    return raw.access_token;
  }

  public async logout(refreshToken?: string): Promise<{ message: string }> {
    const res = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    this.setToken(null);
    this.setRefreshToken(null);
    return res;
  }

  public async getProfile(): Promise<User> {
    const raw = await this.request<BackendUserOut>('/auth/me');
    return mapUser(raw);
  }

  public async updateProfile(data: { displayName?: string; baselineCapacity?: CapacityLevel }): Promise<User> {
    const raw = await this.request<BackendUserOut>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: data.displayName,
        baseline_capacity: data.baselineCapacity,
      }),
    });
    return mapUser(raw);
  }

  public async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: payload.token,
        new_password: payload.newPassword,
      }),
    });
  }

  // Tasks — Paginated list
  public async getTasks(filters?: TaskFilters): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.capacity && filters.capacity !== 'all') params.set('capacity', filters.capacity);
    if (filters?.search && filters.search.trim()) params.set('search', filters.search.trim());
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.page_size) params.set('page_size', String(filters.page_size));
    const query = params.toString() ? `?${params.toString()}` : '';
    const raw = await this.request<BackendTaskListOut>(`/tasks${query}`);
    return {
      tasks: raw.tasks.map(mapTask),
      total: raw.total,
      page: raw.page,
      page_size: raw.page_size,
      pages: raw.pages,
    };
  }

  // Tasks — Counts for dashboard
  public async getTaskCounts(): Promise<TaskCounts> {
    return this.request<TaskCounts>('/tasks/counts');
  }

  // Tasks — Create
  public async createTask(payload: CreateTaskPayload): Promise<Task> {
    const raw = await this.request<BackendTaskOut>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapTask(raw);
  }

  // Tasks — Get by ID
  public async generatePlan(id: string, version: number, changes?: { title?: string; notes?: string; capacity?: CapacityLevel }): Promise<Task> {
    const raw = await this.request<BackendTaskOut>(`/tasks/${id}/plan`, {
      method: 'POST', headers: { 'If-Match': String(version) },
      body: JSON.stringify({ consent: true, ...changes }),
    });
    return mapTask(raw);
  }

  public async getTaskById(id: string): Promise<Task> {
    const raw = await this.request<BackendTaskOut>(`/tasks/${id}`);
    return mapTask(raw);
  }

  // Tasks — Update (PATCH)
  public async updateTask(id: string, payload: UpdateTaskPayload, version?: number): Promise<Task> {
    const raw = await this.request<BackendTaskOut>(`/tasks/${id}`, {
      method: 'PATCH',
      headers: version === undefined ? undefined : { 'If-Match': String(version) },
      body: JSON.stringify({
        title: payload.title,
        notes: payload.notes,
        capacity: payload.capacity,
        status: payload.status,
      }),
    });
    return mapTask(raw);
  }

  // Tasks — Delete
  public async deleteTask(id: string): Promise<void> {
    await this.request<void>(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Steps — Get one Gemini suggestion, local strategy match, or deterministic fallback.
  public async getSuggestedStep(taskId: string, stepIndex = 0): Promise<SuggestedStep> {
    const raw = await this.request<BackendSuggestedStepOut>(
      `/tasks/${taskId}/suggest-step?step_index=${stepIndex}`
    );
    return {
      title: raw.title,
      reason: raw.reason,
      strategy: raw.strategy,
      estimatedDuration: raw.estimated_duration,
      source: raw.source,
      fallbackNotice: raw.fallback_notice,
      retrievalScore: raw.retrieval_score,
      generationId: raw.generation_id,
      model: raw.model,
      fallbackReason: raw.fallback_reason,
    };
  }

  public async submitStepFeedback(
    taskId: string,
    payload: StepFeedbackRequest,
    idempotencyKey: string
  ): Promise<StepFeedbackResult> {
    const raw = await this.request<BackendStepFeedbackOut>(`/tasks/${taskId}/feedback`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        action: payload.action,
        step_id: payload.stepId,
      }),
    });
    return {
      action: raw.action,
      state: raw.state,
      taskStatus: mapTaskStatus(raw.task_status),
      taskVersion: raw.task_version ?? 1,
      step: raw.step ? mapStep(raw.step) : undefined,
      message: raw.message,
    };
  }

  // Steps — Add
  public async addStep(taskId: string, step: Partial<Step>): Promise<Step> {
    const raw = await this.request<BackendStepOut>(`/tasks/${taskId}/steps`, {
      method: 'POST',
      body: JSON.stringify({
        title: step.title,
        reason: step.reason,
        estimated_duration: step.estimatedDuration,
        strategy: step.strategy,
        generation_id: step.generationId,
        order: step.order,
      }),
    });
    return mapStep(raw);
  }

  // Steps — Update
  public async updateStep(
    taskId: string,
    stepId: string,
    payload: Partial<Step>,
    version?: number
  ): Promise<Step> {
    const raw = await this.request<BackendStepOut>(`/tasks/${taskId}/steps/${stepId}`, {
      method: 'PATCH',
      headers: version === undefined ? undefined : { 'If-Match': String(version) },
      body: JSON.stringify({
        title: payload.title,
        reason: payload.reason,
        estimated_duration: payload.estimatedDuration,
        strategy: payload.strategy,
        status: payload.status,
      }),
    });
    return mapStep(raw);
  }

  // Steps — Delete
  public async deleteStep(taskId: string, stepId: string): Promise<void> {
    await this.request<void>(`/tasks/${taskId}/steps/${stepId}`, { method: 'DELETE' });
  }

  // Preferences
  public async getPreferences(): Promise<UserPreferences> {
    const raw = await this.request<BackendPreferencesOut>('/preferences');
    return mapPreferences(raw);
  }

  public async updatePreferences(payload: Partial<UserPreferences>): Promise<UserPreferences> {
    const raw = await this.request<BackendPreferencesOut>('/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        theme: payload.theme,
        default_duration: payload.defaultDuration,
        sound_enabled: payload.soundEnabled,
        gentle_reminders: payload.gentleReminders,
        gemini_personalization_enabled: payload.geminiPersonalizationEnabled,
      }),
    });
    return mapPreferences(raw);
  }

  // Activity
  public async getActivityPage(options: {
    category?: 'all' | 'steps' | 'pauses' | 'tasks';
    page?: number;
    pageSize?: number;
  } = {}): Promise<ActivityPage> {
    const params = new URLSearchParams({
      category: options.category || 'all',
      page: String(options.page || 1),
      page_size: String(options.pageSize || 20),
    });
    const raw = await this.request<BackendActivityPageOut>(`/activity?${params.toString()}`);
    return {
      events: raw.events.map((r) => ({
        id: r.id,
        userId: r.user_id,
        eventType: r.event_type,
        metadataJson: r.metadata_json,
        createdAt: r.created_at,
      })),
      total: raw.total,
      page: raw.page,
      pageSize: raw.page_size,
      pages: raw.pages,
    };
  }

  public async getActivity(limit = 50): Promise<ActivityEvent[]> {
    const raw = await this.request<BackendActivityEventOut[]>(`/activity?limit=${limit}`);
    return raw.map((event) => ({
      id: event.id,
      userId: event.user_id,
      eventType: event.event_type,
      metadataJson: event.metadata_json,
      createdAt: event.created_at,
    }));
  }

  public async getActivitySummary(): Promise<ActivitySummary> {
    const raw = await this.request<BackendActivitySummaryOut>('/activity/summary');
    return {
      totalEvents: raw.total_events,
      stepCompletions: raw.step_completions,
      pauses: raw.pauses,
      resumes: raw.resumes,
      tasksCreated: raw.tasks_created,
    };
  }

  public async exportAccountData(): Promise<PrivacyExport> {
    return this.request<PrivacyExport>('/privacy/export');
  }

  public async deleteAccount(password: string): Promise<void> {
    await this.request<void>('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  }

  public async recordActivity(event: { eventType: string; metadataJson?: string }): Promise<ActivityEvent> {
    const raw = await this.request<BackendActivityEventOut>('/activity', {
      method: 'POST',
      body: JSON.stringify({
        event_type: event.eventType,
        metadata_json: event.metadataJson,
      }),
    });
    return {
      id: raw.id,
      userId: raw.user_id,
      eventType: raw.event_type,
      metadataJson: raw.metadata_json,
      createdAt: raw.created_at,
    };
  }

  public async getGoals<T = unknown[]>(): Promise<T> { return this.request<T>('/goals'); }
  public async updateGoal<T = unknown>(id: string, payload: Record<string, unknown>): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  public async createGoal<T = unknown>(payload: Record<string, unknown>): Promise<T> {
    return this.request<T>('/goals', { method: 'POST', body: JSON.stringify(payload) });
  }
  public async getGoal<T = unknown>(id: string): Promise<T> { return this.request<T>(`/goals/${encodeURIComponent(id)}`); }
  public async getGoalQuestions<T = unknown>(id: string): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}/questions`, { method: 'POST', body: JSON.stringify({ consent: true }) });
  }
  public async saveGoalAnswers<T = unknown>(id: string, answers: Record<string, string>): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}/answers`, { method: 'PUT', body: JSON.stringify({ answers }) });
  }
  public async generateGoalRoadmap<T = unknown>(id: string): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}/roadmap`, { method: 'POST', body: JSON.stringify({ consent: true }) });
  }
  public async previewGoalSchedule<T = unknown>(id: string, reason: string): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}/schedule/preview`, { method: 'POST', body: JSON.stringify({ reason }) });
  }
  public async confirmGoalSchedule<T = unknown>(id: string, reason: string, changes: unknown[]): Promise<T> {
    return this.request<T>(`/goals/${encodeURIComponent(id)}/schedule/confirm`, { method: 'POST', body: JSON.stringify({ reason, changes }) });
  }
}

function containsInternalDetails(message: string): boolean {
  return /(?:traceback|stack\s*trace| at [\w$.<>]+ \(|(?:[A-Z]:\\|\/var\/|\/home\/)[^\s]*|\b(?:sqlalchemy|psycopg|sqlite3|operationalerror|integrityerror|runtimeerror|modulenotfounderror)\b|\b(?:GEMINI_API_KEY|JWT_SECRET_KEY|DATABASE_URL)\b|https?:\/\/|127\.0\.0\.1:\d+)/i.test(message);
}

export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient({ baseUrl });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
