import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TaskDetailPage } from '../pages/TaskDetailPage';

const mocks = vi.hoisted(() => ({
  generatePlan: vi.fn(), fetchTaskById: vi.fn(), clearCurrentTask: vi.fn(),
  currentTask: {} as Record<string, unknown>,
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, apiClient: mocks }) }));
vi.mock('../context/TaskContext', () => ({ useTask: () => ({
  ...mocks, currentTaskLoading: false, isMutating: false, suggestedStep: null,
  updateTask: vi.fn(), markStepComplete: vi.fn(),
}) }));

function mount() {
  return render(<MemoryRouter initialEntries={['/tasks/task-1']}><Routes>
    <Route path="/tasks/:id" element={<TaskDetailPage />} />
  </Routes></MemoryRouter>);
}

describe('saved AI plan review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentTask = { id: 'task-1', title: 'Prepare SQL revision', capacity: 'medium', status: 'active',
      version: 3, planModel: 'gemini-test', planGuidance: true, description: 'Practice exam queries.',
      steps: [{ id: 'step-1', order: 1, title: 'Practice SQL joins', instruction: 'Write an INNER JOIN query against two example tables.',
        reason: 'Joins connect exam concepts to practice.', researchSuggestions: ['SQL join exercises'], effort: 'medium',
        estimatedDuration: 300, status: 'pending', source: 'GEMINI' }],
    };
    mocks.fetchTaskById.mockResolvedValue(mocks.currentTask);
  });

  it('reviews generated instructions, explanation, research and source before starting', () => {
    mount();
    expect(screen.getByText('AI + Strategy Guidance')).toBeInTheDocument();
    expect(screen.getByText('Write an INNER JOIN query against two example tables.')).toBeInTheDocument();
    expect(screen.getByText(/Why: Joins connect/)).toBeInTheDocument();
    expect(screen.getByText('Research: SQL join exercises')).toBeInTheDocument();
    expect(screen.getByText('0/1 steps done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue Step/i })).toBeInTheDocument();
    expect(mocks.generatePlan).not.toHaveBeenCalled();
  });

  it('shows plan complete with no next-step action after all saved steps are done', () => {
    (mocks.currentTask.steps as Array<Record<string, unknown>>)[0].status = 'completed';
    mount();
    expect(screen.getByText('1/1 steps done')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Plan complete');
    expect(screen.queryByRole('button', { name: /Continue Step|Start Next Small Step/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeInTheDocument();
  });

  it('retains a saved task and offers retry when Gemini is unavailable', async () => {
    mocks.currentTask.planModel = undefined;
    mocks.currentTask.steps = [];
    mocks.generatePlan.mockRejectedValueOnce(new Error('Gemini could not generate a valid plan (invalid_plan). Your saved work is unchanged. Please retry.'))
      .mockResolvedValueOnce(mocks.currentTask);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI plan / Retry' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalid_plan'));
    expect(mocks.generatePlan).toHaveBeenCalledWith('task-1', 3);
    expect(screen.queryByText('Local Library Match')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate AI plan / Retry' })).toBeEnabled();
    expect(screen.getAllByText('Prepare SQL revision')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Generate AI plan / Retry' }));
    await waitFor(() => expect(mocks.generatePlan).toHaveBeenCalledTimes(2));
    expect(mocks.generatePlan).toHaveBeenNthCalledWith(2, 'task-1', 3);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.fetchTaskById).toHaveBeenCalledWith('task-1');
  });
});
