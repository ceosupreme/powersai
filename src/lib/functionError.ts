import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * The reason a backend function gave for refusing a request. supabase-js only says
 * "Edge Function returned a non-2xx status code"; the function's own answer (for example
 * "Password should be at least 8 characters" or "A user with this email address has already
 * been registered") is in the response body.
 */
export async function functionErrorMessage(error: unknown, fallback = 'Something went wrong'): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).clone().json();
      const reason = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : '';
      if (reason.trim()) return reason.trim();
    } catch {
      // Not a JSON answer; fall through to the generic message.
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
