import { navigatorLock } from '@supabase/supabase-js';

/** The longest any tab waits for the shared sign-in lock before carrying on without it. */
const MAX_WAIT_MS = 5000;

/** Set once this tab has waited the full time and the other tab never let go. */
let lockLooksStuck = false;

const isWaitTimeout = (e: unknown) => {
  const err = e as { name?: string; isAcquireTimeout?: boolean } | null;
  return !!err && (err.name === 'AbortError' || err.isAcquireTimeout === true);
};

/**
 * Every open tab of the site takes turns through one browser lock before it reads or refreshes
 * the saved sign-in, and every database request reads the sign-in first. The library's default
 * waits for that lock forever, so a single frozen or stuck tab (Safari pauses background tabs)
 * leaves every other tab on an endless loading spinner.
 * This waits at most five seconds, then goes ahead without the lock. After one such wait, later
 * requests only take the lock if it is free that instant, so pages don't pay five seconds per load.
 */
export async function tabSafeLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof globalThis.navigator?.locks?.request !== 'function') return await fn();
  // 0 means "only if the lock is free right now" (the background token check); keep the library's behavior.
  if (acquireTimeout === 0) return await navigatorLock(name, 0, fn);

  let started = false;
  const run = () => {
    started = true;
    lockLooksStuck = false;
    return fn();
  };

  if (lockLooksStuck) {
    try {
      return await navigatorLock(name, 0, run);
    } catch (e) {
      if (started || !isWaitTimeout(e)) throw e;
      return await fn();
    }
  }

  const wait = acquireTimeout > 0 ? Math.min(acquireTimeout, MAX_WAIT_MS) : MAX_WAIT_MS;
  try {
    return await navigatorLock(name, wait, run);
  } catch (e) {
    if (started || !isWaitTimeout(e)) throw e;
    lockLooksStuck = true;
    console.warn('[auth] Another tab is holding the sign-in lock; continuing without it.');
    return await fn();
  }
}
