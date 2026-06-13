import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayPacific(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Feature flags - set to true to enable
export const FEATURES = {
  VOICE_INTERVIEW: false, // Temporarily disabled until fixed
};

// Priority sorting for ActionCards
// All pillars are weighted equally at 25 points each (4 x 25 = 100 total)
export const PILLAR_MAX_SCORE = 25;

export const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export const sortByPriority = <T extends { priority: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => 
    (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
  );
};

// Format helpers
export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | undefined | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const [ey, em, ed] = end.split('-').map(Number);
  const endDate = new Date(ey, em - 1, ed);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} – ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
}

export function gradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A': 'text-signal-green',
    'B': 'text-cyan-400',
    'C': 'text-gold',
    'D': 'text-orange',
    'F': 'text-destructive',
  };
  return colors[grade] || 'text-muted-foreground';
}

export function gradeBackgroundColor(grade: string): string {
  const colors: Record<string, string> = {
    'A': 'bg-signal-green/20 text-signal-green',
    'B': 'bg-cyan-500/20 text-cyan-400',
    'C': 'bg-gold/20 text-gold',
    'D': 'bg-orange/20 text-orange',
    'F': 'bg-destructive/20 text-destructive',
  };
  return colors[grade] || 'bg-muted text-muted-foreground';
}
