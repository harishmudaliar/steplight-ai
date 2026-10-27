import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import type {
  Task,
  TaskCounts,
  TaskFilters,
  TaskListResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
  SuggestedStep,
  StepFeedbackRequest,
  StepFeedbackResult,
} from '@steplight/shared';
import { useAuth } from './AuthContext';
import { saveOfflineTaskIndex } from '../utils/offlineTaskIndex';

interface TaskContextType {
  // Task list state
  tasks: Task[];
  total: number;
  page: number;
  pages: number;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  filters: TaskFilters;

  // Dashboard counts
  counts: TaskCounts | null;
  countsLoading: boolean;
  countsError: string | null;

  // Single task state
  currentTask: Task | null;
  currentTaskLoading: boolean;
  currentTaskError: string | null;

  // Suggested step (Gemini, local strategy, or fallback)
  suggestedStep: SuggestedStep | null;
  suggestedStepLoading: boolean;
  suggestedStepError: string | null;

  // Actions
  fetchTasks: (overrideFilters?: TaskFilters) => Promise<void>;
  fetchTaskCounts: () => Promise<void>;
  fetchTaskById: (id: string) => Promise<Task | null>;
  createTask: (payload: CreateTaskPayload) => Promise<Task>;
  updateTask: (id: string, payload: UpdateTaskPayload) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  fetchSuggestedStep: (taskId: string, stepIndex?: number) => Promise<void>;
  markStepComplete: (taskId: string, stepId: string) => Promise<void>;
  startSuggestedStep: (taskId: string, suggestion: SuggestedStep) => Promise<Task['steps'][number]>;
  submitStepFeedback: (
    taskId: string,
    payload: StepFeedbackRequest,
    idempotencyKey: string
  ) => Promise<StepFeedbackResult>;
  setFilters: (filters: Partial<TaskFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  clearCurrentTask: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

function requireOnlineToWrite(): void {
  if (!navigator.onLine) {
    throw new Error('You are offline. Nothing was changed or queued. Reconnect and reload before trying again.');
  }
}

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { apiClient, isAuthenticated, user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>({ page: 1, page_size: 20 });

  const [counts, setCounts] = useState<TaskCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);

  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentTaskLoading, setCurrentTaskLoading] = useState(false);
  const [currentTaskError, setCurrentTaskError] = useState<string | null>(null);

  const [suggestedStep, setSuggestedStep] = useState<SuggestedStep | null>(null);
  const [suggestedStepLoading, setSuggestedStepLoading] = useState(false);
  const [suggestedStepError, setSuggestedStepError] = useState<string | null>(null);

