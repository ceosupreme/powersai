// Sports adapter — multi-source.
//   - MLB Stats API for baseball (no key)
//   - TheSportsDB for NFL/NBA/NHL/NCAA (free tier key)
// Selects city-relevant teams via a small static map. League anchors come from
// the calendar source, not here.

// deno-lint-ignore-file no-explicit-any
import type { ContextSourceAdapter, AdapterPullResult, VenueRow, NormalizedContextItem } from './types.ts';
import { isoToday, addDaysISO } from './types.ts';

// city → list of (sport, team_name, mlb_team_id?)
const CITY_TEAMS: Record<string, Array<{ sport: 'mlb'|'nfl'|'nba'|'nhl'; team: string; mlbId?: number }>> = {
  'San Diego': [
    { sport: 'mlb', team: 'San Diego Padres', mlbId: 135 },
    { sport: 'nfl', team: 'San Diego (no NFL)' },
  ],
  'Los Angeles': [
    { sport: 'mlb', team: 'Los Angeles Dodgers', mlbId: 119 },
    { sport: 'mlb', team: 'Los Angeles Angels', mlbId: 108 },
    { sport: 'nfl', team: 'Los Angeles Rams' },
    { sport: 'nfl', team: 'Los Angeles Chargers' },
    { sport: 'nba', team: 'Los Angeles Lakers' },
    { sport: 'nba', team: 'Los Angeles Clippers' },
  ],
  'New York': [
    { sport: 'mlb', team: 'New York Yankees', mlbId: 147 },
    { sport: 'mlb', team: 'New York Mets', mlbId: 121 },
    { sport: 'nfl', team: 'New York Giants' },
    { sport: 'nfl', team: 'New York Jets' },
  ],
  'Boston': [
    { sport: 'mlb', team: 'Boston Red Sox', mlbId: 111 },
    { sport: 'nfl', team: 'New England Patriots' },
    { sport: 'nba', team: 'Boston Celtics' },
  ],
};

const LOOKAHEAD_DAYS = 14;

async function pullMLB(venueId: string, teamId: number, teamName: string): Promise<NormalizedContextItem[]> {
  const start = isoToday();
  const end = addDaysISO(start, LOOKAHEAD_DAYS);
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${start}&endDate=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB ${res.status}`);
  const json = await res.json();
  const games: any[] = (json?.dates ?? []).flatMap((d: any) => d.games ?? []);
  return games.map((g: any): NormalizedContextItem => {
    const date = (g.gameDate as string).slice(0, 10);
    const home = g.teams?.home?.team?.name ?? '';
    const away = g.teams?.away?.team?.name ?? '';
    const isHome = g.teams?.home?.team?.id === teamId;
    return {
      source_type: 'sports',
      source_ref: `mlb:${g.gamePk}`,
      event_date: date,
      valid_until: date,
      payload: {
        title: `${away} @ ${home}`,
        summary: `${teamName} ${isHome ? 'home' : 'away'} game vs ${isHome ? away : home}`,
        league: 'MLB',
        team: teamName,
        venue: g.venue?.name ?? null,
        home_away: isHome ? 'home' : 'away',
        game_time: g.gameDate ?? null,
        status: g.status?.detailedState ?? null,
        tags: ['sports', 'mlb', isHome ? 'home_game' : 'away_game'],
      },
    };
  });
}

async function pullSportsDB(_venueId: string, teamName: string, league: string, apiKey: string): Promise<NormalizedContextItem[]> {
  // TheSportsDB v1: /searchteams.php?t=Name → idTeam → /eventsnext.php?id=TEAM
  const search = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(teamName)}`);
  if (!search.ok) throw new Error(`TheSportsDB search ${search.status}`);
  const sj = await search.json();
  const team = (sj?.teams ?? [])[0];
  if (!team?.idTeam) return [];
  const next = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnext.php?id=${team.idTeam}`);
  if (!next.ok) throw new Error(`TheSportsDB events ${next.status}`);
  const nj = await next.json();
  const events: any[] = nj?.events ?? [];
  const horizon = addDaysISO(isoToday(), LOOKAHEAD_DAYS);
  return events
    .filter((e) => e.dateEvent && e.dateEvent <= horizon)
    .map((e: any): NormalizedContextItem => ({
      source_type: 'sports',
      source_ref: `tsdb:${e.idEvent}`,
      event_date: e.dateEvent,
      valid_until: e.dateEvent,
      payload: {
        title: e.strEvent ?? `${e.strHomeTeam} vs ${e.strAwayTeam}`,
        summary: `${league} — ${e.strHomeTeam} vs ${e.strAwayTeam}`,
        league,
        team: teamName,
        venue: e.strVenue ?? null,
        home_away: e.strHomeTeam === team.strTeam ? 'home' : 'away',
        game_time: e.strTimestamp ?? null,
        tags: ['sports', league.toLowerCase(), e.strHomeTeam === team.strTeam ? 'home_game' : 'away_game'],
      },
    }));
}

export const sportsAdapter: ContextSourceAdapter = {
  id: 'sports',
  async pull(_supabase, venue): Promise<AdapterPullResult> {
    const errors: string[] = [];
    const items: NormalizedContextItem[] = [];
    const teams = (venue.city && CITY_TEAMS[venue.city]) || [];
    if (teams.length === 0) {
      return { items: [], errors: [`sports: no team mapping for city ${venue.city ?? '(none)'}`] };
    }
    const tsdbKey = Deno.env.get('THESPORTSDB_API_KEY') || '3'; // '3' = public test key fallback

    for (const t of teams) {
      try {
        if (t.sport === 'mlb' && t.mlbId) {
          items.push(...await pullMLB(venue.id, t.mlbId, t.team));
        } else if (t.sport === 'nfl' || t.sport === 'nba' || t.sport === 'nhl') {
          const leagueName = t.sport.toUpperCase();
          items.push(...await pullSportsDB(venue.id, t.team, leagueName, tsdbKey));
        }
      } catch (e) {
        errors.push(`sports[${t.team}]: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { items, errors };
  },
};
