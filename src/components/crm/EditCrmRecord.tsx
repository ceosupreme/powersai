import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'email' | 'textarea'; required?: boolean };
export function EditCrmRecord({ title, record, fields, onSave }: {
  title: string; record: Record<string, any>; fields: Field[]; onSave: (patch: Record<string, any>) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  return <><Button size="sm" variant="outline" onClick={() => {
    setDraft(Object.fromEntries(fields.map(f => [f.key, record[f.key] == null ? '' : String(record[f.key])])));
    setOpen(true);
  }}>Edit {title.toLowerCase()}</Button>
    <Dialog open={open} onOpenChange={v => !saving && setOpen(v)}><DialogContent>
      <DialogHeader><DialogTitle>Edit {title.toLowerCase()}</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault(); setSaving(true);
        try {
          const patch = Object.fromEntries(fields.map(f => [f.key, !draft[f.key]?.trim() ? null : f.type === 'number' ? Number(draft[f.key]) : draft[f.key].trim()]));
          await onSave(patch); toast.success(`${title} updated`); setOpen(false);
        } catch (error: any) { toast.error(error.message ?? 'Could not save'); }
        finally { setSaving(false); }
      }}>
        {fields.map(f => <div key={f.key}><Label htmlFor={`edit-${f.key}`}>{f.label}</Label>
          {f.type === 'textarea' ? <Textarea id={`edit-${f.key}`} value={draft[f.key] ?? ''} onChange={e => setDraft({...draft,[f.key]:e.target.value})} />
            : <Input id={`edit-${f.key}`} type={f.type ?? 'text'} min={f.type === 'number' ? 0 : undefined} step="any" required={f.required} value={draft[f.key] ?? ''} onChange={e => setDraft({...draft,[f.key]:e.target.value})} />}
        </div>)}
        <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</Button>
      </form>
    </DialogContent></Dialog></>;
}
export const COMPANY_FIELDS: Field[] = [{key:'name',label:'Company name',required:true},{key:'website',label:'Website'},{key:'industry',label:'Industry'},{key:'notes',label:'Notes',type:'textarea'}];
export const CONTACT_FIELDS: Field[] = [{key:'first_name',label:'First name',required:true},{key:'last_name',label:'Last name'},{key:'email',label:'Email',type:'email'},{key:'phone',label:'Phone'},{key:'title',label:'Job title'},{key:'notes',label:'Notes',type:'textarea'}];
export const DEAL_FIELDS: Field[] = [{key:'title',label:'Title',required:true},{key:'value',label:'Value',type:'number'},{key:'expected_close',label:'Expected close',type:'date'},{key:'notes',label:'Notes',type:'textarea'}];
