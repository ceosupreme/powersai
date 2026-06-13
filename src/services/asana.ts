// Asana Integration for BarPulse
// Task creation routed through secure edge function

import { supabase } from '@/integrations/supabase/client';

// Configuration - GIDs are not secrets, safe to keep in code
const ASANA_CONFIG = {
  projectGid: "1212864048654137",
  workspaceGid: "16292914201127",
  sectionGid: "1213411282942300",
};

// Team members for assignee dropdown
export const ASANA_TEAM = [
  { gid: "1206488306539301", name: "Bri Perone" },
  { gid: "16292902617627", name: "Chad Cline" },
  { gid: "1127223604809283", name: "Kristen Hanley" },
  { gid: "42667232270701", name: "Julia" },
  { gid: "42035858807143", name: "Sal" },
];

// Map profile name to Asana GID (best-effort matching for migration)
export function getAsanaGidFromName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const member = ASANA_TEAM.find(
    m => m.name.toLowerCase() === name.toLowerCase()
  );
  return member?.gid;
}

export interface AsanaTask {
  gid: string;
  permalink_url: string;
}

export interface AsanaTaskInput {
  title: string;
  notes: string;
  dueDate?: string;
  assigneeGid?: string;
  barCode?: string;
  projectGid?: string;
  sectionGid?: string;
}

export async function createAsanaTask({ title, notes, dueDate, assigneeGid, barCode, projectGid, sectionGid }: AsanaTaskInput): Promise<AsanaTask> {
  const trimmedTitle = (title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Cannot create Asana task with an empty title');
  }
  const barPrefix = barCode ? `[${barCode}] ` : '';
  const taskName = `${barPrefix}${trimmedTitle}`;
  // Append venue code and any extra context to notes
  let fullNotes = notes;
  if (barCode) {
    fullNotes = `Venue: [${barCode}]\n\n${fullNotes}`;
  }

  const { data, error } = await supabase.functions.invoke('asana-proxy', {
    body: {
      action: 'create_task',
      params: {
        name: taskName,
        notes: fullNotes,
        due_on: dueDate ? dueDate.split("T")[0] : undefined,
        assignee: assigneeGid || undefined,
        project_gid: projectGid || ASANA_CONFIG.projectGid,
        section_gid: sectionGid || ASANA_CONFIG.sectionGid,
        workspace_gid: ASANA_CONFIG.workspaceGid,
      },
    },
  });

  if (error) {
    throw new Error(`Asana error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`Asana error: ${data.error}`);
  }

  return {
    gid: data.gid,
    permalink_url: data.permalink_url,
  };
}

export function isAsanaConfigured(): boolean {
  // Always configured since the token is stored as a backend secret
  return true;
}
