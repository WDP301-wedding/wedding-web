'use client';
import { useEffect, useState } from 'react';
import { authorizedRead } from '../couple-workspace/use-couple-workspace';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { loadSelectionChoices, type SelectionChoice } from './selection-catalog';
export function useSelectionCatalog(enabled: boolean) {
  const [choices, setChoices] = useState<readonly SelectionChoice[] | null>(null);
  const [catalogError, setCatalogError] = useState<FriendlyError | null>(null);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void authorizedRead((token) => loadSelectionChoices(token, controller.signal))
      .then((value) => {
        if (!controller.signal.aborted) {
          setChoices(value);
          setCatalogError(null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(describeApiError(error));
      });
    return () => controller.abort();
  }, [enabled, epoch]);
  return {
    choices,
    catalogError,
    reloadCatalog: () => {
      setChoices(null);
      setCatalogError(null);
      setEpoch((value) => value + 1);
    },
  };
}
