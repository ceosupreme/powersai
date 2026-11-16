import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useProspectMutations } from '@/hooks/useProspects';

const SOURCES = [
  { v: 'manual', l: 'Manual' }, { v: 'social', l: 'Social' }, { v: 'places', l: 'Google' },
  { v: 'network', l: 'Network' }, { v: 'jobs', l: 'Job board' }, { v: 'website', l: 'Website' },
];
const EMPTY = { business_name: '', contact_name: '', phone: '', email: '', city: '', offer: '', source: 'manual', notes: '' };

export const AddLeadDialog = ({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded?: (id: string) => void }) => {
  const { addLead } = useProspectMutations();
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.business_name.trim()) return;
    addLead.mutate(f, {
      onSuccess: (id) => { toast({ title: 'Lead added' }); setF(EMPTY); onOpenChange(false); onAdded?.(id); },
      onError: (err: any) => toast({ title: 'Could not add lead', description: err?.message, variant: 'destructive' }),
    });
  };
  const text = (k: keyof typeof EMPTY, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={`al-${k}`}>{label}</Label>
      <Input id={`al-${k}`} type={type} value={f[k]} onChange={set(k)} className="h-11 text-base" required={k === 'business_name'} />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Only the name is required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {text('business_name', 'Name')}
          {text('contact_name', 'Contact person')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {text('phone', 'Phone', 'tel')}
            {text('email', 'Email', 'email')}
            {text('city', 'City')}
            {text('offer', 'Offer')}
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={f.source} onValueChange={(v) => setF({ ...f, source: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="al-notes">Notes</Label>
            <Textarea id="al-notes" value={f.notes} onChange={set('notes')} rows={3} className="text-base" />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-11" disabled={!f.business_name.trim() || addLead.isPending}>Add lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
