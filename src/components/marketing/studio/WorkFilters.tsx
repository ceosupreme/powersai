import { STUDIO_CATEGORIES, type StudioCategoryId } from "@/content/studioProjects";
import { cn } from "@/lib/utils";

export type CategoryFilter = StudioCategoryId | "all";

/**
 * Category filters for /work.
 *
 * Real buttons (not links styled as toggles), 44px targets, keyboard reachable,
 * with aria-pressed state. Categories with zero actual projects are not
 * rendered — no filter ever leads to a fabricated or empty result.
 */
export function WorkFilters({
  active,
  available,
  counts,
  total,
  onChange,
}: {
  active: CategoryFilter;
  available: StudioCategoryId[];
  counts: Record<string, number>;
  total: number;
  onChange: (next: CategoryFilter) => void;
}) {
  if (available.length < 2) return null;

  const options: { id: CategoryFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    ...STUDIO_CATEGORIES.filter((c) => available.includes(c.id)).map((c) => ({
      id: c.id as CategoryFilter,
      label: c.label,
      count: counts[c.id] ?? 0,
    })),
  ];

  return (
    <div className="mt-10">
      <h2 className="studio-label">Filter the work</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter projects by service">
        {options.map((o) => {
          const on = o.id === active;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.id)}
              className={cn(
                "min-h-[44px] rounded-lg border px-4 text-[0.92rem] transition-colors",
                on
                  ? "border-[hsl(var(--cobalt))] bg-[hsl(var(--cobalt-pale))] text-[hsl(var(--cobalt))]"
                  : "border-[hsl(var(--rule))] text-foreground/85 hover:border-foreground/40",
              )}
            >
              {o.label}
              <span className="ml-2 opacity-60">{o.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
