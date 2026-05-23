import { useState } from 'react';
import type { Gig, GigStatus } from '../types/database';
import { updateGigDetails, updateGigStatus } from '../services/gigs';
import { GIG_STATUS_LABELS, GIG_STATUS_STYLES } from '../utils/gigStatus';

interface NgoGigCardProps {
  gig: Gig;
  onUpdated: () => void;
}

export function NgoGigCard({ gig, onUpdated }: NgoGigCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(gig.title);
  const [description, setDescription] = useState(gig.description);
  const [volunteersNeeded, setVolunteersNeeded] = useState(gig.volunteers_needed);
  const [skills, setSkills] = useState(gig.required_skills.join(', '));

  const gigDate = new Date(gig.gig_date);
  const [datePart, setDatePart] = useState(gigDate.toISOString().slice(0, 10));
  const [timePart, setTimePart] = useState(
    gigDate.toTimeString().slice(0, 5)
  );

  const runAction = async (action: () => Promise<void>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: GigStatus) =>
    runAction(
      async () => {
        await updateGigStatus(gig.id, status);
      },
      status === 'cancelled'
        ? 'Close this gig? Volunteers will no longer see it on the map.'
        : undefined
    );

  const saveEdits = () =>
    runAction(async () => {
      const combined = new Date(`${datePart}T${timePart}`);
      if (Number.isNaN(combined.getTime())) {
        throw new Error('Invalid date or time');
      }
      await updateGigDetails(gig.id, {
        title: title.trim(),
        description: description.trim(),
        volunteers_needed: volunteersNeeded,
        required_skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        gig_date: combined.toISOString(),
      });
      setEditing(false);
    });

  const isTerminal = gig.status === 'completed' || gig.status === 'cancelled';

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{gig.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${GIG_STATUS_STYLES[gig.status]}`}
            >
              {GIG_STATUS_LABELS[gig.status]}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{gig.description}</p>
          <p className="mt-2 text-xs text-gray-500">
            {gig.volunteers_joined}/{gig.volunteers_needed} volunteers ·{' '}
            {gigDate.toLocaleString()}
          </p>
          {gig.required_skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {gig.required_skills.map((s) => (
                <span key={s} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>
      )}

      {!editing && (
        <div className="no-print mt-4 flex flex-wrap gap-2">
          {!isTerminal && (
            <>
              {gig.status === 'open' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('in_progress')}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Start gig
                </button>
              )}
              {(gig.status === 'open' || gig.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('completed')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark completed
                </button>
              )}
              {(gig.status === 'open' || gig.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus('cancelled')}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Close gig
                </button>
              )}
            </>
          )}
          {gig.status === 'cancelled' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus('open')}
              className="rounded-lg border border-emerald-400 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Reopen gig
            </button>
          )}
          {!isTerminal && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Edit details
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Required skills</label>
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Volunteers needed</label>
              <input
                type="number"
                min={1}
                value={volunteersNeeded}
                onChange={(e) => setVolunteersNeeded(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input
                type="date"
                value={datePart}
                onChange={(e) => setDatePart(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Time</label>
            <input
              type="time"
              value={timePart}
              onChange={(e) => setTimePart(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveEdits}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setTitle(gig.title);
                setDescription(gig.description);
                setVolunteersNeeded(gig.volunteers_needed);
                setSkills(gig.required_skills.join(', '));
              }}
              className="rounded-lg border px-4 py-2 text-xs text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
