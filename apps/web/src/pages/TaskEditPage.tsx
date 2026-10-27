import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CapacityLevel, TaskStatus } from '@steplight/shared';
import { useAuth } from '../context/AuthContext';
import { useTask } from '../context/TaskContext';

export const TaskEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, apiClient } = useAuth();
  const {
    currentTask,
    currentTaskLoading,
    currentTaskError,
    isMutating,
    error,
    fetchTaskById,
    updateTask,
    deleteTask,
    clearCurrentTask,
    clearError,
  } = useTask();

  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [capacity, setCapacity] = useState<CapacityLevel>('medium');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (id) {
      clearCurrentTask();
      clearError();
      fetchTaskById(id);
    }
    return () => clearCurrentTask();
  }, [id, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate form once task loads
  useEffect(() => {
    if (currentTask) {
      setTitle(currentTask.title);
      setNotes(currentTask.notes ?? '');
      setCapacity(currentTask.capacity);
    }
  }, [currentTask]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setSubmitAttempted(true); return; }
    if (!id) return;

    clearError();
    setIsPlanning(true); setPlanError(null);
    try {
      if (currentTask?.planModel) {
        await apiClient.generatePlan(id, currentTask.version, { title: title.trim() === currentTask.title ? undefined : title.trim(), notes: notes.trim(), capacity });
      } else await updateTask(id, {
        title: title.trim(),
        notes: notes.trim(),
        capacity,
      });
      navigate(`/tasks/${id}`, { state: { taskUpdated: true } });
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : 'Could not adapt the plan. Retry.');
    } finally { setIsPlanning(false); }
  };

  const handleArchive = async () => {
    if (!id) return;
    setShowArchiveModal(false);
    try {
      await updateTask(id, { status: 'archived' as TaskStatus });
      navigate('/tasks/all');
    } catch {
      // error shown via context
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setShowDeleteModal(false);
    try {
      await deleteTask(id);
      navigate('/tasks/all');
    } catch {
      // error shown via context
    }
  };

  const titleError = submitAttempted && !title.trim();

  // Loading state
  if (currentTaskLoading) {
    return (
      <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md animate-pulse">
        <div className="h-8 bg-surface-container-high rounded w-1/2" />
        <div className="h-64 rounded-2xl bg-surface-container-lowest border border-surface-container-high/60" />
      </div>
    );
  }

  // Error / Not found state
  if (currentTaskError && !currentTask) {
    return (
      <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md items-center py-12 text-center">
        <span className="material-symbols-outlined text-[40px] text-tertiary">search_off</span>
        <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Task not found</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{currentTaskError}</p>
        <button
          onClick={() => navigate('/tasks/all')}
          className="mt-4 h-11 px-5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-2 hover:bg-primary transition-all"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto gap-space-md">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface dark:text-inverse-on-surface">
          Edit Task Details
        </h1>
        <p className="font-body-sm text-body-sm text-secondary dark:text-outline-variant">
          Adjust wording or capacity to match what feels achievable today.
        </p>
      </div>

      {planError && <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container">{planError}</p>}
      {currentTask?.planModel && <p className="text-sm text-secondary">Saving sends your updated goal and capacity to Google Gemini to adapt remaining steps. Completed work is preserved.</p>}
      {/* API error banner */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">error_outline</span>
          <span>{error}</span>
          <button onClick={clearError} className="ml-auto" aria-label="Dismiss error">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {error?.includes('changed on another device') && id && (
        <button
          type="button"
          onClick={() => {
            clearError();
            void fetchTaskById(id);
          }}
          className="self-start h-10 px-4 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md"
        >
          Reload latest version
        </button>
      )}

      <form onSubmit={handleSave} noValidate className="rounded-2xl bg-surface-container-lowest dark:bg-surface-container-lowest/40 border border-surface-container-high/60 p-6 shadow-sm flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-title" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
            Task Name
          </label>
          <input
            id="edit-title"
            type="text"
            required
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (submitAttempted) setSubmitAttempted(false); }}
            maxLength={255}
            aria-invalid={titleError}
            aria-describedby={titleError ? 'edit-title-error' : undefined}
            className={`w-full h-11 px-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner ${
              titleError ? 'ring-2 ring-error' : ''
            }`}
          />
          {titleError && (
            <p id="edit-title-error" className="font-body-sm text-body-sm text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">error_outline</span>
              Task name is required.
            </p>
          )}
          <div className="flex justify-end">
            <span className={`font-label-sm text-label-sm ${title.length > 230 ? 'text-error' : 'text-outline'}`}>
              {title.length}/255
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-notes" className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
            Context &amp; Breadcrumbs <span className="font-normal text-on-surface-variant">(Optional)</span>
          </label>
          <textarea
            id="edit-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            className="w-full p-3 rounded-xl bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-inverse-on-surface placeholder-outline font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-inner resize-none"
          />
          <div className="flex justify-end">
            <span className={`font-label-sm text-label-sm ${notes.length > 1900 ? 'text-error' : 'text-outline'}`}>
              {notes.length}/2000
            </span>
          </div>
        </div>

        {/* Capacity */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md font-semibold text-on-surface dark:text-inverse-on-surface">
            Energy Capacity Sizing
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => setCapacity(cap)}
                aria-pressed={capacity === cap}
                className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                  capacity === cap
                    ? 'bg-secondary-container text-primary ring-2 ring-primary'
                    : 'bg-surface-container-low dark:bg-surface-container text-secondary'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="submit"
            id="save-task-btn"
            disabled={isMutating || isPlanning}
            className="w-full sm:flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:bg-primary transition-all active:scale-[0.98] font-semibold disabled:opacity-60 disabled:cursor-wait"
          >
            {isMutating || isPlanning ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Changes
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/tasks/${id}`)}
            className="w-full sm:w-auto px-5 h-12 rounded-xl bg-surface-container-low dark:bg-surface-container text-secondary font-label-md text-label-md hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-surface-container-high pt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            id="archive-task-btn"
            onClick={() => setShowArchiveModal(true)}
            disabled={isMutating || currentTask?.status === 'archived'}
            className="flex-1 h-10 rounded-xl bg-surface-container text-secondary hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950/20 dark:hover:text-amber-300 transition-colors font-label-md text-label-md flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[16px]">archive</span>
            Archive Task
          </button>
          <button
            type="button"
            id="delete-task-btn"
            onClick={() => setShowDeleteModal(true)}
            disabled={isMutating || isPlanning}
            className="flex-1 h-10 rounded-xl bg-surface-container text-secondary hover:bg-error-container hover:text-on-error-container transition-colors font-label-md text-label-md flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Delete Task
          </button>
        </div>
      </form>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="archive-modal-title" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-scrim/50" onClick={() => setShowArchiveModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/60 p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-amber-700">archive</span>
              </div>
              <div>
                <h2 id="archive-modal-title" className="font-headline-sm text-headline-sm font-semibold text-on-surface">Archive this task?</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Archiving safely tucks it away. You can still view it in your task list.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                id="confirm-archive-btn"
                onClick={handleArchive}
                className="flex-1 h-11 rounded-xl bg-amber-500 text-white font-label-lg text-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Archive
              </button>
              <button
                id="cancel-archive-btn"
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center hover:bg-surface-container-high transition-colors"
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-scrim/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high/60 p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-on-error-container">delete_forever</span>
              </div>
              <div>
                <h2 id="delete-modal-title" className="font-headline-sm text-headline-sm font-semibold text-on-surface">Permanently delete?</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  "<span className="font-medium">{currentTask?.title}</span>" and all its steps will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                id="confirm-delete-btn"
                onClick={handleDelete}
                className="flex-1 h-11 rounded-xl bg-error text-on-error font-label-lg text-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Forever
              </button>
              <button
                id="cancel-delete-btn"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center hover:bg-surface-container-high transition-colors"
              >
                Keep Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
