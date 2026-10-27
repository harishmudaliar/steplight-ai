import { describe, expect, it } from 'vitest';
import { clearOfflineTaskIndex, readOfflineTaskIndex, saveOfflineTaskIndex } from './offlineTaskIndex';
import type { Task } from '@steplight/shared';

describe('offline task status index', () => {
  it('stores only non-sensitive task identity and status metadata scoped by user', () => {
    const task: Task = {
      id: 'task-1',
      userId: 'user-1',
      title: 'Private task title',
      notes: 'Private notes',
      capacity: 'low',
      status: 'active',
      version: 4,
      steps: [{
        id: 'step-1',
        taskId: 'task-1',
        order: 1,
        title: 'Private step text',
        estimatedDuration: 30,
        status: 'pending',
        version: 2,
      }],
      createdAt: '2026-10-25T00:00:00Z',
      updatedAt: '2026-10-25T00:01:00Z',
    };

    saveOfflineTaskIndex('user-1', [task]);
    const serialized = localStorage.getItem('steplight_offline_task_index_v1:user-1') || '';
    expect(serialized).not.toContain('Private task title');
    expect(serialized).not.toContain('Private notes');
    expect(serialized).not.toContain('Private step text');
    expect(readOfflineTaskIndex('user-1')?.tasks).toEqual([{
      id: 'task-1',
      status: 'active',
      version: 4,
      updatedAt: '2026-10-25T00:01:00Z',
    }]);
    expect(readOfflineTaskIndex('user-2')).toBeNull();
    clearOfflineTaskIndex('user-1');
    expect(readOfflineTaskIndex('user-1')).toBeNull();
  });
});
