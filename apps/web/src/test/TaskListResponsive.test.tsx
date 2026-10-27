import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TaskListPage } from '../pages/TaskListPage';

const mocks = vi.hoisted(() => ({
  context: {
    tasks: [] as Array<Record<string, unknown>>,
    total: 1,
    page: 1,
    pages: 1,
    isLoading: false,
    isMutating: false,
    error: null as string | null,
    filters: {},
    fetchTasks: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    clearError: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../context/TaskContext', () => ({ useTask: () => mocks.context }));

describe('responsive task cards', () => {
  beforeEach(() => {
    mocks.context.tasks = [{
      id: 'long-task',
      title: 'A very long task title that must wrap naturally without colliding with its action buttons',
      notes: 'A detailed task description that should truncate within the card while remaining readable.',
      capacity: 'medium',
      status: 'active',
      steps: [{ id: 'step-1', status: 'pending', title: 'A step with a long name that truncates', order: 1 }],
    }];
    mocks.context.fetchTasks.mockReset();
    mocks.context.updateTask.mockReset();
    mocks.context.deleteTask.mockReset();
    mocks.context.setFilters.mockReset();
    mocks.context.setPage.mockReset();
    mocks.context.clearError.mockReset();
  });

  it('gives narrow cards a full-width action area and preserves all labeled controls', () => {
    render(<MemoryRouter><TaskListPage /></MemoryRouter>);
    const title = screen.getByRole('link', { name: /very long task title/ });
    expect(title).toHaveClass('break-words', '[overflow-wrap:anywhere]');
    const cardHeader = title.parentElement?.parentElement;
    expect(cardHeader).toHaveClass('grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_auto]');

    const actions = screen.getByRole('button', { name: 'Pause A very long task title that must wrap naturally without colliding with its action buttons' }).parentElement;
    expect(actions).toHaveClass('w-full', 'grid-cols-4', 'sm:w-auto');
    expect(actions?.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Edit A very long task title/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete A very long task title/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open A very long task title/ })).toBeInTheDocument();
  });
});
