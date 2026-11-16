import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { LEAD_STAGES, stageOf, type LeadStage } from '@/lib/leads';

export const LeadMoveMenu = ({ status, onMove }: { status: string; onMove: (s: LeadStage) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" className="h-9" onClick={(e) => e.stopPropagation()}>
        Move to <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
      {LEAD_STAGES.filter((s) => s.key !== stageOf(status)).map((s) => (
        <DropdownMenuItem key={s.key} onSelect={() => onMove(s.key)}>{s.label}</DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
