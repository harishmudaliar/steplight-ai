import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TaskProvider } from '../context/TaskContext';
import { CreateTaskPage } from '../pages/CreateTaskPage';

const api = vi.hoisted(() => ({
  createTask: vi.fn(),
  getTaskCounts: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    apiClient: api,
    isAuthenticated: true,
  }),
}));

describe('task lifecycle UI', () => {
  beforeEach(() => {
    api.createTask.mockReset();
    api.getTaskCounts.mockReset().mockResolvedValue({
      active: 1,
      paused: 0,
      completed: 0,
      archived: 0,
      total: 1,
    });
    api.createTask.mockImplementation(() => new Promise(() => {}));
  });

  it('submits a task only once when the form is submitted twice quickly', () => {
    render(
      <MemoryRouter>
        <TaskProvider>
          <CreateTaskPage />
        </TaskProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Focus Target/i), {
      target: { value: 'Sort my desk' },
    });
    const form = screen.getByRole('button', { name: /Find My First Step/i }).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(api.createTask).toHaveBeenCalledTimes(1);
    expect(api.createTask).toHaveBeenCalledWith({
      title: 'Sort my desk',
      notes: undefined,
      capacity: 'low',
    });
  });
});
