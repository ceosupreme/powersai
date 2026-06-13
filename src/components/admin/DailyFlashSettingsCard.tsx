import { useState, useCallback } from 'react';
import { Mail, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DailyFlashSettingsCard = () => {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');

  const { data: emails = [] } = useQuery({
    queryKey: ['daily-flash-emails'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'daily_flash')
        .maybeSingle();
      if (error) throw error;
      const val = data?.value as Record<string, unknown> | null;
      return (val?.emails as string[]) || [];
    },
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (newEmails: string[]) => {
      const { error } = await supabase
        .from('app_config')
        .upsert([{ key: 'daily_flash', value: JSON.parse(JSON.stringify({ emails: newEmails })), updated_at: new Date().toISOString() }], { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily-flash-emails'] }),
  });

  const addEmail = useCallback(() => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_REGEX.test(trimmed)) {
      toast({ title: 'Invalid email format', variant: 'destructive' });
      return;
    }
    if (emails.includes(trimmed)) {
      toast({ title: 'Email already added', variant: 'destructive' });
      return;
    }
    mutation.mutate([...emails, trimmed]);
    setNewEmail('');
  }, [newEmail, emails, mutation]);

  const removeEmail = useCallback((email: string) => {
    mutation.mutate(emails.filter(e => e !== email));
  }, [emails, mutation]);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Daily Flash Email Recipients</h3>
            <p className="text-xs text-muted-foreground">Who receives the morning performance summary</p>
          </div>
        </div>

        {/* Email chips */}
        <div className="flex flex-wrap gap-2">
          {emails.map(email => (
            <Badge key={email} variant="secondary" className="pl-3 pr-1 py-1 gap-1 text-sm">
              {email}
              <button
                onClick={() => removeEmail(email)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {emails.length === 0 && (
            <p className="text-sm text-muted-foreground">No recipients added yet</p>
          )}
        </div>

        {/* Add email input */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Add email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            className="flex-1"
          />
          <Button onClick={addEmail} size="sm" disabled={mutation.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Email uses a dark theme matching the app, optimized for mobile reading
        </p>
      </div>
    </div>
  );
};
