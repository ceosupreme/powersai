import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoiceInputButton } from './VoiceInputButton';
import type { FormField, LogTypeField } from '@/types/logs';
import { cn } from '@/lib/utils';

interface LogFieldProps {
  field: LogTypeField & { form_fields: FormField };
  value: unknown;
  onChange: (value: unknown) => void;
}

export function LogField({ field, value, onChange }: LogFieldProps) {
  const { form_fields: formField, required } = field;
  const { field_type, label, options_json, voice_enabled } = formField;

  const handleVoiceTranscript = (transcript: string) => {
    if (field_type === 'short_text' || field_type === 'long_text') {
      const currentValue = (value as string) || '';
      onChange(currentValue ? `${currentValue} ${transcript}` : transcript);
    }
  };

  const renderField = () => {
    switch (field_type) {
      case 'short_text':
        return (
          <div className="flex gap-2">
            <Input
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="flex-1 h-11 text-base sm:text-sm"
            />
            {voice_enabled && <VoiceInputButton onTranscript={handleVoiceTranscript} />}
          </div>
        );

      case 'long_text':
        return (
          <div className="space-y-2">
            <div className="flex justify-end">
              {voice_enabled && <VoiceInputButton onTranscript={handleVoiceTranscript} />}
            </div>
            <Textarea
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              rows={4}
              className="text-base sm:text-sm resize-none"
            />
          </div>
        );

      case 'number':
        const numValue = (value as number) ?? 0;
        return (
          <div className="flex items-center justify-center gap-4 sm:gap-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 sm:h-10 sm:w-10 shrink-0 rounded-xl"
              onClick={() => onChange(Math.max(0, numValue - 1))}
            >
              <Minus className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
            <div className="w-20 text-center">
              <span className="text-3xl sm:text-2xl font-bold tabular-nums text-foreground">{numValue}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 sm:h-10 sm:w-10 shrink-0 rounded-xl"
              onClick={() => onChange(numValue + 1)}
            >
              <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        );

      case 'boolean':
        const boolValue = value as boolean | undefined;
        return (
          <div className="flex gap-3 sm:gap-2">
            <Button
              type="button"
              variant={boolValue === true ? 'default' : 'outline'}
              className={cn(
                'flex-1 h-12 sm:h-11 text-base sm:text-sm font-medium rounded-xl',
                boolValue === true && 'bg-primary text-primary-foreground shadow-md'
              )}
              onClick={() => onChange(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={boolValue === false ? 'default' : 'outline'}
              className={cn(
                'flex-1 h-12 sm:h-11 text-base sm:text-sm font-medium rounded-xl',
                boolValue === false && 'bg-primary text-primary-foreground shadow-md'
              )}
              onClick={() => onChange(false)}
            >
              No
            </Button>
          </div>
        );

      case 'select':
        const options = (options_json as string[]) || [];
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
          >
            <SelectTrigger className="h-11 text-base sm:text-sm">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option} className="text-base sm:text-sm py-3 sm:py-2">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 text-base sm:text-sm"
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 text-base sm:text-sm"
          />
        );

      case 'rating_1_10':
        const ratingValue = (value as number) || 5;
        return (
          <div className="space-y-4 py-2">
            <div className="px-2">
              <Slider
                value={[ratingValue]}
                onValueChange={([v]) => onChange(v)}
                min={1}
                max={10}
                step={1}
                className="touch-pan-x"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground px-1">
              <span>1</span>
              <span className="text-xl font-bold text-primary">{ratingValue}</span>
              <span>10</span>
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 text-base sm:text-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
    </div>
  );
}
