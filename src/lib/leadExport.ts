import type { Prospect } from '@/hooks/useProspects';
import { doNotContactReason, formatDay, sourceLabel, stageLabel, stageOf, toCsv } from '@/lib/leads';

type Names = Record<string, string>;

function cells(p: Prospect, names: Names) {
  return [
    p.business_name, p.contact_name, p.phone, p.email, stageLabel(stageOf(p.status)),
    sourceLabel(p.source, p.platform), p.source_url, p.city, p.offer, p.fit_score,
    p.assigned_to ? names[p.assigned_to] ?? 'Someone else' : 'Unassigned',
    p.next_follow_up ? formatDay(p.next_follow_up) : '',
    p.last_contacted_at ? formatDay(p.last_contacted_at) : '',
    p.their_words, p.sell_notes, p.notes,
    p.do_not_contact ? `Yes. ${doNotContactReason(p) ?? ''}`.trim() : '',
  ];
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

export function exportLeadsCsv(rows: Prospect[], names: Names) {
  const csv = toCsv(rows.map((p) => cells(p, names)));
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `leads-${stamp()}.csv`);
}

/** Printable call sheet: one block per lead. */
export async function exportLeadsPdf(rows: Prospect[], names: Names) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const left = 48, width = 516, bottom = 740;
  let y = 56;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Leads call sheet', left, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  y += 16; doc.text(`${rows.length} lead${rows.length === 1 ? '' : 's'} · ${stamp()}`, left, y);
  y += 20;
  const ensure = (h: number) => { if (y + h > bottom) { doc.addPage(); y = 56; } };
  const para = (label: string, value: string | null | undefined) => {
    if (!value) return;
    const lines = doc.splitTextToSize(`${label}: ${value}`, width);
    for (const line of lines) { ensure(13); doc.text(line, left, y); y += 13; }
  };
  for (const p of rows) {
    const c = cells(p, names);
    ensure(70);
    doc.setDrawColor(200); doc.line(left, y, left + width, y); y += 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(doc.splitTextToSize(p.business_name, width)[0], left, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    if (p.do_not_contact) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 0, 0);
      para('DO NOT CONTACT', doNotContactReason(p));
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    }
    para('Contact', [c[1], c[2], c[3]].filter(Boolean).join(' · '));
    para('Stage', [c[4], c[5], c[7], c[8]].filter(Boolean).join(' · '));
    para('Fit score', c[9] != null ? String(c[9]) : null);
    para('Assigned', String(c[10]));
    para('Next follow-up', c[11] as string);
    para('Last contacted', c[12] as string);
    para('Found at', c[6] as string);
    para('Their words', c[13] as string);
    para('Sell notes', c[14] as string);
    para('Notes', c[15] as string);
    ensure(26); doc.setTextColor(120); doc.text('Call notes: ______________________________________________', left, y + 10); doc.setTextColor(0);
    y += 26;
  }
  doc.save(`leads-${stamp()}.pdf`);
}
