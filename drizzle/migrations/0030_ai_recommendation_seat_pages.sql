CREATE TABLE public.ai_seat_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, category text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')), offer text NOT NULL DEFAULT 'ai_seat',
 meta_title text NOT NULL DEFAULT '', meta_description text NOT NULL DEFAULT '', share_image_url text, video_url text,
 headline text NOT NULL DEFAULT '', question text NOT NULL DEFAULT '', answer_listings jsonb NOT NULL DEFAULT '[]', labels jsonb NOT NULL DEFAULT '{}',
 meaning_title text NOT NULL DEFAULT '', meaning_body text NOT NULL DEFAULT '', market_facts jsonb NOT NULL DEFAULT '[]',
 why_title text NOT NULL DEFAULT '', why_points jsonb NOT NULL DEFAULT '[]', ninety_days_title text NOT NULL DEFAULT '', ninety_days jsonb NOT NULL DEFAULT '[]',
 seats_title text NOT NULL DEFAULT '', seats_body text NOT NULL DEFAULT '', price_title text NOT NULL DEFAULT '', install text NOT NULL DEFAULT '', monthly text NOT NULL DEFAULT '', term text NOT NULL DEFAULT '', included jsonb NOT NULL DEFAULT '[]', requirements jsonb NOT NULL DEFAULT '[]', price_note text,
 angles jsonb NOT NULL DEFAULT '[]', faq_title text NOT NULL DEFAULT '', faqs jsonb NOT NULL DEFAULT '[]', trust_title text NOT NULL DEFAULT '', trust_body text NOT NULL DEFAULT '', form_title text NOT NULL DEFAULT '', form_body text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_seat_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seat_pages TO authenticated;
GRANT ALL ON public.ai_seat_pages TO service_role;
ALTER TABLE public.ai_seat_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY seat_public_read ON public.ai_seat_pages FOR SELECT TO anon, authenticated USING (status='published');
CREATE POLICY seat_admin_write ON public.ai_seat_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.ai_seat_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid NOT NULL REFERENCES public.ai_seat_pages(id) ON DELETE CASCADE, town text NOT NULL, town_slug text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','held','taken')), procedures jsonb NOT NULL DEFAULT '[]', note text NOT NULL DEFAULT '', sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(page_id,town_slug)
);
GRANT SELECT ON public.ai_seat_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seat_availability TO authenticated;
GRANT ALL ON public.ai_seat_availability TO service_role;
ALTER TABLE public.ai_seat_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY seat_town_public_read ON public.ai_seat_availability FOR SELECT TO anon, authenticated USING (EXISTS(SELECT 1 FROM public.ai_seat_pages p WHERE p.id=page_id AND p.status='published'));
CREATE POLICY seat_town_admin_write ON public.ai_seat_availability FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.ai_seat_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER ai_seat_pages_touch BEFORE UPDATE ON public.ai_seat_pages FOR EACH ROW EXECUTE FUNCTION public.ai_seat_touch();
CREATE TRIGGER ai_seat_availability_touch BEFORE UPDATE ON public.ai_seat_availability FOR EACH ROW EXECUTE FUNCTION public.ai_seat_touch();
INSERT INTO public.ai_seat_pages (slug,category,meta_title,meta_description,headline,question,answer_listings,labels,meaning_title,meaning_body,why_title,why_points,ninety_days_title,ninety_days,seats_title,price_title,install,monthly,term,included,requirements,faq_title,faqs,trust_title,trust_body,form_title) VALUES ('family-law','Family law','Family law — unpublished layout sample','Unpublished layout sample. Replace this row with approved category copy.','Family law: unpublished layout sample','Which {category} practice should I hire in {town}?','[{"name":"Practice A","description":"Illustrative listing one"},{"name":"Practice B","description":"Illustrative listing two"},{"name":"Practice C","description":"Illustrative listing three"}]','{"assistant":"AI assistant’s answer","illustration":"Illustration only — not a real AI answer.","missing":"Your practice, not mentioned.","goal":"Goal — not a result.","practice":"Your practice","before":"Illustration","after":"Goal","cta":"Check availability","waitlist":"Join waitlist","open_procedure":"Open by procedure","install":"Install","monthly":"Monthly","term":"Term","included":"Included","requirements":"What we need","submit":"Send inquiry","success":"Inquiry received.","error":"Unable to send. Please try again.","consent":"You may contact me about this inquiry.","answer_check":"Answer check","claim":"Claim inquiry","angles":"Two angles"}','What it means','Sample section awaiting approved copy.','Why the AI picks who it picks','[{"title":"Sample why point","body":"Replace with the approved explanation."}]','The first 90 days','[{"title":"Sample stage","body":"Replace with the approved plan."}]','One seat per town','Price','Not set','Not set','Not set','["Sample included item"]','["Sample requirement"]','Questions owners ask','[{"question":"Is this a live offer?","answer":"No. This is an unpublished layout sample."}]','Our team','We will replace this sample with approved company copy.','Check availability');