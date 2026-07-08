import type { EngineKey, FootprintKey } from './types';

// Adding a new footprint key in project_type_qualifier_config.operation_footprint_options
// is safe (no DB CHECK), but you MUST add its engine defaults here in the same change —
// otherwise the builder falls through to `acquisition` only.
export const ENGINE_DEFAULTS: Record<FootprintKey, EngineKey[]> = {
  solo_owner: ['acquisition'],
  small_crew_2_5: ['acquisition', 'retention'],
  crew_6_plus: ['acquisition', 'retention', 'command_center'],
  multi_location: ['acquisition', 'retention', 'command_center', 'delivery'],
};

export function enginesForFootprint(f: FootprintKey | null): EngineKey[] {
  if (!f) return ['acquisition'];
  return ENGINE_DEFAULTS[f] ?? ['acquisition'];
}

// Rough substring match — solo/crew/multi in package names. Never fabricates rows.
export function preselectPackageId(
  packages: { id: string; name: string }[],
  footprint: FootprintKey | null,
): string | null {
  if (!footprint || packages.length === 0) return null;
  const needle =
    footprint === 'solo_owner' ? 'solo' :
    footprint === 'small_crew_2_5' ? 'crew' :
    footprint === 'crew_6_plus' ? 'crew' :
    footprint === 'multi_location' ? 'multi' : null;
  if (!needle) return null;
  const hit = packages.find((p) => p.name.toLowerCase().includes(needle));
  return hit?.id ?? null;
}