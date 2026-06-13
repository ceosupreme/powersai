import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LogFormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function LogFormSection({ title, children, defaultOpen = true }: LogFormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden border shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3 px-4 sm:px-5 bg-muted/30">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
            <ChevronDown 
              className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" 
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-4 pb-5 px-4 sm:px-5 space-y-5">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
