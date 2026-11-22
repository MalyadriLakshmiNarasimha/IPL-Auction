import fs from 'fs';
import path from 'path';
import rawPlayers from '../players-database.json';
import {
  HISTORICAL_IPL_CAREER_BY_ID,
  HISTORICAL_IPL_2026_BY_ID,
  HISTORICAL_IPL_CAREER_BY_NAME,
  HISTORICAL_IPL_2026_BY_NAME,
  PLAYER_ALIASES,
} from '../src/shared/player-career-data';
import { ALL_PLAYERS } from '../src/shared/player-data';

interface PlayerDbRecord {
  id: string;
  card_text: string | null;
  player_name_from_card: string | null;
  jersey_number: number | null;
  team: string;
  'team code': string;
  player_name: string;
  nationality: string;
  role: string;
  batting_style: string | null;
  bowling_style: string | null;
}

const db = rawPlayers as PlayerDbRecord[];

console.log('================================================================');
console.log('           IPL AUCTION COMPREHENSIVE DATASET AUDIT              ');
console.log('================================================================');
console.log(`Total Players in Database: ${db.length}`);
console.log(`Total Players loaded in ALL_PLAYERS: ${ALL_PLAYERS.length}`);

// 1. Role distribution
const roleCounts: Record<string, number> = {};
for (const p of db) {
  roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
}
console.log('\n--- 1. Role Distribution in Database ---');
console.table(roleCounts);

// 2. Nationality distribution
const natCounts: Record<string, number> = {};
for (const p of db) {
  natCounts[p.nationality] = (natCounts[p.nationality] || 0) + 1;
}
console.log('\n--- 2. Nationality Breakdown ---');
console.log(`Indian Players: ${natCounts['India'] || 0}`);
console.log(`Overseas Players: ${db.length - (natCounts['India'] || 0)}`);

// 3. Stats Availability & Debutants
const statsAudit = {
  verifiedCareer: [] as PlayerDbRecord[],
  debutants: [] as PlayerDbRecord[],
  verified2026: [] as PlayerDbRecord[],
  no2026Appearances: [] as PlayerDbRecord[],
  inconsistencies: [] as { id: string; name: string; issue: string }[],
  allRoundersMissingBowling: [] as { id: string; name: string; role: string }[],
  bowlersMissingBestBowling: [] as { id: string; name: string }[],
  wkMissingDismissals: [] as { id: string; name: string }[],
};

for (const p of db) {
  const career = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  const season = HISTORICAL_IPL_2026_BY_ID[p.id];

  if (!career || !career.has_stats || !career.has_ipl_career || (career.matches ?? 0) === 0) {
    statsAudit.debutants.push(p);
  } else {
    statsAudit.verifiedCareer.push(p);
  }

  if (!season || !season.has_stats || !season.has_season_stats || (season.matches ?? 0) === 0) {
    if (career && career.has_ipl_career && (career.matches ?? 0) > 0) {
      statsAudit.no2026Appearances.push(p);
    }
  } else {
    statsAudit.verified2026.push(p);
  }

  // Cross checks
  if (career && season && career.has_stats && season.has_stats) {
    if ((career.matches ?? 0) < (season.matches ?? 0)) {
      statsAudit.inconsistencies.push({
        id: p.id,
        name: p.player_name,
        issue: `Career matches (${career.matches}) < Season matches (${season.matches})`,
      });
    }
    if ((career.runs ?? 0) < (season.runs ?? 0)) {
      statsAudit.inconsistencies.push({
        id: p.id,
        name: p.player_name,
        issue: `Career runs (${career.runs}) < Season runs (${season.runs})`,
      });
    }
    if ((career.wickets ?? 0) < (season.wickets ?? 0)) {
      statsAudit.inconsistencies.push({
        id: p.id,
        name: p.player_name,
        issue: `Career wickets (${career.wickets}) < Season wickets (${season.wickets})`,
      });
    }
  }

  // Role checks
  const isAR = p.role.toUpperCase().includes('ALL') || p.role === 'AR';
  const isBowl = p.role.toUpperCase().includes('BOWL');
  const isWK = p.role.toUpperCase().includes('WICKET') || p.role === 'WK';

  if (isAR && career && career.has_stats) {
    if (career.wickets === undefined && (career.runs ?? 0) > 0) {
      statsAudit.allRoundersMissingBowling.push({ id: p.id, name: p.player_name, role: p.role });
    }
  }

  if (isBowl && career && career.has_stats && (career.wickets ?? 0) > 0) {
    if (!career.best_bowling) {
      statsAudit.bowlersMissingBestBowling.push({ id: p.id, name: p.player_name });
    }
  }

  if (isWK && career && career.has_stats) {
    if (career.dismissals === undefined && career.catches === undefined) {
      statsAudit.wkMissingDismissals.push({ id: p.id, name: p.player_name });
    }
  }
}

