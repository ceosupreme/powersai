export interface CheckoutCheckpoint {
  completed_through?: number;
  window_start?: number;
  window_end?: number;
  starting_after?: string;
}

/** Fixed windows and page checkpoints prevent the newest sessions starving older ones.
 * The overlap also revisits sessions whose payment completes after creation.
 */
export function checkoutWindow(state: CheckoutCheckpoint, now: number): Required<Pick<CheckoutCheckpoint, "window_start" | "window_end">> & { starting_after?: string } {
  if (state.window_start != null && state.window_end != null) {
    return { window_start: state.window_start, window_end: state.window_end, starting_after: state.starting_after };
  }
  return { window_start: Math.max(0, (state.completed_through ?? now) - 48 * 3600), window_end: now };
}

export async function scanCheckoutPages<T extends { id: string }>(args: {
  state: CheckoutCheckpoint;
  now: number;
  maxPages: number;
  fetchPage: (window: { window_start: number; window_end: number; starting_after?: string }) => Promise<{ data: T[]; has_more: boolean }>;
  process: (session: T) => Promise<void>;
  save: (state: CheckoutCheckpoint) => Promise<void>;
}): Promise<{ checked: number; complete: boolean; pages: number }> {
  const window = checkoutWindow(args.state, args.now);
  let checked = 0;
  // Persist the fixed upper boundary before the first external call.
  await args.save(window);
  for (let page = 0; page < args.maxPages; page++) {
    const batch = await args.fetchPage(window);
    if (!Array.isArray(batch.data) || typeof batch.has_more !== "boolean") throw new Error("invalid_checkout_page");
    if (batch.has_more && !batch.data.length) throw new Error("empty_checkout_page_with_more");
    for (const session of batch.data) {
      await args.process(session); // An error never advances the page cursor.
      checked++;
    }
    if (!batch.has_more) {
      await args.save({ completed_through: window.window_end });
      return { checked, complete: true, pages: page + 1 };
    }
    const last = batch.data[batch.data.length - 1]?.id;
    if (!last || last === window.starting_after) throw new Error("checkout_cursor_not_advancing");
    window.starting_after = last;
    await args.save({ ...window });
  }
  return { checked, complete: false, pages: args.maxPages };
}
