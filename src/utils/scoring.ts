// Single source of truth for grade calculation, colors, and validation

export function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A': '#22C55E', // Green
    'B': '#06B6D4', // Cyan
    'C': '#EAB308', // Yellow
    'D': '#F97316', // Orange
    'F': '#EF4444', // Red
  };
  return colors[grade] || colors['F'];
}

export function getScoreColor(score: number): string {
  const grade = getGradeFromScore(score);
  const colors: Record<string, string> = {
    'A': 'text-emerald-400',
    'B': 'text-cyan-400',
    'C': 'text-yellow-400',
    'D': 'text-orange-400',
    'F': 'text-red-400',
  };
  return colors[grade] || colors['F'];
}

export function getGradeBackgroundClass(grade: string): string {
  const colors: Record<string, string> = {
    'A': 'bg-emerald-500/20 text-emerald-400',
    'B': 'bg-cyan-500/20 text-cyan-400',
    'C': 'bg-yellow-500/20 text-yellow-400',
    'D': 'bg-orange-500/20 text-orange-400',
    'F': 'bg-red-500/20 text-red-400',
  };
  return colors[grade] || 'bg-muted text-muted-foreground';
}

export function validateScoreGrade(score: number, displayedGrade: string): boolean {
  const correctGrade = getGradeFromScore(score);
  if (correctGrade !== displayedGrade) {
    console.error(`SCORE BUG: ${score} should be ${correctGrade}, showing ${displayedGrade}`);
    return false;
  }
  return true;
}
