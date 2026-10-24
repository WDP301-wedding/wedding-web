'use client';
import { useEffect, useRef, useState } from 'react';
import type { GuestGroup } from '../guest-management/guest-api';
import type { SeatingPlan } from './seating-api';
/** Unsaved labels, bounded undo history and per-tab same-revision recovery. */
export function useSeatingLabels(
  bookingId: string,
  plan: SeatingPlan,
  groups: readonly GuestGroup[],
  onChanged: (plan: SeatingPlan) => void,
) {
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId])),
  );
  const history = useRef<Record<string, string>[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const labelsRef = useRef(labels);
  const assignLabel = (tableId: string, groupId: string) => {
    const previous = labelsRef.current;
    if ((previous[tableId] ?? '') === groupId) return;
    history.current.push({ ...previous });
    if (history.current.length > 50) history.current.shift();
    // Keep history only for this editor lifetime; no user data is persisted.
    const next = { ...previous };
    if (groupId) next[tableId] = groupId;
    else delete next[tableId];
    labelsRef.current = next;
    setLabels(next);
    setUndoCount(history.current.length);
  };
  const dirty =
    JSON.stringify(Object.entries(labels).sort()) !==
    JSON.stringify(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId]).sort());

  const draftKey = 'wedding-seating-draft:' + bookingId + ':' + plan.revisionId;
  const hydrated = useRef(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          const tables = new Set(plan.renderSnapshot.map((table) => table.layoutTableId)),
            groupIds = new Set(groups.map((group) => group.guestGroupId));
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            !Array.isArray(parsed) &&
            Object.entries(parsed).every(
              ([table, group]) =>
                tables.has(table) && typeof group === 'string' && groupIds.has(group),
            )
          ) {
            const restored = Object.fromEntries(Object.entries(parsed)) as Record<string, string>;
            labelsRef.current = restored;
            setLabels(restored);
          } else sessionStorage.removeItem(draftKey);
        }
      } catch {
        /* Storage can be unavailable; editing must remain usable. */
      }
      hydrated.current = true;
    });
    return () => {
      active = false;
    };
  }, [draftKey, groups, plan.renderSnapshot]);
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (dirty) sessionStorage.setItem(draftKey, JSON.stringify(labels));
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* Optional per-tab draft recovery. */
    }
  }, [draftKey, dirty, labels]);
  const acceptPlan = (next: SeatingPlan | undefined) => {
    if (!next) return;
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* Optional storage. */
    }
    onChanged(next);
  };

  const undo = () => {
    const previous = history.current.pop();
    if (previous) {
      labelsRef.current = previous;
      setLabels(previous);
      setUndoCount(history.current.length);
    }
  };
  const reset = () => {
    history.current.push({ ...labelsRef.current });
    if (history.current.length > 50) history.current.shift();
    const original = Object.fromEntries(
      plan.labels.map((label) => [label.layoutTableId, label.guestGroupId]),
    );
    labelsRef.current = original;
    setLabels(original);
    setUndoCount(history.current.length);
  };
  return { labels, dirty, undoCount, assignLabel, acceptPlan, undo, reset };
}
