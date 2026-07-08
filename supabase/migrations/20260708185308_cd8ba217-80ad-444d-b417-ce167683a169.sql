
CREATE TABLE public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email','dm','vm_script')),
  subject text,
  body text NOT NULL,
  vertical text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_templates TO authenticated;
GRANT ALL ON public.outreach_templates TO service_role;

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "non_client_read" ON public.outreach_templates
  FOR SELECT TO authenticated
  USING (NOT public.has_role(auth.uid(), 'client'));

CREATE POLICY "admin_write" ON public.outreach_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER outreach_templates_updated_at
  BEFORE UPDATE ON public.outreach_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX outreach_templates_active_sort_idx
  ON public.outreach_templates (is_active, sort_order);

-- role_page_defaults seed for outreach_templates
INSERT INTO public.role_page_defaults (role, page_key, enabled) VALUES
  ('admin',      'outreach_templates', true),
  ('owner',      'outreach_templates', true),
  ('gm',         'outreach_templates', false),
  ('shift_lead', 'outreach_templates', false),
  ('staff',      'outreach_templates', false),
  ('client',     'outreach_templates', false)
ON CONFLICT DO NOTHING;

-- Seed 21 universal templates
INSERT INTO public.outreach_templates (category, name, channel, subject, body, vertical, sort_order, is_active) VALUES
('loom_system','Loom send','sms',NULL,'{{first}} — made you a quick video. My system read {{biz}}''s Google listing, website, and reviews and found three spots where {{vertical_noun}} are slipping out. The biggest one''s worth roughly ${{leak_$}}/mo. Four minutes: {{loom_link}}',NULL,1,true),
('loom_system','Loom send (email)','email','Found ~${{leak_$}}/mo leaking at {{biz}} (4-min video)','Not a template — my audit engine read {{biz}}''s actual online setup and I recorded what it found: three leaks, a dollar figure on each, and the one I''d plug first. {{loom_link}} — If the math is even half right, worth 15 minutes.',NULL,2,true),
('loom_system','Day-3 number-only bump','sms',NULL,'That ~${{leak_$}}/mo is still leaking. Video''s four minutes whenever you get a sec — {{loom_link}}',NULL,3,true),
('loom_system','Day-7 new-finding bump','sms',NULL,'One thing I left out of the video: {{one_new_finding}}. That one''s fixable inside a week. Offer stands — 15 minutes and I''ll walk you through all of it.',NULL,4,true),
('loom_system','Day-14 takeaway','sms',NULL,'{{first}} — going to close your file so I''m not that guy living in your texts. If the leak ever starts to sting, the video stays live: {{loom_link}}. And if you know another {{vertical}} owner drowning in missed calls, send them my way — I''ll owe you one.',NULL,5,true),
('loom_system','Watched but silent','sms',NULL,'Loom tells me the video got watched — which of the three hit closest to home? Genuinely calibrating, no pitch.',NULL,6,true),
('mystery_shopper','Missed-call receipt','sms',NULL,'{{first}} — called {{biz}} today at {{time}} as a customer. No answer, no callback yet. Not trying to embarrass you — making a point: whoever I would''ve called next just got that job. I catch those calls for a living. Every one, 24/7, answered in seconds. 15 minutes and I''ll show it working live.',NULL,7,true),
('mystery_shopper','Answered-call flip','sms',NULL,'Called {{biz}} today — you picked up fast, which puts you ahead of most {{vertical}} shops. The leak''s usually the second layer: after-hours, follow-up, the dead customer list. Ran a quick check and one number stood out: ~${{leak_$}}/mo. Want the 4-minute version?',NULL,8,true),
('mystery_shopper','Voicemail-as-demo','vm_script',NULL,'Hey — this voicemail is doing my pitch for me. I called as a customer and got the machine. If I had a flooded kitchen right now I''d already be on the phone with the next company on Google. I build the system that answers this line in two seconds, midnight included. Text me at {{number}} and I''ll show you it live — takes 15 minutes.',NULL,9,true),
('objection','Already have a guy','sms',NULL,'Keep him. I don''t replace your guy — I catch what slips past him: after-hours calls, internet leads, the hours the front desk is slammed. The free audit shows exactly how many. Fair?',NULL,10,true),
('objection','Too expensive','sms',NULL,'You''re leaking ~${{leak_$}}/mo and the system''s a fraction of that — the audit that proves the number costs nothing. One after-hours job you don''t miss pays for the year.',NULL,11,true),
('objection','Does it actually work','sms',NULL,'Same engine ran an 8-location operation at $10K/mo — in production, not a demo. Don''t take my word for it: talk to it yourself right now. {{qualify_link}}',NULL,12,true),
('objection','No time to set up','sms',NULL,'That''s the product. You set up nothing — I do all of it. Your total time cost is the 15-minute audit.',NULL,13,true),
('objection','Let me think about it','sms',NULL,'Think with real numbers instead of a maybe — the audit''s free. Money leaking → we talk. Nothing leaking → I tell you straight and you''ve lost nothing.',NULL,14,true),
('close','Universal close','sms',NULL,'Let me run the free audit. Real money leaking → we talk. Nothing → I tell you straight, and you''ve lost nothing. Fair?',NULL,15,true),
('referral','Go-live referral ask','sms',NULL,'Fastest favor you can do me: one owner you know who''s bleeding the same way you were. First intro who signs = $250 to you. And that''s standing — every one, forever.',NULL,16,true),
('referral','Day-7 report referral PS','sms',NULL,'PS — the referral offer is standing: $250 for every owner you send who signs. You''ve seen the report now. You know if it''s real.',NULL,17,true),
('logistics','Booking confirm','sms',NULL,'Locked: {{time}}. Takes 15 minutes — bring nothing, I bring your numbers.',NULL,18,true),
('logistics','No-show recovery','sms',NULL,'We missed each other — no stress. Your ~${{leak_$}}/mo doesn''t care about calendars though. Two slots left this week: {{a}} or {{b}}?',NULL,19,true),
('logistics','Pre-meeting warm','sms',NULL,'Before we talk — 90-second taste of what I''m going to show you: {{loom_link}}',NULL,20,true),
('post_audit','Post-audit follow-up','sms',NULL,'{{first}} — your number came out to ~${{leak_$}}/mo. That''s calculated off YOUR average ticket and close rate, not industry fluff. Two ways this goes: I walk you through exactly where it''s escaping (15 minutes, free), or the number just keeps running. {{book_link}}',NULL,21,true);
