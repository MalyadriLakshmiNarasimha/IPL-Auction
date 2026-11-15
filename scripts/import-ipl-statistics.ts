/**
 * Build deterministic, ID-keyed IPL career and 2026 statistics from source CSVs.
 * Expected: data/ipl-statistics/{batting_overall,bowling_overall,batting_2026,bowling_2026}.csv
 * Run: npm run stats:import
 */
import fs from 'node:fs';
import path from 'node:path';
type Row = Record<string, string>;
type PlayerRecord = { id: string; player_name: string };
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data/ipl-statistics');
const PLAYER_DB = path.join(ROOT, 'players-database.json');
const OUTPUT = path.join(ROOT, 'src/shared/generated/ipl-statistics.json');

function parseCsv(input: string): Row[] {
  const records: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); records.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); records.push(row); }
  const headers = (records.shift() || []).map(h => h.trim());
  return records.filter(r => r.some(v => v.trim())).map(r =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()]))
  );
}
const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const read = (name: string) => {
  const file = path.join(DATA, name);
  if (!fs.existsSync(file)) throw new Error('Missing ' + file + '. Add all four source CSV files before importing.');
  return parseCsv(fs.readFileSync(file, 'utf8'));
};
const players = JSON.parse(fs.readFileSync(PLAYER_DB, 'utf8')) as PlayerRecord[];
const nameIndex = new Map<string, PlayerRecord>();
for (const p of players) {
  const key = norm(p.player_name);
  if (nameIndex.has(key)) throw new Error('Ambiguous auction player name: ' + p.player_name);
  nameIndex.set(key, p);
}
// Explicit aliases only; never use fuzzy matching for player identity.
const aliases: Record<string, string> = {
  'vsuryavanshi': 'vaibhavsooryavanshi',
  'mitchmarsh': 'mitchellmarsh',
  'mitchsantner': 'mitchellsantner',
  'msdhoni': 'msdhoni',
  'mahendrasinghdhoni': 'msdhoni',
};
const resolve = (r: Row): PlayerRecord | undefined => {
  const candidates = [r.Full_Name, r.player_name, r.Player, r.Player_Name].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const key = norm(candidate);
    const found = nameIndex.get(key) || nameIndex.get(aliases[key] || '');
    if (found) return found;
  }
  return undefined;
};
const readNum = (r: Row, ...keys: string[]) => {
  for (const k of keys) { const n = num(r[k]); if (n !== undefined) return n; }
  return undefined;
};
const battingOverall = read('batting_overall.csv');
const bowlingOverall = read('bowling_overall.csv');
const batting2026 = read('batting_2026.csv');
const bowling2026 = read('bowling_2026.csv');
const career: Record<string, Record<string, unknown>> = {};
const season2026: Record<string, Record<string, unknown>> = {};
const unmatched: { dataset: string; player: string }[] = [];
const mappedCareer = new Set<string>(), mappedSeason = new Set<string>();

function attachBatting(rows: Row[], target: Record<string, Record<string, unknown>>, label: string, isSeason: boolean) {
  for (const r of rows) {
    const p = resolve(r);
    if (!p) { unmatched.push({ dataset: label, player: r.Full_Name || r.player_name || r.Player || 'unknown' }); continue; }
    const matches = readNum(r, 'Matches', 'M', 'matches');
    const innings = readNum(r, 'Inns', 'innings');
    const runs = readNum(r, 'Runs', 'runs');
    const balls = readNum(r, 'Balls', 'balls');
    const fours = readNum(r, '4s', 'fours');
    const sixes = readNum(r, '6s', 'sixes');
    const average = readNum(r, 'Avg', 'average', 'batting_average');
    const strikeRate = readNum(r, 'Sr', 'SR', 'strike_rate') ?? (balls && runs !== undefined ? runs * 100 / balls : undefined);
    const highScore = readNum(r, 'HS', 'high_score', 'highest_score');
    const stats = target[p.id] || {};
    Object.assign(stats, {
      ...(matches !== undefined ? { matches: Math.max(Number(stats.matches || 0), matches) } : {}),
      ...(innings !== undefined ? { innings } : {}),
      ...(runs !== undefined ? { runs } : {}),
      ...(average !== undefined ? { batting_average: average } : {}),
      ...(strikeRate !== undefined ? { strike_rate: Number(strikeRate.toFixed(2)) } : {}),
      ...(fours !== undefined ? { fours } : {}),
      ...(sixes !== undefined ? { sixes } : {}),
      ...(balls !== undefined ? { balls_faced: balls } : {}),
      ...(highScore !== undefined ? { highest_score: String(highScore) } : {}),
      ...(isSeason ? { season: '2026', has_season_stats: true } : { has_ipl_career: true }),
      has_stats: true,
    });
    target[p.id] = stats;
    (isSeason ? mappedSeason : mappedCareer).add(p.id);
  }
}
function attachBowling(rows: Row[], target: Record<string, Record<string, unknown>>, label: string, isSeason: boolean) {
  for (const r of rows) {
    const p = resolve(r);
    if (!p) { unmatched.push({ dataset: label, player: r.Full_Name || r.player_name || r.Player || 'unknown' }); continue; }
    const matches = readNum(r, 'Matches', 'M', 'matches');
    const innings = readNum(r, 'Inns', 'innings');
    const wickets = readNum(r, 'Wkts', 'wickets');
    const balls = readNum(r, 'Balls delivered', 'balls');
    const conceded = readNum(r, 'Runs given', 'runs_conceded');
    const overs = r.Overs || undefined;
    const stats = target[p.id] || {};
    Object.assign(stats, {
      ...(matches !== undefined ? { matches: Math.max(Number(stats.matches || 0), matches) } : {}),
      ...(innings !== undefined ? { bowling_innings: innings } : {}),
      ...(wickets !== undefined ? { wickets } : {}),
      ...(balls !== undefined ? { balls_bowled: balls, bowling_strike_rate: wickets ? Number((balls / wickets).toFixed(2)) : undefined } : {}),
      ...(conceded !== undefined ? { runs_conceded: conceded, economy_rate: balls ? Number((conceded * 6 / balls).toFixed(2)) : undefined } : {}),
      ...(overs ? { overs } : {}),
      ...(wickets !== undefined && conceded !== undefined && wickets ? { bowling_average: Number((conceded / wickets).toFixed(2)) } : {}),
      ...(isSeason ? { season: '2026', has_season_stats: true } : { has_ipl_career: true }),
      has_stats: true,
    });
    target[p.id] = stats;
    (isSeason ? mappedSeason : mappedCareer).add(p.id);
  }
}
attachBatting(battingOverall, career, 'batting_overall', false);
attachBowling(bowlingOverall, career, 'bowling_overall', false);
attachBatting(batting2026, season2026, 'batting_2026', true);
attachBowling(bowling2026, season2026, 'bowling_2026', true);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify({
  schema_version: 1, generated_at: new Date().toISOString(), season: 2026,
  career, season2026,
  audit: { auction_players: players.length, career_players_mapped: mappedCareer.size,
    season2026_players_mapped: mappedSeason.size, unmatched_rows: unmatched },
}, null, 2) + '\n');
console.log('IPL stats import complete: ' + mappedCareer.size + ' career IDs, ' + mappedSeason.size +
  ' season IDs, ' + unmatched.length + ' unmatched source rows.');
