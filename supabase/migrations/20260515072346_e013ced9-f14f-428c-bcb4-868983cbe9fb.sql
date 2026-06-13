
-- ============================================================
-- Prompt 25 — Local Context Awareness schema
-- ============================================================

-- 1) context_calendar_entries
CREATE TABLE public.context_calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,  -- null = global
  name text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL CHECK (category IN ('holiday','cultural','bar_specific','sports','seasonal')),
  recurrence_rule text,            -- simple 'MM-DD' for fixed annual, or RRULE for complex
  fixed_date date,                  -- one-off entries
  relevance_categories text[] NOT NULL DEFAULT '{}',
  historical_relevance_score smallint NOT NULL DEFAULT 3 CHECK (historical_relevance_score BETWEEN 1 AND 5),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slug)
);
CREATE INDEX idx_context_calendar_active ON public.context_calendar_entries(is_active) WHERE is_active;
CREATE INDEX idx_context_calendar_venue ON public.context_calendar_entries(venue_id);

ALTER TABLE public.context_calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_global_readable_by_authed"
ON public.context_calendar_entries FOR SELECT TO authenticated
USING (venue_id IS NULL OR venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "calendar_admin_write"
ON public.context_calendar_entries FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_context_calendar_updated
BEFORE UPDATE ON public.context_calendar_entries
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2) venue_programming_context
CREATE TABLE public.venue_programming_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
  primary_category text CHECK (primary_category IN (
    'sports_bar','music_venue','cocktail_lounge','dive_bar','brunch_spot',
    'neighborhood_pub','family_friendly','late_night','other'
  )),
  audience_demographics text[] NOT NULL DEFAULT '{}',
  programming_features text[] NOT NULL DEFAULT '{}',
  themes text[] NOT NULL DEFAULT '{}',
  ai_suggested_at timestamptz,
  ai_suggestion jsonb,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_programming_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programming_context_read_venue"
ON public.venue_programming_context FOR SELECT TO authenticated
USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "programming_context_admin_write"
ON public.venue_programming_context FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_programming_context_updated
BEFORE UPDATE ON public.venue_programming_context
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) context_source_runs
CREATE TABLE public.context_source_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('weather','news','sports','events','calendar')),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  items_fetched integer NOT NULL DEFAULT 0,
  error_text text
);
CREATE INDEX idx_context_runs_recent ON public.context_source_runs(started_at DESC);
CREATE INDEX idx_context_runs_venue ON public.context_source_runs(venue_id, source_type, started_at DESC);

ALTER TABLE public.context_source_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "context_runs_read"
ON public.context_source_runs FOR SELECT TO authenticated
USING (venue_id IS NULL OR venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

-- 4) context_items
CREATE TABLE public.context_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('weather','news','sports','events','calendar')),
  source_ref text NOT NULL,
  event_date date NOT NULL,
  valid_until date,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  relevance_score smallint,
  relevance_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, source_type, source_ref)
);
CREATE INDEX idx_context_items_venue_date ON public.context_items(venue_id, event_date);
CREATE INDEX idx_context_items_source ON public.context_items(source_type);

