import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, HashRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StepSequencerPage } from '../pages/StepSequencerPage';
import { AdaptiveStepPage } from '../pages/AdaptiveStepPage';
import { RestResumePage } from '../pages/RestResumePage';

const taskContext = vi.hoisted(() => ({
  submitStepFeedback: vi.fn(),
  isMutating: false,
  tasks: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null as string | null,
  fetchTasks: vi.fn(),
  fetchTaskById: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../context/TaskContext', () => ({
  useTask: () => taskContext,
}));

const feedbackStep = {
  id: 'smaller-step',
  taskId: 'task-1',
  order: 2,
  title: 'Find one related item, then stop.',
  reason: 'Suggested locally from recent feedback.',
  estimatedDuration: 15,
  strategy: 'adaptive_smaller_step',
  status: 'pending' as const,
};

function AnnouncementPage() {
  const location = useLocation();
  const state = location.state as { feedbackNotice?: string } | null;
  return (
    <p role="status" aria-live="polite" aria-atomic="true">
      {state?.feedbackNotice}
    </p>
  );
}

function ResumedStepPage() {
  const location = useLocation();
  const state = location.state as { stepTitle?: string } | null;
  return <p role="status">{state?.stepTitle}</p>;
}

const initialStepState = {
  taskId: 'task-1',
  taskTitle: 'Prepare a note',
  capacity: 'low',
  stepId: 'step-1',
  stepTitle: 'Open the draft',
  stepReason: 'Only the first action.',
  stepDuration: 30,
};

function SequencerRoutes() {
  return (
      <Routes>
        <Route path="/step-sequencer" element={<StepSequencerPage />} />
        <Route path="/adaptive-step" element={<AdaptiveStepPage />} />
        <Route path="/rest" element={<p>Saved pause</p>} />
        <Route path="/tasks/:id" element={<AnnouncementPage />} />
        <Route path="/tasks/:id/edit" element={<p>Edit task</p>} />
        <Route path="/" element={<p>Dashboard</p>} />
      </Routes>
  );
}

function renderSequencer() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/step-sequencer', state: initialStepState }]}>
      <SequencerRoutes />
    </MemoryRouter>
  );
}

function renderHashSequencer() {
  window.history.replaceState(
    { usr: initialStepState, key: 'phase7', idx: 0 },
    '',
    '#/step-sequencer'
  );
  return render(
    <HashRouter>
      <SequencerRoutes />
    </HashRouter>
  );
}

function renderBrowserSequencer() {
  window.history.replaceState(
    { usr: initialStepState, key: 'phase7', idx: 0 },
    '',
    '/step-sequencer'
  );
  return render(
    <BrowserRouter>
      <SequencerRoutes />
    </BrowserRouter>
  );
}

const feedbackActions = [
  [/Done — Get Next Step/i, 'done'],
  [/Make Smaller/i, 'cant'],
  [/Rest for Now/i, 'rest'],
  [/Change Task or Capacity/i, 'change'],
  [/Dismiss/i, 'dismiss'],
] as const;

