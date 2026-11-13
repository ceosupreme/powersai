/** Viewer identity is presentation-only; mutations always use the signed-in account. */
export type TeamViewer = { id: string | null; name: string };
export type TeamStep = {
  id: string; title: string; status: string; approval_status: string | null;
  owner_kind: string | null; assignee: string | null; assignee_id: string | null;
  depends_on: string | null; job_id: string | null; step_order: number | null;
  due_date: string | null;
};
export const assignedTo = (step: TeamStep, viewer: TeamViewer) =>
  step.assignee_id != null ? !!viewer.id && step.assignee_id === viewer.id :
    !!viewer.name.trim() && step.assignee?.trim().toLowerCase() === viewer.name.trim().toLowerCase();
export function ownerLabel(step: TeamStep, viewer: TeamViewer): string {
  if (assignedTo(step, viewer)) return 'You';
  if (step.owner_kind === 'claude') return 'Claude';
  if (step.owner_kind === 'agent') return 'AI agent';
  return step.assignee?.trim() || 'Not assigned';
}
export const dependencyFinished = (step: TeamStep, byId: Map<string, TeamStep>) =>
  !step.depends_on || byId.get(step.depends_on)?.status === 'Done';
export const readyFor = (step: TeamStep, viewer: TeamViewer, byId: Map<string, TeamStep>, inactive: Set<string>) =>
  assignedTo(step, viewer) && step.status === 'Open' && step.approval_status === 'Approved' &&
  (!step.job_id || !inactive.has(step.job_id)) && dependencyFinished(step, byId);
export function teamStepState(step: TeamStep, byId: Map<string, TeamStep>): string {
  if (step.status === 'Done') return 'Done';
  if (!dependencyFinished(step, byId)) return 'Waiting on an earlier step';
  if (!step.approval_status || step.approval_status === 'Proposed') return 'Waiting for approval';
  return 'Ready';
}
export const orderedSteps = <T extends TeamStep>(steps: T[]) => [...steps].sort((a, b) =>
  (a.step_order ?? Number.MAX_SAFE_INTEGER) - (b.step_order ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
export function planPosition(step: TeamStep, steps: TeamStep[]) {
  const same = orderedSteps(steps.filter(s => s.job_id === step.job_id));
  return { position: same.findIndex(s => s.id === step.id) + 1, count: same.length };
}
export function teamPeople(steps: TeamStep[]) {
  const people = new Map<string, TeamViewer & { key: string; open: number }>();
  for (const step of steps) {
    const name = step.assignee?.trim();
    if (step.owner_kind !== 'owner' || !name) continue;
    const key = step.assignee_id || name;
    const person = people.get(key) ?? { key, id: step.assignee_id, name, open: 0 };
    if (step.status === 'Open') person.open++;
    people.set(key, person);
  }
  return [...people.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
}
export function defaultTeamViewer(steps: TeamStep[], admin: TeamViewer, choice: string | null) {
  const people = teamPeople(steps);
  return people.find(p => p.key === choice) ?? people.find(p =>
    p.id ? p.id !== admin.id : p.name.toLowerCase() !== admin.name.trim().toLowerCase()) ??
    { id: null, name: '', key: '', open: 0 };
}
/** Monday–Sunday dates anchored to today's Pacific calendar date, not UTC today. */
export function pacificWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const monday = new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const sunday = new Date(monday); sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}
export function weeklyCompletion(steps: TeamStep[], viewer: TeamViewer, now = new Date()) {
  const { start, end } = pacificWeek(now);
  const due = steps.filter(s => assignedTo(s, viewer) && s.due_date && s.due_date.slice(0, 10) >= start && s.due_date.slice(0, 10) <= end);
  return { done: due.filter(s => s.status === 'Done').length, total: due.length };
}
export function questionStatus(step: Pick<TeamStep, 'status' | 'approval_status'>) {
  return step.approval_status === 'Rejected' ? 'Closed' : step.status === 'Done' ? 'Answered' : 'Waiting on Allmighty';
}