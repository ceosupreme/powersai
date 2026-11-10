/** Small, dependency-free contracts shared by the team account setup UI.
 * These helpers do NOT grant permissions; database policies remain authoritative.
 */
export type TeamAccountRole = 'admin' | 'owner' | 'gm' | 'manager' | 'shift_lead' | 'staff' | 'client';
export type WorkspaceRole = 'owner' | 'gm' | 'lead' | 'foh' | 'client';

const WORKSPACE_ROLES: Record<TeamAccountRole, WorkspaceRole> = {
  admin: 'owner', owner: 'owner', gm: 'gm', manager: 'gm',
  shift_lead: 'lead', staff: 'foh', client: 'client',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;

export function createdUserId(payload: unknown): string {
  const value = record(payload);
  if (!value || value.error || value.success === false) throw new Error('Account creation was not confirmed.');
  const nested = record(value.user);
  const supplied = [value.user_id, value.id, nested?.id].filter(v => v !== undefined && v !== null);
  if (!supplied.length || supplied.some(v => typeof v !== 'string' || !UUID.test(v))) {
    throw new Error('The account service did not return a valid user ID.');
  }
  const ids = supplied as string[];
  if (new Set(ids.map(id => id.toLowerCase())).size !== 1) {
    throw new Error('The account service returned conflicting user IDs.');
  }
  return ids[0].toLowerCase();
}

export function workspaceRoleFor(role: string): WorkspaceRole {
  if (!Object.prototype.hasOwnProperty.call(WORKSPACE_ROLES, role)) {
    throw new Error('Unknown account role. No workspace assignment was made.');
  }
  return WORKSPACE_ROLES[role as TeamAccountRole];
}

export function permissionEnabled(defaults: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(defaults, key) && defaults[key] === true;
}

export async function checkedSetupWrite(
  operation: PromiseLike<{ error: unknown }>,
  step: string,
): Promise<void> {
  const { error } = await operation;
  if (error) {
    const message = record(error)?.message;
    throw new Error(`${step}: ${typeof message === 'string' ? message : 'could not save'}`);
  }
}
