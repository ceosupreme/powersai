import { CategoryScoreCard } from './CategoryScoreCard';
import type { CategoryScore } from './deriveScores';

export const CategoryScoreGrid = ({ categories }: { categories: CategoryScore[] }) => (
  <div>
    <h2 className="text-sm font-semibold text-foreground mb-3">Category Scores</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {categories.map(c => <CategoryScoreCard key={c.key} cat={c} />)}
    </div>
  </div>
);
