import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TaskHistoryPage } from '../pages/TaskHistoryPage';

const api = vi.hoisted(() => ({
  getTasks: vi.fn(), getGoals: vi.fn(), getTaskById: vi.fn(), updateTask: vi.fn(),
  getActivityPage: vi.fn(), getActivitySummary: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ apiClient: api, isAuthenticated: true }) }));

function LocationProbe() {
  const location = useLocation();
  return <div role="status" data-testid="route-state">{location.pathname}{JSON.stringify(location.state || {})}</div>;
}

const task = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1', userId: 'user-1', title: 'Prepare report', notes: 'Use the saved outline', capacity: 'medium',
  status: 'active', version: 3, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-03T10:00:00Z',
  steps: [{ id: 'step-1', taskId: 'task-1', order: 1, title: 'Review outline', estimatedDuration: 60, status: 'completed', version: 2, completedAt: '2026-01-02T10:00:00Z' },
    { id: 'step-2', taskId: 'task-1', order: 2, title: 'Draft one section', estimatedDuration: 180, status: 'pending', version: 1 }],
  ...overrides,
});

function renderHistory() {
  return render(<MemoryRouter initialEntries={['/history']}><Routes>
    <Route path="/history" element={<TaskHistoryPage />} />
    <Route path="/step-sequencer" element={<LocationProbe />} />
    <Route path="/tasks/:id" element={<LocationProbe />} />
  </Routes></MemoryRouter>);
}

describe('saved task history and resume', () => {
  beforeEach(() => {
    api.getTasks.mockReset().mockResolvedValue({ tasks: [task()], total: 1, page: 1, page_size: 100, pages: 1 });
    api.getGoals.mockReset().mockResolvedValue([]);
    api.getTaskById.mockReset().mockResolvedValue(task());
    api.updateTask.mockReset().mockImplementation(async (_id, _patch, version) => ({ ...task(), status: 'active', version: version + 1 }));
    api.getActivityPage.mockReset().mockResolvedValue({ events: [], total: 0, page: 1, pageSize: 20, pages: 1 });
    api.getActivitySummary.mockReset().mockResolvedValue({ stepCompletions: 1, pauses: 0 });
  });

  it('lists saved tasks with persisted progress and supports search and status filters', async () => {
    renderHistory();
    expect(await screen.findByText('Prepare report')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 steps complete/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tasks' }), { target: { value: 'missing' } });
    expect(screen.getByText(/No tasks match this search and filter/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tasks' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'In Progress' }));
    expect(screen.getByRole('button', { name: 'In Progress' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a friendly empty state when the account has no saved tasks', async () => {
    api.getTasks.mockResolvedValue({ tasks: [], total: 0, page: 1, page_size: 100, pages: 1 });
    renderHistory();
    expect(await screen.findByText(/No saved tasks yet/)).toBeInTheDocument();
  });

  it('resumes at the earliest persisted incomplete step without regenerating the plan', async () => {
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume Task' }));
    expect(await screen.findByTestId('route-state')).toHaveTextContent('/step-sequencer');
    expect(screen.getByTestId('route-state')).toHaveTextContent('"stepId":"step-2"');
    expect(screen.getByTestId('route-state')).toHaveTextContent('"stepDuration":180');
    expect(api.getTaskById).toHaveBeenCalledWith('task-1');
    expect(api.updateTask).not.toHaveBeenCalled();
  });

  it('reactivates a paused task but preserves its existing steps before resume', async () => {
    const paused = task({ status: 'paused' });
    api.getTasks.mockResolvedValue({ tasks: [paused], total: 1, page: 1, page_size: 100, pages: 1 });
    api.getTaskById.mockResolvedValue(paused);
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume Task' }));
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith('task-1', { status: 'active' }, 3));
    expect(await screen.findByTestId('route-state')).toHaveTextContent('/step-sequencer');
  });

  it('opens the task detail with an explicit repair option when no plan was saved', async () => {
    const unplanned = task({ steps: [], planModel: undefined });
    api.getTasks.mockResolvedValue({ tasks: [unplanned], total: 1, page: 1, page_size: 100, pages: 1 });
    api.getTaskById.mockResolvedValue(unplanned);
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Task' }));
    expect(await screen.findByTestId('route-state')).toHaveTextContent('/tasks/task-1');
    expect(screen.getByTestId('route-state')).toHaveTextContent('"historyPlanMissing":true');
  });

  it('does not start a goal task while its prerequisite is unfinished', async () => {
    api.getGoals.mockResolvedValue([{ id: 'goal-1', title: 'Learn analysis', deadline: '2026-12-01', tasks: [{ id: 'task-1', dependencies: ['prereq-1'] }] }]);
    api.getTaskById.mockImplementation(async (id: string) => id === 'prereq-1' ? task({ id: id, title: 'Prepare dataset', status: 'active' }) : task());
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume Task' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Complete “Prepare dataset” before starting this task.');
    expect(screen.queryByTestId('route-state')).not.toBeInTheDocument();
  });

  it('shows completed steps as a summary instead of resuming unfinished work', async () => {
    const completed = task({ status: 'completed', steps: [{ id: 'step-1', taskId: 'task-1', order: 1, title: 'Done', estimatedDuration: 60, status: 'completed', version: 2 }] });
    api.getTasks.mockResolvedValue({ tasks: [completed], total: 1, page: 1, page_size: 100, pages: 1 });
    api.getTaskById.mockResolvedValue(completed);
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'View Summary' }));
    expect(await screen.findByTestId('route-state')).toHaveTextContent('/tasks/task-1');
    expect(api.updateTask).not.toHaveBeenCalled();
  });

  it('opens a summary rather than an empty sequencer when every saved step is complete', async () => {
    const planDone = task({ steps: [{ id: 'step-1', taskId: 'task-1', order: 1, title: 'Done', estimatedDuration: 60, status: 'completed', version: 2 }] });
    api.getTasks.mockResolvedValue({ tasks: [planDone], total: 1, page: 1, page_size: 100, pages: 1 });
    api.getTaskById.mockResolvedValue(planDone);
    renderHistory();
    fireEvent.click(await screen.findByRole('button', { name: 'View Summary' }));
    expect(await screen.findByTestId('route-state')).toHaveTextContent('/tasks/task-1');
    expect(api.updateTask).not.toHaveBeenCalled();
  });
});
