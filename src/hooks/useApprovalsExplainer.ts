import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'stm.approvals.explainerDismissed.v1:';

export function useApprovalsExplainer(userId: string | null) {
  const storageKey = userId ? `${KEY_PREFIX}${userId}` : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setOpen(false);
      return;
    }
    try {
      setOpen(localStorage.getItem(storageKey) !== '1');
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, '1'); } catch { /* noop */ }
    }
    setOpen(false);
  }, [storageKey]);

  const reopen = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* noop */ }
    }
    setOpen(true);
  }, [storageKey]);

  return { open, dismiss, reopen };
}