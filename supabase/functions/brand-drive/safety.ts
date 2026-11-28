/** All file, folder, thumbnail, text and stream paths use this same fail-closed check. */
export const READY = '1uR2Oj5y8R9XijfrXVLnRTkqdG8WWXpta';
export const APPROVAL = '1LChacEqIMtMrFA2pZJddmdRyh4gLgY4U';
export const ADMIN_ROOTS = [READY, APPROVAL, '1Nz5RoB4CLLvwV2K4ltxl7HWD-JJxMWwh', '1jhpfIUjxAy1UqyFXRJ0EEBB5y5gLCMg_', '1mfM-Y177PDtVisJYXIJSA5pKFh7EqkSl', '1CQyZbNMCoARanjoXCmYYTb7sMaC2FZ-l'];
export const FOLDER = 'application/vnd.google-apps.folder';
export interface DriveFile { id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean; size?: string; thumbnailLink?: string; webViewLink?: string }
export interface BrandRoot { projectId: string; name: string; roots: DriveFile[]; aliases: string[] }
export function normalizeName(name: string) { return name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim(); }
export function driveId(url: string): string | null {
  try { const u = new URL(url); if (!['drive.google.com', 'docs.google.com'].includes(u.hostname)) return null;
    return u.pathname.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]+)/)?.[1] ?? u.searchParams.get('id');
  } catch { return null; }
}
export function titleMatches(name: string, aliases: string[]) {
  const n = ` ${normalizeName(name)} `;
  return aliases.some(a => { const clean = normalizeName(a); return clean.length > 2 && n.includes(` ${clean} `); });
}
export async function fileAvailable(fileId: string, context: { admin: boolean; brands: BrandRoot[]; storedRoots?: string[] }, get: (id: string) => Promise<DriveFile>): Promise<boolean> {
  const seen = new Set<string>();
  async function walk(id: string, below: DriveFile[], depth: number): Promise<boolean> {
    if (seen.has(id) || depth > 100) return false;
    seen.add(id);
    const file = await get(id);
    if (file.trashed || file.mimeType === 'application/vnd.google-apps.shortcut') return false;
    // These shared libraries are never helper roots, even if someone saves their URL in a kit.
    if (ADMIN_ROOTS.includes(id) && ![READY, APPROVAL].includes(id)) return context.admin;
    if (context.admin && (ADMIN_ROOTS.includes(id) || context.storedRoots?.includes(id))) return true;
    if (id === READY) {
      const day = below[below.length - 1]; const brand = below[below.length - 2];
      return !!day && !!brand && /^\d{4}-\d{2}-\d{2}(?:\s|$)/.test(day.name) && brand.mimeType === FOLDER &&
        context.brands.some(b => b.aliases.some(a => normalizeName(a) === normalizeName(brand.name)));
    }
    if (id === APPROVAL) { const child = below[below.length - 1]; return !!child && context.brands.some(b => titleMatches(child.name, b.aliases)); }
    if (context.brands.some(b => b.roots.some(r => r.id === id))) return true;
    for (const parent of file.parents ?? []) if (await walk(parent, [...below, file], depth + 1)) return true;
    return false;
  }
  return walk(fileId, [], 0);
}