describe('adaptive feedback controls', () => {
  beforeEach(() => {
    taskContext.submitStepFeedback.mockReset();
    taskContext.isMutating = false;
    taskContext.tasks = [];
    taskContext.isLoading = false;
    taskContext.error = null;
    taskContext.fetchTasks.mockReset().mockResolvedValue(undefined);
    taskContext.updateTask.mockReset();
    taskContext.fetchTaskById.mockReset().mockResolvedValue(null);
    taskContext.submitStepFeedback.mockImplementation(async (_taskId, request) => ({
      action: request.action,
      state: request.action === 'rest' ? 'paused' : request.action === 'done' ? 'completed' : 'active',
      taskStatus: request.action === 'rest' ? 'paused' : 'active',
      taskVersion: 1,
      message: `${request.action} saved`,
      step: request.action === 'cant' ? feedbackStep : undefined,
    }));
  });

  it.each([
    ['Done — Get Next Step', 'done', '/tasks/task-1'],
    ["Can't • Make Smaller", 'cant', '/adaptive-step'],
    ['Rest for Now', 'rest', '/rest'],
    ['Change Task or Capacity', 'change', '/tasks/task-1/edit'],
    ['Dismiss (No penalty)', 'dismiss', '/'],
  ])('wires %s to its persisted transition', async (label, action, destination) => {
    renderSequencer();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));

    await waitFor(() => {
      expect(taskContext.submitStepFeedback).toHaveBeenCalledWith(
        'task-1',
        { action, stepId: 'step-1' },
        expect.any(String)
      );
    });
    if (destination === '/tasks/task-1') {
      const announcement = await screen.findByRole('status');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveTextContent('done saved');
    } else {
      await waitFor(() => expect(screen.getByText(
        destination === '/adaptive-step'
          ? feedbackStep.title
          : destination === '/rest'
            ? 'Saved pause'
            : destination === '/tasks/task-1/edit'
              ? 'Edit task'
              : 'Dashboard'
      )).toBeInTheDocument());
    }
  });

  it('requests a fresh smaller action when the user still cannot do the suggestion', async () => {
    const secondStep = {
      ...feedbackStep,
      id: 'smaller-step-2',
      title: 'Write down one word connected to this task.',
    };
    taskContext.submitStepFeedback
      .mockResolvedValueOnce({
        action: 'cant',
        state: 'active',
        taskStatus: 'active',
        taskVersion: 1,
        message: 'A smaller action is ready.',
        step: feedbackStep,
      })
      .mockResolvedValueOnce({
        action: 'cant',
        state: 'active',
        taskStatus: 'active',
        taskVersion: 1,
        message: 'Another smaller action is ready.',
        step: secondStep,
      });
    renderSequencer();
    fireEvent.click(screen.getByRole('button', { name: /Make Smaller/i }));
    await screen.findByText(feedbackStep.title);
    fireEvent.click(screen.getByRole('button', { name: /Make It Even Smaller/i }));
    await screen.findByText(secondStep.title);
    expect(taskContext.submitStepFeedback).toHaveBeenNthCalledWith(
      1,
      'task-1',
      { action: 'cant', stepId: 'step-1' },
      expect.any(String)
    );
    expect(taskContext.submitStepFeedback).toHaveBeenNthCalledWith(
      2,
      'task-1',
      { action: 'cant', stepId: feedbackStep.id },
      expect.any(String)
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it.each(feedbackActions)('keeps the %s transition consistent under BrowserRouter', async (label, action) => {
    renderBrowserSequencer();
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      expect(taskContext.submitStepFeedback).toHaveBeenCalledWith(
        'task-1',
        { action, stepId: 'step-1' },
        expect.any(String)
      );
    });
  });

  it.each(feedbackActions)('keeps the %s transition consistent under Electron HashRouter', async (label, action) => {
    renderHashSequencer();
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      expect(taskContext.submitStepFeedback).toHaveBeenCalledWith(
        'task-1',
        { action, stepId: 'step-1' },
        expect.any(String)
      );
    });
  });

  it('loads a saved pause and resumes its pending step', async () => {
    const pausedTask = {
      id: 'task-1',
      title: 'Prepare a note',
      capacity: 'low',
      status: 'paused',
      steps: [{
        id: 'step-1',
        title: 'Open the draft',
        reason: 'Only the first action.',
        estimatedDuration: 30,
        order: 1,
        status: 'pending',
      }],
    };
    taskContext.tasks = [pausedTask];
    taskContext.updateTask.mockResolvedValue({ ...pausedTask, status: 'active' });

    render(
      <MemoryRouter initialEntries={['/rest']}>
        <Routes>
          <Route path="/rest" element={<RestResumePage />} />
          <Route path="/step-sequencer" element={<ResumedStepPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Prepare a note/i }));
    await waitFor(() => {
      expect(taskContext.updateTask).toHaveBeenCalledWith('task-1', { status: 'active' });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Open the draft');
    expect(taskContext.fetchTasks).toHaveBeenCalledWith({ status: 'paused', page: 1, page_size: 20 });
  });
  it('reloads a saved AI instruction from the task query after route state is lost', async () => {
    taskContext.fetchTaskById.mockResolvedValue({ id: 'persisted', title: 'Python assignment', capacity: 'low',
      steps: [{ id: 'next', title: 'Train the decision tree', instruction: 'Fit DecisionTreeClassifier to the prepared training data.',
        reason: 'Training creates a model to evaluate.', estimatedDuration: 180, order: 2, status: 'pending', source: 'GEMINI' }] });
    render(<MemoryRouter initialEntries={['/step-sequencer?taskId=persisted']}><SequencerRoutes /></MemoryRouter>);
    expect(await screen.findAllByText('Fit DecisionTreeClassifier to the prepared training data.')).toHaveLength(2);
    expect(screen.getByText('AI Generated')).toBeInTheDocument();
    expect(taskContext.fetchTaskById).toHaveBeenCalledWith('persisted');
  });

  it.each([[60, '01:00'], [8 * 60, '08:00']])('loads the focus timer from the selected saved step (%i seconds)', async (duration, formatted) => {
    taskContext.fetchTaskById.mockResolvedValue({ id: 'task-1', title: 'Prepare a note', capacity: 'medium', steps: [{
      id: 'step-1', title: 'Open the draft', instruction: 'Open the saved report draft.', reason: 'Start with one item.',
      estimatedDuration: duration, order: 1, status: 'pending', source: 'GEMINI',
    }] });
    renderSequencer();
    expect(await screen.findByRole('spinbutton', { name: 'Chosen timer duration in minutes' })).toHaveValue(duration / 60);
    expect(screen.getByRole('region', { name: 'Focus timer' })).toHaveTextContent(`AI estimate: ${formatted}`);
  });

});
