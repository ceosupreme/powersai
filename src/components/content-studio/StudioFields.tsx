import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { recipeFields, type StudioRecipe } from '@/lib/contentStudio';

export function StudioFields({ recipe, picks, onChange, disabled = false }: {
  recipe?: StudioRecipe; picks: Record<string, unknown>; onChange: (picks: Record<string, unknown>) => void; disabled?: boolean;
}) {
  return <div className="space-y-6">{recipeFields(recipe).map(field => {
    const value = String(picks[field.key] ?? '');
    return <fieldset key={field.key} className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-semibold">{field.label}{field.required ? ' *' : ''}</legend>
      {field.help && <p className="text-sm text-muted-foreground">{field.help}</p>}
      {!!field.options?.length && <div className="grid gap-2 sm:grid-cols-3">{field.options.map(option => <button
        type="button" key={option.value} aria-pressed={value === option.value}
        onClick={() => onChange({ ...picks, [field.key]: option.value })}
        className={cn('rounded-xl border p-3 text-left transition-colors hover:border-primary', value === option.value ? 'border-primary bg-primary/10' : 'bg-card')}>
        <span className="block text-sm font-medium">{option.label}</span>
        {option.description && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>}
      </button>)}</div>}
      <Label htmlFor={`studio-field-${field.key}`} className="sr-only">{field.label}: your choice</Label>
      <Input id={`studio-field-${field.key}`} value={value} onChange={e => onChange({ ...picks, [field.key]: e.target.value })}
        placeholder={field.options?.length ? 'Choose above or enter your own' : `Enter ${field.label.toLowerCase()}`} />
    </fieldset>;
  })}</div>;
}