ALTER TABLE public.context_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "context_items_read_venue"
ON public.context_items FOR SELECT TO authenticated
USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_context_items_updated
BEFORE UPDATE ON public.context_items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) venue_weather_grid_cache
CREATE TABLE public.venue_weather_grid_cache (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  lat numeric(9,6) NOT NULL,
  lng numeric(9,6) NOT NULL,
  office text NOT NULL,
  grid_x integer NOT NULL,
  grid_y integer NOT NULL,
  forecast_url text NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_weather_grid_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_grid_read_venue"
ON public.venue_weather_grid_cache FOR SELECT TO authenticated
USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Seed: global calendar entries
-- ============================================================
INSERT INTO public.context_calendar_entries (slug, name, category, recurrence_rule, relevance_categories, historical_relevance_score, notes) VALUES
  -- US federal holidays
  ('new_years_eve','New Year''s Eve','cultural','12-31','{cocktail_lounge,sports_bar,music_venue,neighborhood_pub,late_night}',5,'Highest revenue night of the year for many bars'),
  ('new_years_day','New Year''s Day','holiday','01-01','{brunch_spot,sports_bar}',3,'Brunch + college bowl games'),
  ('mlk_day','Martin Luther King Jr. Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=1;BYDAY=3MO','{neighborhood_pub}',2,NULL),
  ('presidents_day','Presidents'' Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=2;BYDAY=3MO','{sports_bar,brunch_spot}',2,NULL),
  ('memorial_day','Memorial Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=-1MO','{sports_bar,neighborhood_pub,brunch_spot}',5,'Patio season kickoff'),
  ('juneteenth','Juneteenth','holiday','06-19','{neighborhood_pub,music_venue}',3,NULL),
  ('independence_day','Independence Day','holiday','07-04','{sports_bar,neighborhood_pub,music_venue}',5,'Outdoor + late hours'),
  ('labor_day','Labor Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=1MO','{sports_bar,neighborhood_pub,brunch_spot}',5,'End of summer, NFL kickoff weekend'),
  ('columbus_day','Columbus / Indigenous Peoples'' Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=2MO','{neighborhood_pub}',2,NULL),
  ('veterans_day','Veterans Day','holiday','11-11','{neighborhood_pub,sports_bar}',3,'Strong with military-friendly venues'),
  ('thanksgiving','Thanksgiving Day','holiday','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=4TH','{sports_bar}',3,'NFL all-day; many closed'),
  ('thanksgiving_eve','Thanksgiving Eve (Blackout Wednesday)','cultural','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=4WE','{neighborhood_pub,cocktail_lounge,sports_bar,late_night}',5,'Often the biggest bar night of the year'),
  ('black_friday','Black Friday','cultural','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=4FR','{brunch_spot,neighborhood_pub}',3,NULL),
  ('christmas_eve','Christmas Eve','cultural','12-24','{cocktail_lounge,neighborhood_pub}',3,NULL),
  ('christmas_day','Christmas Day','holiday','12-25','{}',1,'Most venues closed'),

  -- Cultural moments
  ('valentines_day','Valentine''s Day','cultural','02-14','{cocktail_lounge,brunch_spot,music_venue}',4,'Couples + pre-dinner / post-dinner cocktail lift'),
  ('mardi_gras','Mardi Gras','cultural','RRULE:FREQ=YEARLY;BYMONTH=2;BYDAY=2TU','{neighborhood_pub,cocktail_lounge,music_venue,late_night}',4,NULL),
  ('st_patricks_day','St. Patrick''s Day','cultural','03-17','{neighborhood_pub,sports_bar,late_night}',5,'Top-5 bar night nationwide'),
  ('cinco_de_mayo','Cinco de Mayo','cultural','05-05','{neighborhood_pub,sports_bar}',5,'Margaritas + tequila programming'),
  ('mothers_day','Mother''s Day','cultural','RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU','{brunch_spot,family_friendly}',4,'Brunch'),
  ('fathers_day','Father''s Day','cultural','RRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=3SU','{brunch_spot,sports_bar,family_friendly}',4,NULL),
  ('halloween','Halloween','cultural','10-31','{neighborhood_pub,cocktail_lounge,music_venue,late_night}',5,'Costume parties — highest weekend if Sat'),
  ('cinco_eve','Cinco de Mayo Eve','cultural','05-04','{neighborhood_pub,sports_bar}',2,NULL),
  ('galentines_day','Galentine''s Day','cultural','02-13','{cocktail_lounge,brunch_spot}',3,'Brunch programming'),

  -- Bar-specific dates
  ('national_margarita_day','National Margarita Day','bar_specific','02-22','{cocktail_lounge,neighborhood_pub}',3,NULL),
  ('national_beer_day','National Beer Day','bar_specific','04-07','{neighborhood_pub,sports_bar}',2,NULL),
  ('national_wine_day','National Wine Day','bar_specific','05-25','{cocktail_lounge,brunch_spot}',2,NULL),
  ('national_tequila_day','National Tequila Day','bar_specific','07-24','{cocktail_lounge,neighborhood_pub}',3,NULL),
  ('national_bourbon_day','National Bourbon Day','bar_specific','06-14','{cocktail_lounge,neighborhood_pub}',3,NULL),
  ('bourbon_heritage_month','Bourbon Heritage Month','bar_specific','RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=1','{cocktail_lounge,neighborhood_pub}',3,'Sept; promote whiskey programming all month'),
  ('national_rum_day','National Rum Day','bar_specific','08-16','{cocktail_lounge}',2,NULL),
  ('national_vodka_day','National Vodka Day','bar_specific','10-04','{cocktail_lounge,neighborhood_pub}',2,NULL),
  ('national_gin_day','International Gin & Tonic Day','bar_specific','10-19','{cocktail_lounge}',2,NULL),
  ('oktoberfest_start','Oktoberfest','bar_specific','RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=20','{neighborhood_pub,music_venue}',4,'Run through early Oct'),
  ('national_drink_wine_day','National Drink Wine Day','bar_specific','02-18','{cocktail_lounge,brunch_spot}',2,NULL),
  ('international_whiskey_day','International Whiskey Day','bar_specific','03-27','{cocktail_lounge,neighborhood_pub}',2,NULL),
  ('national_irish_coffee_day','National Irish Coffee Day','bar_specific','01-25','{cocktail_lounge,brunch_spot}',2,NULL),
  ('national_pina_colada_day','National Piña Colada Day','bar_specific','07-10','{cocktail_lounge}',2,NULL),
  ('national_negroni_week','Negroni Week','bar_specific','RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=10','{cocktail_lounge}',3,'Mid-June, charity-tied'),
  ('national_dive_bar_day','National Dive Bar Day','bar_specific','07-07','{dive_bar,neighborhood_pub}',2,NULL),
  ('national_martini_day','National Martini Day','bar_specific','06-19','{cocktail_lounge}',2,NULL),

  -- Major sports recurring dates
  ('super_bowl_sunday','Super Bowl Sunday','sports','RRULE:FREQ=YEARLY;BYMONTH=2;BYDAY=2SU','{sports_bar,neighborhood_pub}',5,'Single biggest sports day of the year'),
  ('nba_finals_window','NBA Finals Window','sports','RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=1','{sports_bar,neighborhood_pub}',4,'Early-mid June'),
  ('world_series_window','World Series Window','sports','RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=22','{sports_bar,neighborhood_pub}',4,NULL),
  ('march_madness_selection','March Madness Selection Sunday','sports','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','{sports_bar}',4,NULL),
  ('march_madness_first_weekend','March Madness First Weekend','sports','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=3TH','{sports_bar,neighborhood_pub}',5,'Thurs–Sun massive lift'),
  ('march_madness_final_four','March Madness Final Four','sports','RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SA','{sports_bar}',4,NULL),
  ('nfl_kickoff_weekend','NFL Kickoff Weekend','sports','RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=1SU','{sports_bar,neighborhood_pub}',5,'Sep first full Sun + MNF'),
  ('nfl_thanksgiving','NFL Thanksgiving Day Games','sports','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=4TH','{sports_bar}',4,NULL),
  ('nfl_wildcard_weekend','NFL Wild Card Weekend','sports','RRULE:FREQ=YEARLY;BYMONTH=1;BYDAY=2SA','{sports_bar,neighborhood_pub}',4,NULL),
  ('nfl_conference_championships','NFL Conference Championships','sports','RRULE:FREQ=YEARLY;BYMONTH=1;BYDAY=-1SU','{sports_bar,neighborhood_pub}',5,NULL),
  ('mlb_opening_day','MLB Opening Day','sports','RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=27','{sports_bar,neighborhood_pub}',4,NULL),
  ('nhl_stanley_cup_window','Stanley Cup Final Window','sports','RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=5','{sports_bar}',3,NULL),
  ('kentucky_derby','Kentucky Derby','sports','RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=1SA','{cocktail_lounge,brunch_spot,sports_bar}',3,'Mint juleps + day drinking'),
  ('masters_sunday','The Masters — Final Round','sports','RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=2SU','{sports_bar,cocktail_lounge}',2,NULL),
  ('us_open_tennis_finals','US Open Tennis Finals','sports','RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=2SU','{sports_bar}',2,NULL),
  ('world_cup_final','FIFA World Cup Final','sports','RRULE:FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=15','{sports_bar,neighborhood_pub}',5,'Quadrennial — only relevant in WC years'),
  ('uefa_champions_league_final','UEFA Champions League Final','sports','RRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=1SA','{sports_bar,neighborhood_pub}',3,'Day drinking start'),

  -- Seasonal anchors
  ('summer_solstice','Summer Solstice / Patio Season','seasonal','06-20','{neighborhood_pub,brunch_spot}',3,'Trigger for outdoor programming'),
  ('winter_solstice','Winter Solstice','seasonal','12-21','{cocktail_lounge,neighborhood_pub}',2,'Comfort cocktail / mulled drink push'),
  ('dst_spring_forward','Daylight Saving — Spring Forward','seasonal','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','{brunch_spot}',2,'Brunch + later sunset = patio prep'),
  ('dst_fall_back','Daylight Saving — Fall Back','seasonal','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','{neighborhood_pub,cocktail_lounge}',2,'Earlier sunsets = happy hour push'),
  ('back_to_school','Back to School Weekend','seasonal','RRULE:FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=20','{neighborhood_pub}',3,'College town foot traffic spike'),
  ('graduation_season_start','Graduation Season Start','seasonal','RRULE:FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=10','{brunch_spot,cocktail_lounge,family_friendly}',3,'May–early June; family + private events'),
  ('summer_vacation_start','Summer Vacation Start','seasonal','RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15','{neighborhood_pub,brunch_spot,family_friendly}',2,NULL),
  ('back_from_college','Back from College Weekend','seasonal','RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=18','{neighborhood_pub,sports_bar,late_night}',4,'Holiday-break college kid lift'),
  ('spring_break_window','Spring Break Window','seasonal','RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=10','{neighborhood_pub,sports_bar,music_venue,late_night}',3,'Mid-March, varies by region'),
  ('end_of_summer','End of Summer / Last Patio Push','seasonal','RRULE:FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=25','{neighborhood_pub,brunch_spot}',3,NULL),
  ('peak_holiday_party_season','Peak Holiday Party Season','seasonal','RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=8','{cocktail_lounge,neighborhood_pub,music_venue}',5,'Mid-Dec corporate parties peak');
