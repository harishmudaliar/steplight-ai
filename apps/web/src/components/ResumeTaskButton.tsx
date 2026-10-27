import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ResumeTaskButtonProps {
  taskId: string;
  label?: string;
  className?: string;
}

/** Opens the persisted next step; it never creates or regenerates a task/plan. */
export const ResumeTaskButton: React.FC<ResumeTaskButtonProps> = ({ taskId, label = 'Resume Task', className = '' }) => {
  const { apiClient } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resume = async () => {
    setBusy(true); setError('');
    try {
      const task = await apiClient.getTaskById(taskId);
      if (task.status === 'completed' || task.status === 'archived') {
        navigate(`/tasks/${task.id}`);
        return;
      }
      const goals = await apiClient.getGoals<Array<{ tasks: Array<{ id: string; dependencies?: string[] }> }>>();
      const prerequisites = goals.flatMap((goal) => goal.tasks).find((item) => item.id === task.id)?.dependencies || [];
      if (prerequisites.length) {
        const statuses = await Promise.all(prerequisites.map(async (id) => {
          try { return await apiClient.getTaskById(id); } catch { return null; }
        }));
        const blocked = statuses.find((item) => !item || item.status !== 'completed');
        if (blocked) throw new Error(blocked ? `Complete “${blocked.title}” before starting this task.` : 'A prerequisite needs review before this task can start.');
      }
      const next = task.steps.filter((step) => step.status === 'pending').sort((a, b) => a.order - b.order)[0];
      if (!next) {
        navigate(`/tasks/${task.id}`, { state: { historyPlanMissing: !task.steps.some((step) => step.status === 'completed') } });
        return;
      }
      if (task.status === 'paused') await apiClient.updateTask(task.id, { status: 'active' }, task.version);
      navigate(`/step-sequencer?taskId=${encodeURIComponent(task.id)}`, {
        state: { taskId: task.id, taskTitle: task.title, capacity: task.capacity, stepId: next.id,
          stepTitle: next.title, stepReason: next.reason, stepInstruction: next.instruction,
          stepDuration: next.estimatedDuration, stepOrder: next.order, stepSource: next.source || undefined },
      });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not resume this task. Please try again.'); }
    finally { setBusy(false); }
  };

  return <span className="inline-flex flex-col items-start gap-1"><button type="button" disabled={busy} onClick={()=>void resume()} className={`${className} disabled:opacity-50`}>{busy?'Opening…':label}</button>{error&&<span role="alert" className="text-xs text-amber-800">{error}</span>}</span>;
};
