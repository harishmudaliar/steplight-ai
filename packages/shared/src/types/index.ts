/**
 * Capacity levels representing the user's available energy/bandwidth.
 * Low: effortless, < 2 minutes, friction reduction
 * Medium: moderate focus, 5-10 minutes, single track action
 * High: deep dive, momentum ready
 */
export type CapacityLevel = 'low' | 'medium' | 'high';

/**
 * Task status values aligned with backend enum.
 */
export type TaskStatus = 'active' | 'paused' | 'completed' | 'archived';

/**
 * Step status values aligned with backend enum.
 */
export type StepStatus = 'pending' | 'completed' | 'skipped';

/**
 * Health check response schema from backend GET /api/health
 */
export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
}

/**
 * Version info response schema from backend GET /api/version
 */
export interface VersionResponse {
  version: string;
  app_name: string;
  tagline: string;
}

/**
 * User representation
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  baselineCapacity: CapacityLevel;
  isActive: boolean;
  createdAt: string;
}

/**
 * Raw user representation from FastAPI JSON
 */
export interface BackendUserOut {
  id: string;
  email: string;
  display_name: string;
  baseline_capacity: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Authentication token package
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: BackendUserOut;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
  baselineCapacity?: CapacityLevel;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  defaultDuration: number;
  soundEnabled: boolean;
  gentleReminders: boolean;
  geminiPersonalizationEnabled: boolean;
  updatedAt: string;
}

export interface BackendPreferencesOut {
  id: string;
  user_id: string;
  theme: string;
  default_duration: number;
  sound_enabled: boolean;
  gentle_reminders: boolean;
  gemini_personalization_enabled: boolean;
  updated_at: string;
}

/**
 * Atomic step representation
 */
export interface Step {
  instruction?: string;
  effort?: string;
  researchSuggestions?: string[];
  id: string;
  taskId: string;
  order: number;
  title: string;
  reason?: string;
  estimatedDuration: number;
  strategy?: string;
  source?: 'GEMINI' | 'LOCAL_RAG' | 'LOCAL_FALLBACK' | null;
  generationId?: string | null;
  status: StepStatus;
  version: number;
  completedAt?: string;
  createdAt?: string;
}

export interface BackendStepOut {
  instruction?: string;
  effort?: string;
  research_suggestions?: string[];
  id: string;
  task_id: string;
  order: number;
  title: string;
  reason?: string;
  estimated_duration: number;
  strategy: string;
  source?: string | null;
  generation_id?: string | null;
  status: string;
  version?: number;
  completed_at?: string;
  created_at: string;
}

/**
 * Task state representation
 */
export interface Task {
  originalInput?: string;
  description?: string;
  planModel?: string;
  planGuidance?: boolean;
  id: string;
  userId: string;
  title: string;
  notes?: string;
  capacity: CapacityLevel;
  status: TaskStatus;
  version: number;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendTaskOut {
  original_input?: string;
  description?: string;
  plan_model?: string;
  plan_guidance?: boolean;
  id: string;
  user_id: string;
  title: string;
  notes?: string;
  capacity: string;
  status: string;
  version?: number;
  steps: BackendStepOut[];
  created_at: string;
  updated_at: string;
}

/**
 * Paginated task list response
 */
export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface BackendTaskListOut {
  tasks: BackendTaskOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TaskCounts {
  active: number;
  paused: number;
  completed: number;
  archived: number;
  total: number;
}

/** A Gemini suggestion, local library match, or deterministic fallback. */
export interface SuggestedStep {
  title: string;
  reason: string;
  strategy: string;
  estimatedDuration: number;
  source: 'GEMINI' | 'LOCAL_RAG' | 'LOCAL_FALLBACK';
  /** Human-readable notice describing the generation source or fallback. */
  fallbackNotice: string;
  retrievalScore?: number | null;
  generationId?: string | null;
  model?: string | null;
  fallbackReason?: string | null;
}

export type StepFeedbackAction = 'done' | 'another' | 'cant' | 'rest' | 'change' | 'dismiss';

export interface StepFeedbackRequest {
  action: StepFeedbackAction;
  stepId?: string;
}

export interface StepFeedbackResult {
  action: StepFeedbackAction;
  state: 'active' | 'paused' | 'completed' | 'change_requested' | 'dismissed';
  taskStatus: TaskStatus;
  taskVersion: number;
  step?: Step;
  message: string;
}

export interface BackendSuggestedStepOut {
  title: string;
  reason: string;
  strategy: string;
  estimated_duration: number;
  source: 'GEMINI' | 'LOCAL_RAG' | 'LOCAL_FALLBACK';
  fallback_notice: string;
  retrieval_score?: number | null;
  generation_id?: string | null;
  model?: string | null;
  fallback_reason?: string | null;
}

export interface BackendStepFeedbackOut {
  action: StepFeedbackAction;
  state: StepFeedbackResult['state'];
  task_status: string;
  task_version?: number;
  step?: BackendStepOut | null;
  message: string;
}

export interface CreateTaskPayload {
  title: string;
  notes?: string;
  capacity?: CapacityLevel;
  steps?: Array<{
    title: string;
    reason?: string;
    estimated_duration?: number;
    strategy?: string;
    order?: number;
  }>;
}

export interface UpdateTaskPayload {
  title?: string;
  notes?: string;
  capacity?: CapacityLevel;
  status?: TaskStatus;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  eventType: string;
  metadataJson?: string;
  createdAt: string;
}

export interface ActivityPage {
  events: ActivityEvent[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface ActivitySummary {
  totalEvents: number;
  stepCompletions: number;
  pauses: number;
  resumes: number;
  tasksCreated: number;
}

export interface PrivacyExport {
  exported_at: string;
  retention: string;
  account: Record<string, unknown>;
  preferences: Record<string, unknown> | null;
  tasks: Array<Record<string, unknown>>;
  activity_events: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
  step_feedback_events: Array<Record<string, unknown>>;
  step_generations: Array<Record<string, unknown>>;
}

export interface BackendActivityPageOut {
  events: BackendActivityEventOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface BackendActivitySummaryOut {
  total_events: number;
  step_completions: number;
  pauses: number;
  resumes: number;
  tasks_created: number;
}

export interface BackendActivityEventOut {
  id: string;
  user_id: string;
  event_type: string;
  metadata_json?: string;
  created_at: string;
}

/**
 * Task list filter options
 */
export interface TaskFilters {
  status?: TaskStatus | 'all';
  capacity?: CapacityLevel | 'all';
  search?: string;
  page?: number;
  page_size?: number;
}
