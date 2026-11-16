import { useEffect, useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatDollars } from '@/lib/leakStackFormat';
import { LEAD_STAGES, doNotContactReason, formatDay, optedOutThemselves, sourceLabel, stageAfterContact, stageOf, type LeadStage } from '@/lib/leads';
import {
  useProspectActivity, useProspectMutations,
  type LeadPerson, type Prospect, type ProspectActivityKind, type ProspectStatus,
} from '@/hooks/useProspects';
import {
  ArrowUpRight, Ban, Copy, ExternalLink, FileSearch, Globe, Instagram, Mail, MessageSquarePlus,
  Phone, Star, XCircle, PhoneCall, MessageSquare, Send, MessagesSquare, Users, StickyNote,
} from 'lucide-react';
import { CrmBadge, DoNotContactBadge, SourceBadge } from './LeadBadges';

const QUICK: { kind: ProspectActivityKind; label: string; icon: typeof Phone }[] = [
  { kind: 'call', label: 'Called', icon: PhoneCall },
  { kind: 'text', label: 'Texted', icon: MessageSquare },
  { kind: 'email', label: 'Emailed', icon: Send },
  { kind: 'dm', label: 'Messaged', icon: MessagesSquare },
  { kind: 'meeting', label: 'Met', icon: Users },
  { kind: 'note', label: 'Add note', icon: StickyNote },
];
const KIND_LABEL: Record<string, string> = {
  call: 'Called', text: 'Texted', email: 'Emailed', dm: 'Messaged', meeting: 'Met',
  note: 'Note', status: 'Stage', auto: 'Automatic',
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-[15px] break-words">{children}</div>
  </div>
);
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2 border-t pt-4">
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    {children}
  </section>
);
const link = 'text-primary underline-offset-2 hover:underline inline-flex items-center gap-1.5';
const ensureHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const igUrl = (h: string) => (/^https?:\/\//i.test(h) ? h : `https://instagram.com/${h.replace(/^@/, '')}`);

interface Props {
  prospect: Prospect | null;
  people: LeadPerson[];
  names: Record<string, string>;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (p: Prospect, s: LeadStage) => void;
  onCheckup: (p: Prospect) => void;
  onDraft: (p: Prospect) => void;
  onPromote: (p: Prospect) => void;
}

export const LeadDetailSheet = ({ prospect: p, people, names, busy, onOpenChange, onMove, onCheckup, onDraft, onPromote }: Props) => {
  const isMobile = useIsMobile();
  const { updateFields, logContact, setDoNotContact } = useProspectMutations();
  const { data: activity = [] } = useProspectActivity(p?.id ?? null);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [logKind, setLogKind] = useState<ProspectActivityKind | null>(null);
  const [logText, setLogText] = useState('');
  const [confirmContactAgain, setConfirmContactAgain] = useState(false);

  useEffect(() => {
    setDraft(p?.drafted_message ?? '');
    setNotes(p?.notes ?? '');
    setLogKind(null); setLogText(''); setConfirmContactAgain(false);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch: Partial<Prospect>, ok = 'Saved') =>
    p && updateFields.mutate({ id: p.id, patch }, {
      onSuccess: () => toast({ title: ok }),
      onError: (e: any) => toast({ title: 'Could not save', description: e?.message, variant: 'destructive' }),
    });

  const setDnc = (on: boolean) =>
    p && setDoNotContact.mutate({ id: p.id, on }, {
      onSuccess: () => toast({ title: on ? 'Marked do not contact' : 'This lead can be contacted again' }),
      onError: (e: any) => toast({ title: 'Could not save', description: e?.message, variant: 'destructive' }),
    });
  /** Someone who opted out themselves needs a second look before the mark comes off. */
  const toggleDnc = (on: boolean) => {
    if (!p) return;
    if (!on && optedOutThemselves(p)) setConfirmContactAgain(true);
    else setDnc(on);
  };

  const submitLog = () => {
    if (!p || !logKind) return;
    const next = logKind === 'note' ? null : stageAfterContact(p.status);
    logContact.mutate({ prospect: p, kind: logKind, summary: logText.trim(), nextStatus: next as ProspectStatus | null }, {
      onSuccess: () => { toast({ title: logKind === 'note' ? 'Note added' : 'Logged' }); setLogKind(null); setLogText(''); },
      onError: (e: any) => toast({ title: 'Could not log', description: e?.message, variant: 'destructive' }),
    });
  };

  return (
    <Sheet open={!!p} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('flex flex-col gap-0 p-0', isMobile ? 'h-[100dvh]' : 'w-full sm:max-w-xl')}
      >
        {p && (
          <>
            <SheetHeader className="border-b p-4 pr-12 text-left space-y-2">
              <SheetTitle className="text-xl break-words">{p.business_name}</SheetTitle>
              <SheetDescription className="sr-only">Everything we know about this lead</SheetDescription>
              {p.contact_name && <p className="text-base">{p.contact_name}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={stageOf(p.status)} onValueChange={(v) => onMove(p, v as LeadStage)}>
                  <SelectTrigger className="h-10 w-44" aria-label="Stage"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <SourceBadge p={p} />
                <CrmBadge p={p} />
                <DoNotContactBadge p={p} />
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {p.do_not_contact ? (
                <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                  <p className="flex items-center gap-2 text-base font-semibold text-destructive"><Ban className="h-5 w-5 shrink-0" />Do not contact this lead</p>
                  <p className="text-[15px]">{doNotContactReason(p)} No calls, texts, emails or messages. Automatic outreach is off for this lead.</p>
                  {(p.phone || p.email) && <p className="text-sm text-muted-foreground break-words">On file: {[p.phone, p.email].filter(Boolean).join(' · ')}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {p.phone ? (
                    <Button asChild size="lg" variant="outline" className="h-12"><a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}><Phone className="mr-2 h-4 w-4" />{p.phone}</a></Button>
                  ) : null}
                  {p.email ? (
                    <Button asChild size="lg" variant="outline" className="h-12 min-w-0"><a href={`mailto:${p.email}`}><Mail className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{p.email}</span></a></Button>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Source">{sourceLabel(p.source, p.platform)}</Field>
                <Field label="City">{p.city || '—'}</Field>
                <Field label="Offer">{p.offer || '—'}</Field>
                <Field label="Lead type">{p.lead_type || '—'}</Field>
                <Field label="Fit score">{p.fit_score ?? '—'}</Field>
                <Field label="Found by">{p.found_by || '—'}</Field>
                <Field label="Added">{formatDay(p.created_at)}</Field>
                <Field label="Last contacted">{p.last_contacted_at ? `${formatDay(p.last_contacted_at)}${p.last_contact_channel ? ` (${KIND_LABEL[p.last_contact_channel] ?? p.last_contact_channel})` : ''}` : '—'}</Field>
              </div>
              <div className="flex flex-col gap-2 text-[15px]">
                {p.source_url && <a className={link} href={p.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />View where we found them</a>}
                {p.website && <a className={link} href={ensureHttp(p.website)} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" />{p.website}</a>}
                {p.instagram && <a className={link} href={igUrl(p.instagram)} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4" />{p.instagram}</a>}
              </div>

              <Section title="Log what you did">
                <div className="grid grid-cols-3 gap-2">
                  {QUICK.map((q) => (
                    <Button key={q.kind} variant={logKind === q.kind ? 'default' : 'outline'} className="h-11" onClick={() => { setLogKind(q.kind); setLogText(''); }}>
                      <q.icon className="mr-1.5 h-4 w-4" />{q.label}
                    </Button>
                  ))}
                </div>
                {logKind && (
                  <div className="flex gap-2">
                    <Input autoFocus value={logText} onChange={(e) => setLogText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitLog()}
                      placeholder={logKind === 'note' ? 'Your note' : 'Optional one-line summary'} className="h-11 text-base" aria-label="Summary" />
                    <Button className="h-11" onClick={submitLog} disabled={logContact.isPending || (logKind === 'note' && !logText.trim())}>Save</Button>
                  </div>
                )}
              </Section>

              {p.their_words && <Section title="What they said"><p className="whitespace-pre-wrap text-[15px]">{p.their_words}</p></Section>}
              {p.sell_notes && <Section title="Sell notes"><p className="whitespace-pre-wrap text-[15px]">{p.sell_notes}</p></Section>}

              <Section title="Drafted message">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} className="text-[15px]" placeholder="No message drafted yet." />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-10" disabled={!draft.trim()} onClick={async () => {
                    try { await navigator.clipboard.writeText(draft); toast({ title: 'Copied' }); } catch { toast({ title: 'Could not copy', variant: 'destructive' }); }
                  }}><Copy className="mr-1.5 h-4 w-4" />Copy</Button>
                  {draft !== (p.drafted_message ?? '') && <Button size="sm" className="h-10" onClick={() => save({ drafted_message: draft || null }, 'Message saved')}>Save message</Button>}
                </div>
              </Section>

              {p.leak_run_id && (
                <Section title="Google checkup">
                  <p className="text-[15px] inline-flex items-center gap-1.5"><Star className="h-4 w-4" />{p.rating ?? '—'} ({p.review_count ?? 0} reviews)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Est. recoverable</p><p className="text-base font-semibold tabular-nums">{formatDollars(p.leak_total)}/mo</p></div>
                    <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Est. risk exposure</p><p className="text-base font-semibold tabular-nums">{formatDollars(p.risk_total)}/mo</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Estimates from public data and vertical defaults, not their books.</p>
                  {p.last_error && <p className="text-sm text-destructive break-words">Checkup error: {p.last_error}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-11" onClick={() => onCheckup(p)}><FileSearch className="mr-1.5 h-4 w-4" />Checkup</Button>
                    <Button variant="outline" className="h-11" onClick={() => onDraft(p)}><MessageSquarePlus className="mr-1.5 h-4 w-4" />Draft first touch</Button>
                  </div>
                </Section>
              )}

              <Section title="Working this lead">
                <div className="space-y-1.5">
                  <Label>Assigned to</Label>
                  <Select value={p.assigned_to ?? 'none'} onValueChange={(v) => save({ assigned_to: v === 'none' ? null : v }, 'Assigned')}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {p.assigned_to && !people.some((x) => x.id === p.assigned_to) && <SelectItem value={p.assigned_to}>{names[p.assigned_to] ?? 'Someone else'}</SelectItem>}
                      {people.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-follow">Next follow-up</Label>
                  <Input id="lead-follow" type="date" className="h-11 text-base" value={p.next_follow_up ?? ''} onChange={(e) => save({ next_follow_up: e.target.value || null }, 'Follow-up saved')} />
                </div>
                <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-[15px] font-medium">Outreach: {p.outreach_mode === 'auto' ? 'Auto' : 'Manual'}</p>
                    <p className="text-sm text-muted-foreground">Auto hands this lead to the outreach sequence. No sequence is connected yet.</p>
                  </div>
                  <Switch checked={p.outreach_mode === 'auto'} disabled={p.do_not_contact} aria-label="Automatic outreach" onCheckedChange={(v) => save({ outreach_mode: v ? 'auto' : 'manual' }, v ? 'Set to Auto' : 'Set to Manual')} />
                </div>
                <div className={cn('flex items-start justify-between gap-3 rounded-lg border p-3', p.do_not_contact && 'border-destructive/50 bg-destructive/5')}>
                  <div>
                    <p className="text-[15px] font-medium">Do not contact</p>
                    <p className="text-sm text-muted-foreground">
                      {p.do_not_contact
                        ? doNotContactReason(p)
                        : 'Switch on when someone asks you to stop. It blocks automatic messages and flags this lead everywhere.'}
                    </p>
                  </div>
                  <Switch checked={p.do_not_contact} disabled={setDoNotContact.isPending} aria-label="Do not contact" onCheckedChange={toggleDnc} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-notes">Notes</Label>
                  <Textarea id="lead-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-[15px]" />
                  {notes !== (p.notes ?? '') && <Button size="sm" className="h-10" onClick={() => save({ notes: notes || null }, 'Notes saved')}>Save notes</Button>}
                </div>
              </Section>

              <Section title="Next steps">
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-11" onClick={() => onPromote(p)} disabled={p.status === 'promoted' || !!p.promoted_company_id || busy}>
                    <ArrowUpRight className="mr-1.5 h-4 w-4" />Send to CRM pipeline
                  </Button>
                  <Button variant="outline" className="h-11 text-destructive" onClick={() => onMove(p, 'dead')} disabled={p.status === 'dead'}>
                    <XCircle className="mr-1.5 h-4 w-4" />Mark dead
                  </Button>
                </div>
              </Section>

              <Section title="Activity">
                {activity.length === 0 ? <p className="text-sm text-muted-foreground">Nothing logged yet.</p> : (
                  <ol className="space-y-3">
                    {activity.map((a) => (
                      <li key={a.id} className="border-l-2 border-primary/40 pl-3">
                        <p className="text-[15px]"><span className="font-medium">{KIND_LABEL[a.kind] ?? a.kind}</span>{a.summary ? `: ${a.summary}` : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })}
                          {a.created_by ? ` · ${names[a.created_by] ?? 'Someone else'}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </div>
            <AlertDialog open={confirmContactAgain} onOpenChange={setConfirmContactAgain}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Contact this lead again?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {doNotContactReason(p)} Only switch this off if they have told you they want to hear from you again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep do not contact</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setConfirmContactAgain(false); setDnc(false); }}>They asked to hear from us</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
