import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { getStudioMedia } from '@/config/studioMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { safeSeatUrl, seatVideoEmbed, seatFaqSchema, seatIntentForTown, seatQuestion, type SeatPage, type SeatTown, type SeatIntent } from '@/lib/aiSeat';

interface Props { page: SeatPage; towns: SeatTown[]; initialTown?: string; onSubmit?: (form: HTMLFormElement, town: SeatTown, angle: string, intent: SeatIntent) => Promise<void> }
const Block = ({title, children, dark = false, id}: {title: string; children: ReactNode; dark?: boolean; id?: string}) => <section id={id} className={`seat-section ${dark ? 'seat-dark' : ''}`}><div className="seat-inner"><h2>{title}</h2>{children}</div></section>;
export function SeatContent({page: p, towns, initialTown, onSubmit}: Props) {
  const [townSlug, setTownSlug] = useState(initialTown || towns[0]?.town_slug || '');
  const [after, setAfter] = useState(false);
  const [angle, setAngle] = useState('');
  const [intent, setIntent] = useState<SeatIntent>('claim');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const selected = towns.find(t => t.town_slug === townSlug) || towns[0];
  const question = seatQuestion(p, selected?.town || '');
  const [typed, setTyped] = useState(question);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(question); return; }
    setAnimated(true); let i = 0; setTyped('');
    const timer = window.setInterval(() => { i += 2; setTyped(question.slice(0, i)); if (i >= question.length) window.clearInterval(timer); }, 28);
    return () => window.clearInterval(timer);
  }, [question]);
  useEffect(() => { setTownSlug(initialTown || towns[0]?.town_slug || ''); }, [initialTown, p.id]);
  const label = (key: string, fallback = '') => p.labels[key] || fallback;
  const choose = (t: SeatTown) => { setTownSlug(t.town_slug); setIntent(seatIntentForTown(t)); setResult(null); };
  const action = () => { if (selected) setIntent(seatIntentForTown(selected)); document.getElementById('seat-inquiry')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selected || !onSubmit || sending) return;
    const form = e.currentTarget; setSending(true); setResult(null);
    try { await onSubmit(form, selected, angle, selected.status === 'taken' ? 'waitlist' : intent); setResult('success'); form.reset(); } catch { setResult('error'); } finally { setSending(false); }
  }
  const video = safeSeatUrl(p.video_url);
  const embed = seatVideoEmbed(p.video_url);
  const mark = getStudioMedia('home-opening-mark');
  return <main className="seat-page" data-seat-slug={p.slug}>
    {p.faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(seatFaqSchema(p.faqs)).split('<').join('\\u003c')}} />}
    <section className="seat-opening"><div className="seat-inner">
      <p className="seat-kicker">{p.category}</p><h1>{p.headline}</h1>
      {video && (embed ? <iframe className="seat-video" title={label('video', 'Video')} src={embed} allow="fullscreen; picture-in-picture" allowFullScreen /> : <video className="seat-video" controls playsInline preload="metadata" src={video} />)}
      <div className="seat-answer">
        <div className="seat-answer-head">{mark?.src && <img src={mark.src} alt="" className="seat-mark" />}<span>{label('assistant')}</span></div>
        <div className="seat-town-chips" aria-label="Town">{towns.map(t => <Button key={t.id} variant="outline" asChild><a href={`/seat/${p.slug}/${t.town_slug}`} aria-current={selected?.town_slug === t.town_slug ? 'page' : undefined} onClick={e => {e.preventDefault();choose(t);}}>{t.town}</a></Button>)}</div>
        <p className="seat-question" aria-label={question}><span aria-hidden>{typed}</span><span className="sr-only">{question}</span></p>
        <div className="seat-answer-modes">{(['before','after'] as const).map(mode => <Button key={mode} variant="ghost" aria-pressed={after === (mode === 'after')} onClick={() => setAfter(mode === 'after')}>{label(mode)}</Button>)}</div>
        {after && <p className="seat-disclosure seat-goal">{label('goal')}</p>}
        <ol>{(after ? [{name: label('practice'), description: ''}, ...p.answer_listings.slice(0,2)] : p.answer_listings.slice(0,3)).map((listing, i) => <li key={`${i}-${listing.name}`}><span className="seat-number">0{i+1}</span><div><strong>{listing.name}</strong><p>{listing.description}</p></div></li>)}</ol>
        {!after && <p className="seat-missing">{label('missing')}</p>}
        <p className="seat-disclosure">{label('illustration')}</p>
      </div>
      <Button className="seat-cta" asChild><a href="#seat-inquiry" onClick={action}>{selected?.status === 'taken' ? label('waitlist') : label('cta')}<ArrowDown aria-hidden /></a></Button>
    </div></section>
    <Block title={p.meaning_title}><p>{p.meaning_body}</p>{p.market_facts.length > 0 && <div className="seat-facts">{p.market_facts.map((f,i) => <article key={i}><strong>{f.figure}</strong><p>{f.label}</p>{safeSeatUrl(f.source_url) && <a href={safeSeatUrl(f.source_url)} target="_blank" rel="noopener noreferrer">{f.source_name}<ArrowRight aria-hidden /></a>}</article>)}</div>}</Block>
    <Block title={p.why_title} dark><div className="seat-points">{p.why_points.map((point,i) => <article key={i}><span className="seat-number">0{i+1}</span><h3>{point.title}</h3><p>{point.body}</p></article>)}</div></Block>
    <Block title={p.ninety_days_title}><div className="seat-timeline">{p.ninety_days.map((point,i) => <article key={i}><span className="seat-number">0{i+1}</span><h3>{point.title}</h3><p>{point.body}</p></article>)}</div></Block>
    <Block title={p.seats_title} id="seat-availability"><p>{p.seats_body}</p><div className="seat-town-grid">{towns.map(t => <article className={selected?.town_slug === t.town_slug ? 'is-selected' : ''} key={t.id}><Button variant="ghost" className="seat-town-select" onClick={() => choose(t)} aria-pressed={selected?.town_slug === t.town_slug}><span>{t.town}</span><strong>{t.status === 'open' ? 'Open' : t.status === 'held' ? 'Held' : 'Taken'}</strong></Button>{t.procedures.length > 0 && <><p>{label('open_procedure')}</p><ul>{t.procedures.map(x => <li key={x}>{x}</li>)}</ul></>}{t.note && <p>{t.note}</p>}{t.status === 'taken' && <Button variant="outline" onClick={() => {choose(t); document.getElementById('seat-inquiry')?.scrollIntoView();}}>{label('waitlist')}</Button>}</article>)}</div></Block>
    <Block title={p.price_title} dark><div className="seat-price"><dl>{(['install','monthly','term'] as const).map(key => <div key={key}><dt>{label(key, key === 'install' ? 'Install' : key === 'monthly' ? 'Monthly' : 'Term')}</dt><dd>{p[key]}</dd></div>)}</dl><div className="seat-price-columns"><div><h3>{label('included')}</h3><ul>{p.included.map(x => <li key={x}><Check aria-hidden />{x}</li>)}</ul></div><div><h3>{label('requirements')}</h3><ul>{p.requirements.map(x => <li key={x}>{x}</li>)}</ul></div></div>{p.price_note && <p>{p.price_note}</p>}</div></Block>
    {p.angles.length > 0 && <Block title={label('angles')}><div className="seat-angles">{p.angles.map(a => <article key={a.key}><h3>{a.title}</h3><p>{a.body}</p><Button variant="outline" aria-pressed={angle === a.key} onClick={() => setAngle(a.key)}>{a.title}{angle === a.key && <Check aria-hidden />}</Button></article>)}</div></Block>}
    <Block title={p.faq_title}><div className="seat-faqs">{p.faqs.map((f,i) => <details key={i}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div></Block>
    <Block title={p.trust_title} dark><p>{p.trust_body}</p></Block>
    <Block title={p.form_title} id="seat-inquiry"><p>{p.form_body}</p>{selected?.status === 'taken' && <p>{label('waitlist')}</p>}<form onSubmit={submit} className="seat-form">
      <div className="seat-form-grid"><label>Name<Input name="name" required maxLength={200} autoComplete="name" /></label><label>Practice<Input name="business_name" required maxLength={200} autoComplete="organization" /></label><label>Email<Input name="email" type="email" required maxLength={255} autoComplete="email" /></label><label>Phone<Input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label></div>
      <label>Town<select required value={selected?.town_slug || ''} onChange={e => { const t = towns.find(t => t.town_slug === e.target.value); if (t) choose(t); }}>{towns.map(t => <option key={t.id} value={t.town_slug}>{t.town}</option>)}</select></label>
      {selected?.status !== 'taken' && <label>Intent<select value={intent} onChange={e => setIntent(e.target.value as SeatIntent)}><option value="claim">{label('claim')}</option><option value="answer_check">{label('answer_check')}</option></select></label>}
      {p.angles.length > 0 && <label>Angle<select value={angle} onChange={e => setAngle(e.target.value)}><option value="">—</option>{p.angles.map(a => <option key={a.key} value={a.key}>{a.title}</option>)}</select></label>}
      <label>Message<Textarea name="message" maxLength={3000} rows={4} /></label>
      {label('consent') && <label className="seat-consent"><input type="checkbox" required name="consent" />{label('consent')}</label>}
      <div className="seat-honeypot" aria-hidden><label>Website<Input name="website_confirm" tabIndex={-1} autoComplete="off" /></label></div>
      <Button type="submit" className="seat-cta" disabled={sending || !selected || result === 'success'}>{sending ? 'Sending…' : label('submit')}<ArrowRight aria-hidden /></Button>
      {result && <p role="status">{label(result)}</p>}
      <noscript><p>{p.labels.no_script || ''}</p></noscript>
    </form></Block>
    <div className="seat-sticky"><Button className="seat-cta" asChild><a href="#seat-inquiry" onClick={action}>{selected?.status === 'taken' ? label('waitlist') : label('cta')}<ArrowRight aria-hidden /></a></Button></div>
  </main>;
}