  const createInFlightRef = useRef(false);
  const stepActionInFlightRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) return;
    setTasks([]);
    setTotal(0);
    setPageState(1);
    setPages(1);
    setCounts(null);
    setCurrentTask(null);
    setSuggestedStep(null);
    setError(null);
    setCountsError(null);
    setCurrentTaskError(null);
    setSuggestedStepError(null);
    setFiltersState({ page: 1, page_size: 20 });
  }, [isAuthenticated]);

  const fetchTasks = useCallback(
    async (overrideFilters?: TaskFilters) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError(null);
      const activeFilters = overrideFilters ?? filters;
      try {
        const result: TaskListResponse = await apiClient.getTasks(activeFilters);
        if (user) saveOfflineTaskIndex(user.id, result.tasks);
        setTasks(result.tasks);
        setTotal(result.total);
        setPageState(result.page);
        setPages(result.pages);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load tasks.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient, isAuthenticated, filters, user]
  );

  const fetchTaskCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    setCountsLoading(true);
    setCountsError(null);
    try {
      const result = await apiClient.getTaskCounts();
      setCounts(result);
    } catch (err: unknown) {
      setCountsError(err instanceof Error ? err.message : 'Failed to load task counts.');
    } finally {
      setCountsLoading(false);
    }
  }, [apiClient, isAuthenticated]);

  const fetchTaskById = useCallback(
    async (id: string): Promise<Task | null> => {
      setCurrentTaskLoading(true);
      setCurrentTaskError(null);
      try {
        const task = await apiClient.getTaskById(id);
        setCurrentTask(task);
        return task;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load task.';
        setCurrentTaskError(msg);
        return null;
      } finally {
        setCurrentTaskLoading(false);
      }
    },
    [apiClient]
  );

  const createTask = useCallback(
    async (payload: CreateTaskPayload): Promise<Task> => {
      requireOnlineToWrite();
      if (createInFlightRef.current) {
        throw new Error('A task is already being saved. Please wait for it to finish.');
      }
      createInFlightRef.current = true;
      setIsMutating(true);
      setError(null);
      try {
        const task = await apiClient.createTask(payload);
        setTasks((prev) => {
          if (prev.some((existing) => existing.id === task.id)) return prev;
          return [task, ...prev];
        });
        setTotal((prev) => prev + 1);
        void fetchTaskCounts();
        return task;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create task.';
        setError(msg);
        throw err;
      } finally {
        createInFlightRef.current = false;
        setIsMutating(false);
      }
    },
    [apiClient, fetchTaskCounts]
  );

  const updateTask = useCallback(
    async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
      requireOnlineToWrite();
      setIsMutating(true);
      setError(null);
      try {
        const task = currentTask?.id === id ? currentTask : tasks.find((item) => item.id === id);
        const latest = task ?? await apiClient.getTaskById(id);
        const updated = await apiClient.updateTask(id, payload, latest.version);
        // Update in-place in list
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        // Update current task if it's the one being edited
        setCurrentTask((prev) => (prev?.id === id ? updated : prev));
        void fetchTaskCounts();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update task.';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiClient, currentTask, fetchTaskCounts, tasks]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      requireOnlineToWrite();
      setIsMutating(true);
      setError(null);
      try {
        await apiClient.deleteTask(id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        if (currentTask?.id === id) {
          setCurrentTask(null);
        }
        void fetchTaskCounts();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete task.';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiClient, currentTask, fetchTaskCounts]
  );

  const fetchSuggestedStep = useCallback(
    async (taskId: string, stepIndex = 0): Promise<void> => {
      setSuggestedStepLoading(true);
      setSuggestedStep(null);
      setSuggestedStepError(null);
      try {
        const suggestion = await apiClient.getSuggestedStep(taskId, stepIndex);
        setSuggestedStep(suggestion);
      } catch (err: unknown) {
        setSuggestedStep(null);
        setSuggestedStepError(err instanceof Error ? err.message : 'Failed to load a suggested step.');
      } finally {
        setSuggestedStepLoading(false);
      }
    },
    [apiClient]
  );

  const markStepComplete = useCallback(
    async (taskId: string, stepId: string): Promise<void> => {
      requireOnlineToWrite();
      try {
        const task = currentTask?.id === taskId ? currentTask : tasks.find((item) => item.id === taskId);
        const step = task?.steps.find((item) => item.id === stepId);
        const latest = step ?? (await apiClient.getTaskById(taskId)).steps.find((item) => item.id === stepId);
        if (!latest) throw new Error('Step not found. Refresh the task and try again.');
        const updatedStep = await apiClient.updateStep(taskId, stepId, { status: 'completed' }, latest.version);
        // Update the step inside the currentTask
        setCurrentTask((prev) => {
          if (!prev || prev.id !== taskId) return prev;
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.id === stepId ? updatedStep : s)),
          };
        });
        // Update in task list too
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              steps: t.steps.map((s) => (s.id === stepId ? updatedStep : s)),
            };
          })
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to mark step complete.';
        setError(msg);
        throw err;
      }
    },
    [apiClient, currentTask, tasks]
  );

  const startSuggestedStep = useCallback(
    async (taskId: string, suggestion: SuggestedStep): Promise<Task['steps'][number]> => {
      requireOnlineToWrite();
      if (stepActionInFlightRef.current) {
        throw new Error('A step action is already being saved. Please wait for it to finish.');
      }
      stepActionInFlightRef.current = true;
      setIsMutating(true);
      try {
        const step = await apiClient.addStep(taskId, {
          title: suggestion.title,
          reason: suggestion.reason,
          estimatedDuration: suggestion.estimatedDuration,
          strategy: suggestion.strategy,
          source: suggestion.source,
          generationId: suggestion.generationId,
        });
        setCurrentTask((prev) => prev?.id === taskId
          ? { ...prev, steps: prev.steps.some((item) => item.id === step.id) ? prev.steps : [...prev.steps, step] }
          : prev);
        setTasks((prev) => prev.map((task) => task.id === taskId
          ? { ...task, steps: task.steps.some((item) => item.id === step.id) ? task.steps : [...task.steps, step] }
          : task));
        return step;
      } finally {
        stepActionInFlightRef.current = false;
        setIsMutating(false);
      }
    },
    [apiClient]
  );

  const submitStepFeedback = useCallback(
    async (
      taskId: string,
      payload: StepFeedbackRequest,
      idempotencyKey: string
    ): Promise<StepFeedbackResult> => {
      requireOnlineToWrite();
      if (stepActionInFlightRef.current) {
        throw new Error('A step action is already being saved. Please wait for it to finish.');
      }
      stepActionInFlightRef.current = true;
      setIsMutating(true);
      try {
        const result = await apiClient.submitStepFeedback(taskId, payload, idempotencyKey);
        const updateTaskSteps = (task: Task): Task => {
          const steps = task.steps.map((step) => {
            if (step.id !== payload.stepId) return step;
            if (payload.action === 'done' && result.step) return result.step;
            if (payload.action === 'cant' || payload.action === 'change') {
              return { ...step, status: 'skipped' as const };
            }
            return step;
          });
          if (
            payload.action === 'cant' &&
            result.step &&
            !steps.some((step) => step.id === result.step?.id)
          ) {
            steps.push(result.step);
          }
          return { ...task, status: result.taskStatus, version: result.taskVersion, steps };
        };
        setCurrentTask((prev) => prev?.id === taskId ? updateTaskSteps(prev) : prev);
        setTasks((prev) => prev.map((task) => task.id === taskId ? updateTaskSteps(task) : task));
        if (payload.action === 'done') window.electronAPI?.notifyStepCompleted();
        if (payload.action === 'rest') void fetchTaskCounts();
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save step feedback.';
        setError(msg);
        throw err;
      } finally {
        stepActionInFlightRef.current = false;
        setIsMutating(false);
      }
    },
    [apiClient, fetchTaskCounts]
  );

  const setFilters = useCallback((partial: Partial<TaskFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  }, []);

  const setPage = useCallback((newPage: number) => {
    setFiltersState((prev) => ({ ...prev, page: newPage }));
    setPageState(newPage);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearCurrentTask = useCallback(() => {
    setCurrentTask(null);
    setCurrentTaskError(null);
    setSuggestedStep(null);
  }, []);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        total,
        page,
        pages,
        isLoading,
        isMutating,
        error,
        filters,
        counts,
        countsLoading,
        countsError,
        currentTask,
        currentTaskLoading,
        currentTaskError,
        suggestedStep,
        suggestedStepLoading,
        suggestedStepError,
        fetchTasks,
        fetchTaskCounts,
        fetchTaskById,
        createTask,
        updateTask,
        deleteTask,
        fetchSuggestedStep,
        markStepComplete,
        startSuggestedStep,
        submitStepFeedback,
        setFilters,
        setPage,
        clearError,
        clearCurrentTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = (): TaskContextType => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTask must be used within a TaskProvider');
  return ctx;
};
