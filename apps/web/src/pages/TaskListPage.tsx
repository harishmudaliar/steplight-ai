import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { TaskStatus, CapacityLevel } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

const CAPACITY_ICONS: Record<string, string> = {
  low: 'bedtime',
  medium: 'grain',
  high: 'bolt',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-primary-fixed text-on-primary-fixed',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  archived: 'bg-surface-container-high text-on-surface-variant',
};

export const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    tasks,
    total,
    page,
    pages,
    isLoading,
    isMutating,
    error,
    filters,
    fetchTasks,
    updateTask,
    deleteTask,
    setFilters,
    setPage,
    clearError,
  } = useTask();

  const [localSearch, setLocalSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TaskStatus>('all');
  const [filterCapacity, setFilterCapacity] = useState<'all' | CapacityLevel>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks({ status: filterStatus !== 'all' ? filterStatus : undefined, capacity: filterCapacity !== 'all' ? filterCapacity : undefined, page: 1 });
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on filter/capacity change
  const applyFilters = useCallback(() => {
    const newFilters = {
      status: filterStatus !== 'all' ? filterStatus : undefined,
      capacity: filterCapacity !== 'all' ? filterCapacity : undefined,
      search: localSearch.trim() || undefined,
      page: 1,
    };
    setFilters(newFilters);
    fetchTasks(newFilters);
  }, [filterStatus, filterCapacity, localSearch, fetchTasks, setFilters]);

  const handleStatusChange = (s: 'all' | TaskStatus) => {
    setFilterStatus(s);
    const newFilters = {
      status: s !== 'all' ? s : undefined,
      capacity: filterCapacity !== 'all' ? filterCapacity : undefined,
      search: localSearch.trim() || undefined,
      page: 1,
    };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handleCapacityChange = (c: 'all' | CapacityLevel) => {
    setFilterCapacity(c);
    const newFilters = {
      status: filterStatus !== 'all' ? filterStatus : undefined,
      capacity: c !== 'all' ? c : undefined,
      search: localSearch.trim() || undefined,
      page: 1,
    };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handleSearchChange = (q: string) => {
    setLocalSearch(q);
    if (searchDebounce) clearTimeout(searchDebounce);
    const t = setTimeout(() => {
      const newFilters = {
        status: filterStatus !== 'all' ? filterStatus : undefined,
        capacity: filterCapacity !== 'all' ? filterCapacity : undefined,
        search: q.trim() || undefined,
        page: 1,
      };
      setFilters(newFilters);
      fetchTasks(newFilters);
    }, 350);
    setSearchDebounce(t);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const newFilters = {
      ...filters,
      page: newPage,
    };
    fetchTasks(newFilters);
  };

  const handlePauseResume = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    try {
      await updateTask(taskId, { status: newStatus as TaskStatus });
      await fetchTasks({ ...filters, page });
    } catch {
      // error shown in banner
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteTitle(title);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await deleteTask(confirmDeleteId);
      await fetchTasks({ ...filters, page });
    } catch {
      // error shown in banner
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-on-surface dark:text-inverse-on-surface">
            Your Task Sanctuary
          </h1>
          <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">
            {isLoading ? 'Loading your tasks...' : `${total} task${total !== 1 ? 's' : ''} — no deadline pressure.`}
          </p>
        </div>
        <button
          id="new-task-btn"
          onClick={() => navigate('/tasks')}
          className="h-11 px-5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-2 shadow-sm hover:bg-primary transition-all active:scale-95 shrink-0 font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Task</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">error_outline</span>
          <span>{error}</span>
          <button type="button" onClick={() => fetchTasks(filters)} className="ml-auto underline">
            Retry
          </button>
          <button onClick={clearError} className="ml-auto" aria-label="Dismiss error">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-outline">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="text"
            id="task-search"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tasks gently..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 text-outline hover:text-on-surface"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-secondary dark:text-outline-variant font-medium mr-1">Status:</span>
            {(['all', 'active', 'paused', 'completed', 'archived'] as const).map((s) => (
              <button
                key={s}
                id={`filter-status-${s}`}
                onClick={() => handleStatusChange(s)}
                className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm transition-colors ${
                  filterStatus === s
                    ? 'bg-secondary-container text-primary font-semibold ring-1 ring-primary/40'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary dark:text-outline-variant hover:bg-surface-container'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Capacity filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-secondary dark:text-outline-variant font-medium mr-1">Capacity:</span>
            {(['all', 'low', 'medium', 'high'] as const).map((c) => (
              <button
                key={c}
                id={`filter-cap-${c}`}
                onClick={() => handleCapacityChange(c)}
                className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm capitalize transition-colors ${
                  filterCapacity === c
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary dark:text-outline-variant hover:bg-surface-container'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Cards */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 animate-pulse h-24" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-surface-container-low dark:bg-surface-container-low/20 border border-surface-container-high text-secondary dark:text-outline-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[32px] text-tertiary">spa</span>
          <span className="font-semibold text-base text-on-surface dark:text-inverse-on-surface">
            {localSearch || filterStatus !== 'all' || filterCapacity !== 'all' ? 'No tasks match your filter' : 'Your sanctuary is empty'}
          </span>
          <p className="text-xs">
            {localSearch || filterStatus !== 'all' || filterCapacity !== 'all'
              ? 'Try clearing your search or filters.'
              : 'Create your first task to begin your gentle journey.'}
          </p>
          {!localSearch && filterStatus === 'all' && filterCapacity === 'all' && (
            <button
              onClick={() => navigate('/tasks')}
              className="mt-2 h-10 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-2 shadow-sm hover:bg-primary transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create First Task
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 shadow-sm flex flex-col gap-3 hover:border-primary/40 transition-all ${
                deletingId === task.id ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="flex min-w-0 flex-col">
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm capitalize ${STATUS_BADGE_CLASSES[task.status] || 'bg-surface-container text-secondary'}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container dark:bg-secondary-container/30 text-primary font-label-sm text-label-sm capitalize flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">{CAPACITY_ICONS[task.capacity] || 'circle'}</span>
                      {task.capacity} energy
                    </span>
                  </div>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="min-w-0 break-words font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-inverse-on-surface hover:text-primary transition-colors [overflow-wrap:anywhere]"
                  >
                    {task.title}
                  </Link>
                  {task.notes && (
                    <p className="mt-0.5 min-w-0 break-words font-body-sm text-body-sm text-on-surface-variant line-clamp-2 [overflow-wrap:anywhere]">{task.notes}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className={`grid w-full gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-1.5 ${task.status !== 'completed' && task.status !== 'archived' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                  {/* Pause/Resume quick action */}
                  {(task.status === 'active' || task.status === 'paused') && (
                    <button
                      onClick={() => handlePauseResume(task.id, task.status)}
                      disabled={isMutating}
                      aria-label={task.status === 'paused' ? `Resume ${task.title}` : `Pause ${task.title}`}
                      title={task.status === 'paused' ? 'Resume' : 'Pause safely'}
                      className="flex h-11 w-full items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary sm:w-11 dark:text-outline-variant"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                        {task.status === 'paused' ? 'play_arrow' : 'pause'}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                    aria-label={`Edit ${task.title}`}
                    className="flex h-11 w-full items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary sm:w-11 dark:text-outline-variant"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(task.id, task.title)}
                    aria-label={`Delete ${task.title}`}
                    className="flex h-11 w-full items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-on-error-container focus-visible:ring-2 focus-visible:ring-primary sm:w-11 dark:text-outline-variant"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">delete_outline</span>
                  </button>
                  {task.status !== 'completed' && task.status !== 'archived' && (
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      aria-label={`Open ${task.title}`}
                      className="flex h-11 w-full items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-sm transition-colors hover:bg-primary focus-visible:ring-2 focus-visible:ring-primary sm:w-11"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Steps count or context */}
              {task.steps.length > 0 ? (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2.5 text-xs dark:bg-surface-container">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">arrow_forward</span>
                    <span className="min-w-0 truncate text-secondary dark:text-outline-variant">
                      Next step: <strong className="text-on-surface dark:text-inverse-on-surface">
                        {task.steps.find(s => s.status === 'pending')?.title ?? task.steps[0]?.title ?? '—'}
                      </strong>
                    </span>
                  </div>
                  <span className="font-semibold text-primary shrink-0">
                    {task.steps.filter(s => s.status === 'completed').length}/{task.steps.filter(s => s.status !== 'skipped').length} done
                  </span>
                </div>
              ) : task.notes ? (
                <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">notes</span>
                  <span className="text-secondary dark:text-outline-variant truncate">{task.notes}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container disabled:opacity-40 transition-colors"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              disabled={isLoading}
              className={`w-9 h-9 rounded-full font-label-sm text-label-sm transition-colors ${
                p === page
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'text-secondary hover:bg-surface-container'
              }`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pages || isLoading}
            className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container disabled:opacity-40 transition-colors"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn"
        >
          <div className="absolute inset-0 bg-scrim/50" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/60 p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-on-error-container">delete_forever</span>
              </div>
              <div>
                <h2 id="delete-modal-title" className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Delete this task?
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  "<span className="font-medium">{confirmDeleteTitle}</span>" and all its steps will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                id="confirm-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={isMutating}
                className="flex-1 h-11 rounded-xl bg-error text-on-error font-label-lg text-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Task
              </button>
              <button
                id="cancel-delete-btn"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center transition-colors hover:bg-surface-container-high"
              >
                Keep Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh hint */}
      <button
        onClick={() => applyFilters()}
        className="flex items-center gap-1.5 self-center text-outline font-label-sm text-label-sm hover:text-on-surface-variant transition-colors"
        aria-label="Refresh task list"
      >
        <span className={`material-symbols-outlined text-[15px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
        <span>Refresh</span>
      </button>
    </div>
  );
};
