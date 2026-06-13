import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  FileText,
  BarChart3,
  Users,
  Lightbulb,
  ClipboardList,
  Plus,
  Settings,
} from 'lucide-react';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pages = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Weekly Review', href: '/weekly-review', icon: ClipboardList },
  { label: 'Insights', href: '/insights', icon: Lightbulb },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Logs', href: '/logs', icon: FileText },
  { label: 'Sales', href: '/sales', icon: BarChart3 },
  { label: 'Labor', href: '/labor', icon: Users },
  { label: 'Operations', href: '/operations', icon: Settings },
  { label: 'Guest Experience', href: '/guest-experience', icon: Users },
];

const quickActions = [
  { label: 'New Task', href: '/tasks?action=new', icon: Plus },
  { label: 'New Log', href: '/logs/new', icon: Plus },
];

export const GlobalSearchModal = ({ open, onOpenChange }: GlobalSearchModalProps) => {
  const navigate = useNavigate();

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem key={page.href} onSelect={() => handleSelect(page.href)}>
              <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem key={action.href} onSelect={() => handleSelect(action.href)}>
              <action.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