console.log('\n--- 3. Career & Season Statistics Summary ---');
console.log(`Players with Career Stats: ${statsAudit.verifiedCareer.length}`);
console.log(`Genuine IPL Debutants (No Career): ${statsAudit.debutants.length}`);
console.log(`Players with 2026 Season Stats: ${statsAudit.verified2026.length}`);
console.log(`Established Players with No 2026 Appearances: ${statsAudit.no2026Appearances.length}`);
console.log(`Mathematical Inconsistencies (Career < Season): ${statsAudit.inconsistencies.length}`);

console.log('\n--- 4. Role Data Gaps in Career Stats ---');
console.log(`All-Rounders missing bowling data: ${statsAudit.allRoundersMissingBowling.length}`);
if (statsAudit.allRoundersMissingBowling.length > 0) {
  console.log(statsAudit.allRoundersMissingBowling.map(x => `${x.id} ${x.name}`).join(', '));
}
console.log(`Bowlers missing BEST bowling: ${statsAudit.bowlersMissingBestBowling.length}`);
console.log(`Wicketkeepers missing dismissals: ${statsAudit.wkMissingDismissals.length}`);

// 5. Check Donovan Ferreira specifically
console.log('\n--- 5. Donovan Ferreira Deep Dive ---');
const dfRecord = db.find(p => p.player_name === 'Donovan Ferreira');
if (dfRecord) {
  const dfCareer = HISTORICAL_IPL_CAREER_BY_ID[dfRecord.id];
  const df2026 = HISTORICAL_IPL_2026_BY_ID[dfRecord.id];
  const dfAllPlayer = ALL_PLAYERS.find(p => p.id === dfRecord.id);
  console.log(`DB Record: ID=${dfRecord.id}, Role=${dfRecord.role}, Team=${dfRecord.team}`);
  console.log('Career in Registry:', JSON.stringify(dfCareer));
  console.log('2026 Season in Registry:', JSON.stringify(df2026));
  console.log('ALL_PLAYERS Career stats attached:', JSON.stringify(dfAllPlayer?.ipl_career_stats));
  console.log('ALL_PLAYERS 2026 stats attached:', JSON.stringify(dfAllPlayer?.season_2026_stats));
}

// 6. Check All Key Target Players from Phase 6
console.log('\n--- 6. Phase 6 Real Players Audit ---');
const keyPlayers = [
  'Donovan Ferreira',
  'Virat Kohli',
  'Rohit Sharma',
  'Mahendra Singh Dhoni',
  'Hardik Pandya',
  'Ayush Mhatre',
  'Vaibhav Sooryavanshi',
  'Cameron Green',
  'Aiden Markram',
  'KL Rahul',
  'Marcus Stoinis',
  'Mitch Marsh',
  'Finn Allen'
];

for (const name of keyPlayers) {
  const p = db.find(x => x.player_name === name);
  if (!p) {
    console.log(`[ALERT] Not found in DB: ${name}`);
    continue;
  }
  const c = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  const s = HISTORICAL_IPL_2026_BY_ID[p.id];
  console.log(`${p.id.padEnd(6)} ${p.player_name.padEnd(22)} | Role: ${p.role.padEnd(12)} | Career: M=${c?.matches ?? 0}, R=${c?.runs ?? 0}, W=${c?.wickets ?? 0} | 2026: M=${s?.matches ?? 0}, R=${s?.runs ?? 0}, W=${s?.wickets ?? 0}`);
}

