import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityEvent, ActivityPage, ActivitySummary, Task } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { ResumeTaskButton } from '../components/ResumeTaskButton';

type Category = 'all' | 'steps' | 'pauses' | 'tasks';
type TaskFilter = 'all' | 'in_progress' | 'pending' | 'completed' | 'paused';
type TaskSort = 'recent' | 'deadline' | 'status';
type GoalTaskMeta = { id: string; title: string; milestone?: string; scheduled_date?: string | null; dependencies?: string[] };
type GoalMeta = { id: string; title: string; deadline: string; tasks: GoalTaskMeta[] };

const EVENT_TITLES: Record<string, string> = {
  task_created: 'Task created',
  task_updated: 'Task details updated',
  task_paused: 'Task paused',
  task_resumed: 'Task resumed',
  task_completed: 'Task marked complete',
  task_archived: 'Task archived',
  task_deleted: 'Task deleted',
  task_change_requested: 'Task change requested',
  feedback_dismissed: 'Step dismissed without completion',
  step_added: 'Step added',
  step_completed: 'Micro-step completed',
  step_made_smaller: 'Smaller action offered',
  step_deleted: 'Step removed',
};

function readMetadata(metadataJson?: string): Record<string, unknown> {
  if (!metadataJson) return {};
  try {
    const value: unknown = JSON.parse(metadataJson);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function displayString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function taskActivityDate(task: Task): string {
  const dates = [task.updatedAt, ...task.steps.flatMap((step) => [step.completedAt, step.createdAt])]
    .filter((value): value is string => Boolean(value)).sort();
  return dates[dates.length - 1] || task.updatedAt;
}

export const TaskHistoryPage: React.FC = () => {
  const [category, setCategory] = useState<Category>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<ActivityPage | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedTasks, setSavedTasks] = useState<Task[]>([]);
  const [goalByTask, setGoalByTask] = useState<Record<string, { title: string; deadline: string; milestone?: string; scheduledDate?: string | null; dependencies: string[] }>>({});
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSort, setTaskSort] = useState<TaskSort>('recent');
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const { apiClient, isAuthenticated } = useAuth();

  const loadSavedTasks = useCallback(async () => {
    if (!isAuthenticated) { setSavedTasks([]); setTaskLoading(false); return; }
    setTaskLoading(true); setTaskError(null);
    try {
      const first = await apiClient.getTasks({ page: 1, page_size: 100 });
      const all = [...first.tasks];
      for (let pageIndex = 2; pageIndex <= first.pages; pageIndex += 1) {
        const result = await apiClient.getTasks({ page: pageIndex, page_size: 100 });
        all.push(...result.tasks);
      }
      setSavedTasks(all);
      const goals = await apiClient.getGoals<GoalMeta[]>().catch(() => [] as GoalMeta[]);
      const metadata: typeof goalByTask = {};
      for (const goal of goals) for (const item of goal.tasks) metadata[item.id] = {
        title: goal.title, deadline: goal.deadline, milestone: item.milestone,
        scheduledDate: item.scheduled_date, dependencies: item.dependencies || [],
      };
      setGoalByTask(metadata);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Could not load saved tasks.');
    } finally { setTaskLoading(false); }
  }, [apiClient, isAuthenticated]);

  useEffect(() => { void loadSavedTasks(); }, [loadSavedTasks]);

  const visibleTasks = useMemo(() => {
    const search = taskSearch.trim().toLocaleLowerCase();
    const matches = savedTasks.filter((task) => {
      const done = task.steps.filter((step) => step.status === 'completed').length;
      const pending = task.steps.filter((step) => step.status === 'pending').length;
      if (taskFilter === 'paused' && task.status !== 'paused') return false;
      if (taskFilter === 'completed' && task.status !== 'completed') return false;
      if (taskFilter === 'pending' && !(task.status === 'active' && done === 0 && (task.steps.length === 0 || pending > 0))) return false;
      if (taskFilter === 'in_progress' && !(task.status === 'active' && done > 0 && pending > 0)) return false;
      return !search || task.title.toLocaleLowerCase().includes(search)
        || (task.notes || '').toLocaleLowerCase().includes(search)
        || (goalByTask[task.id]?.title || '').toLocaleLowerCase().includes(search);
    });
    return matches.sort((a, b) => {
      if (taskSort === 'status') {
        const rank: Record<string, number> = { active: 0, paused: 1, completed: 2, archived: 3 };
        return (rank[a.status] ?? 4) - (rank[b.status] ?? 4) || b.updatedAt.localeCompare(a.updatedAt);
      }
      if (taskSort === 'deadline') {
        const aDate = goalByTask[a.id]?.deadline || '9999-12-31';
        const bDate = goalByTask[b.id]?.deadline || '9999-12-31';
        return aDate.localeCompare(bDate) || b.updatedAt.localeCompare(a.updatedAt);
      }
      return taskActivityDate(b).localeCompare(taskActivityDate(a)) || b.createdAt.localeCompare(a.createdAt);
    });
  }, [savedTasks, taskFilter, taskSearch, taskSort, goalByTask]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setPage(null);
      setSummary(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [activityPage, activitySummary] = await Promise.all([
        apiClient.getActivityPage({ category, page: pageNumber, pageSize: 20 }),
        apiClient.getActivitySummary(),
      ]);
      setPage(activityPage);
      setSummary(activitySummary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load your activity.');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, category, isAuthenticated, pageNumber]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const chooseCategory = (next: Category) => {
    setCategory(next);
    setPageNumber(1);
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      <section aria-labelledby="saved-task-history" className="flex flex-col gap-space-sm">
        <div>
          <h1 id="saved-task-history" className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">History</h1>
          <p className="text-sm text-secondary dark:text-outline-variant mt-1">Find saved work and continue from the next unfinished step.</p>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <label className="sr-only" htmlFor="history-task-search">Search tasks</label>
          <input id="history-task-search" type="search" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search tasks or goals" className="rounded-xl border border-surface-container-high bg-surface-container-lowest px-3 py-2" />
          <label className="flex items-center gap-2 text-sm">Sort
            <select aria-label="Sort task history" value={taskSort} onChange={(event) => setTaskSort(event.target.value as TaskSort)} className="rounded-lg border bg-surface-container-lowest px-2 py-2">
              <option value="recent">Recent activity</option><option value="deadline">Upcoming deadlines</option><option value="status">Task status</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks">
          {([['all','All'],['in_progress','In Progress'],['pending','Pending'],['completed','Completed'],['paused','Paused']] as const).map(([value,label]) => (
            <button key={value} type="button" aria-pressed={taskFilter===value} onClick={()=>setTaskFilter(value)} className={`px-3 py-1.5 rounded-full text-sm ${taskFilter===value?'bg-primary-container text-on-primary-container font-semibold':'bg-surface-container-low text-secondary'}`}>{label}</button>
          ))}
        </div>
        {taskLoading ? <p role="status" className="p-4 text-center text-sm">Loading saved tasks…</p> : taskError ? <div role="alert" className="rounded-xl bg-error-container p-3 text-sm flex justify-between gap-3"><span>{taskError}</span><button onClick={()=>void loadSavedTasks()} className="underline">Retry</button></div> : !isAuthenticated ? <p className="p-4 text-center text-sm">Sign in to see tasks saved to your account.</p> : visibleTasks.length===0 ? <p className="p-4 text-center text-sm rounded-xl bg-surface-container-low">{savedTasks.length===0?'No saved tasks yet. Your tasks will appear here.':'No tasks match this search and filter.'}</p> : (
          <div className="flex flex-col gap-3">{visibleTasks.map((task) => {
            const steps = task.steps.filter((step) => step.status !== 'skipped');
            const completed = steps.filter((step) => step.status === 'completed').length;
            const pending = steps.filter((step) => step.status === 'pending').length;
            const metadata = goalByTask[task.id];
            const today = localDateKey(new Date());
            const overdue = Boolean(metadata && task.status !== 'completed' && task.status !== 'archived'
              && ((metadata.scheduledDate && metadata.scheduledDate < today) || metadata.deadline < today));
            const label = task.status==='completed' || task.status==='archived' || (steps.length>0 && pending===0 && completed>0) ? 'View Summary'
              : task.status==='paused' ? 'Resume Task' : completed===0 ? 'Start Task' : 'Resume Task';
            const lastActivity = taskActivityDate(task);
            const statusLabel = task.status === 'active' ? (completed > 0 ? 'In Progress' : 'Pending') : task.status.replace('_', ' ');
            return <article key={task.id} className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="min-w-0 max-w-full break-words font-semibold text-on-surface [overflow-wrap:anywhere]">{task.title}</h2><span className="rounded-full bg-surface-container-low px-2 py-0.5 text-xs capitalize">{statusLabel}</span>{overdue && <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs">Overdue</span>}</div>
                <p className="mt-1 text-sm text-secondary">{steps.length === 0 ? 'Plan not generated' : `${completed} of ${steps.length} steps complete · ${pending} remaining`}</p>
                <p className="mt-1 text-xs text-secondary">Created {new Date(task.createdAt).toLocaleDateString()} · Last activity {new Date(lastActivity).toLocaleDateString()}</p>
                {metadata && <p className="mt-1 text-xs text-secondary">Goal: {metadata.title}{metadata.milestone?` · ${metadata.milestone}`:''}{metadata.scheduledDate?` · Scheduled ${metadata.scheduledDate}`:''} · Deadline {metadata.deadline}</p>}
              </div><div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:flex"><ResumeTaskButton taskId={task.id} label={label} className="min-h-11 rounded-xl bg-primary-container px-3 py-2 text-sm font-semibold"/><Link to={`/tasks/${task.id}`} className="flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm">Details</Link></div></div>
              {steps.length>0 && <div className="mt-3 h-1.5 rounded-full bg-surface-container" aria-label={`${completed} of ${steps.length} steps complete`}><div className="h-1.5 rounded-full bg-primary" style={{width:`${Math.round(completed/steps.length*100)}%`}} /></div>}
            </article>;
          })}</div>
        )}
      </section>
      <details className="rounded-xl border border-surface-container-high p-3">
        <summary className="cursor-pointer font-semibold">Activity &amp; completion events</summary>
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>Gentle Archive • Zero Shame</span>
        </div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-inverse-on-surface tracking-tight mt-1">
          Activity &amp; Compassion Log
        </h2>
        <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
          A dated record of saved task and step events. Pauses are part of the story, not something to make up for.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-space-sm">
        <div className="p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm">
          <span className="text-xs text-primary font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[16px]">footprint</span>
            Steps completed
          </span>
          <span className="font-display-mobile text-display-mobile font-bold text-on-surface dark:text-inverse-on-surface">
            {summary ? summary.stepCompletions : isLoading ? '…' : '—'}
          </span>
          <span className="block text-[11px] text-secondary dark:text-outline-variant">stored completion events</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm">
          <span className="text-xs text-secondary dark:text-outline-variant font-semibold flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[16px]">spa</span>
            Pauses saved
          </span>
          <span className="font-display-mobile text-display-mobile font-bold text-on-surface dark:text-inverse-on-surface">
            {summary ? summary.pauses : isLoading ? '…' : '—'}
          </span>
          <span className="block text-[11px] text-secondary dark:text-outline-variant">stored pause events</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Filter activity">
        {([
          ['all', 'All activity'],
          ['steps', 'Steps'],
          ['pauses', 'Pauses'],
          ['tasks', 'Tasks'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => chooseCategory(value)}
            className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
              category === value
                ? 'bg-primary-container text-on-primary-container font-semibold'
                : 'bg-surface-container-low dark:bg-surface-container text-secondary hover:bg-surface-container'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5" aria-live="polite">
        {isLoading ? (
          <p role="status" className="p-4 text-center text-sm text-secondary">Loading your activity…</p>
        ) : error ? (
          <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-error-container text-on-error-container text-sm">
            <span>{error}</span>
            <button type="button" onClick={() => void loadHistory()} className="underline">Retry</button>
          </div>
        ) : !isAuthenticated ? (
          <p className="p-4 text-center text-sm text-secondary">Sign in to view activity saved to your account.</p>
        ) : page?.events.length === 0 ? (
          <p className="p-4 text-center text-sm text-secondary">No activity in this view yet. Every pace is welcome.</p>
        ) : page?.events.map((event: ActivityEvent) => {
          const metadata = readMetadata(event.metadataJson);
          const source = displayString(metadata.source, '');
          const strategy = displayString(metadata.strategy, '');
          return (
            <article
              key={event.id}
              className="p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-secondary-container text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  {event.eventType.startsWith('step_') ? 'check_circle' : 'self_improvement'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface truncate">
                    {EVENT_TITLES[event.eventType] ?? 'Activity recorded'}
                  </span>
                  <time dateTime={event.createdAt} className="text-[11px] text-outline shrink-0">
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-0.5 text-xs text-secondary dark:text-outline-variant truncate">
                  {displayString(metadata.task_title, 'Task activity')}
                  {typeof metadata.step_title === 'string' ? ` · ${metadata.step_title}` : ''}
                </p>
                {(source || strategy) && (
                  <p className="mt-1 text-[11px] text-secondary dark:text-outline-variant">
                    Suggestion: {source || 'source not recorded'}{strategy ? ` · Strategy: ${strategy.replace(/_/g, ' ')}` : ''}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {isAuthenticated && page && page.pages > 1 && (
        <nav aria-label="Activity pages" className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={pageNumber <= 1 || isLoading}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            className="px-3 py-2 rounded-lg bg-surface-container-low disabled:opacity-50"
          >
            Previous
          </button>
          <span aria-live="polite">Page {page.page} of {page.pages} · {page.total} events</span>
          <button
            type="button"
            disabled={pageNumber >= page.pages || isLoading}
            onClick={() => setPageNumber((current) => current + 1)}
            className="px-3 py-2 rounded-lg bg-surface-container-low disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}

      <div className="text-center text-xs text-secondary dark:text-outline-variant pt-2">
        <Link to="/progress" className="text-primary hover:underline">View your event summary</Link>
      </div>
      </details>
    </div>
  );
};
