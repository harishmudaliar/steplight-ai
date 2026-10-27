import type { Task, TaskStatus } from '@steplight/shared';

export interface OfflineTaskSummary {
  id: string;
  status: TaskStatus;
  version: number;
  updatedAt: string;
}

interface OfflineTaskIndex {
  savedAt: string;
  tasks: OfflineTaskSummary[];
}

const CACHE_PREFIX = 'steplight_offline_task_index_v1:';
const MAX_CACHED_TASKS = 50;

export function saveOfflineTaskIndex(userId: string, tasks: Task[]): void {
  const index: OfflineTaskIndex = {
    savedAt: new Date().toISOString(),
    tasks: tasks.slice(0, MAX_CACHED_TASKS).map(({ id, status, version, updatedAt }) => ({
      id,
      status,
      version,
      updatedAt,
    })),
  };
  try {
    localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(index));
  } catch (error) {
    console.warn('Offline task status index could not be saved in local storage.', error);
  }
}

export function readOfflineTaskIndex(userId: string): { savedAt: string; tasks: OfflineTaskSummary[] } | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineTaskIndex;
    if (
      typeof parsed.savedAt !== 'string' ||
      !Array.isArray(parsed.tasks) ||
      parsed.tasks.some(
        (task) =>
          typeof task.id !== 'string' ||
          !['active', 'paused', 'completed', 'archived'].includes(task.status) ||
          typeof task.version !== 'number' ||
          typeof task.updatedAt !== 'string'
      )
    ) {
      throw new Error('Cached task status index has an unexpected shape.');
    }
    return parsed;
  } catch (error) {
    console.warn('Offline task status index could not be read.', error);
    return null;
  }
}

export function clearOfflineTaskIndex(userId: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${userId}`);
  } catch (error) {
    console.warn('Offline task status index could not be cleared.', error);
  }
}
