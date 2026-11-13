import fs from 'fs';
import path from 'path';
import rawPlayers from '../players-database.json';
import {
  HISTORICAL_IPL_CAREER_BY_ID,
  HISTORICAL_IPL_2026_BY_ID,
  HISTORICAL_IPL_CAREER_BY_NAME,
  HISTORICAL_IPL_2026_BY_NAME,
} from '../src/shared/player-career-data';

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

const players = rawPlayers as PlayerDbRecord[];

console.log(`=== PHASE 1 AUDIT: ALL ${players.length} PLAYERS ===`);

let verifiedCareerCount = 0;
let zeroCareerCount = 0;
let verifiedSeasonCount = 0;
let zeroSeasonCount = 0;
let genuineDebutantsCount = 0;
let no2026AppearanceCount = 0;
let dataDiscrepancies = 0;

const missingCareer: { id: string; name: string; role: string; nationality: string }[] = [];
const missing2026: { id: string; name: string; role: string; nationality: string }[] = [];
const anomalies: string[] = [];

// Check duplicates in players-database.json
const seenIds = new Set<string>();
const duplicateIds: string[] = [];
const seenNames = new Set<string>();
const duplicateNames: string[] = [];

for (const p of players) {
  if (seenIds.has(p.id)) {
    duplicateIds.push(p.id);
  }
  seenIds.add(p.id);

  if (seenNames.has(p.player_name)) {
    duplicateNames.push(p.player_name);
  }
  seenNames.add(p.player_name);

  const career = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  const season = HISTORICAL_IPL_2026_BY_ID[p.id];

  if (!career) {
    anomalies.push(`Player ${p.id} (${p.player_name}): No entry in HISTORICAL_IPL_CAREER_BY_ID`);
    continue;
  }
  if (!season) {
    anomalies.push(`Player ${p.id} (${p.player_name}): No entry in HISTORICAL_IPL_2026_BY_ID`);
    continue;
  }

  const hasCareer = career.has_stats && career.has_ipl_career && (career.matches ?? 0) > 0;
  const hasSeason = season.has_stats && season.has_season_stats && (season.matches ?? 0) > 0;

  if (hasCareer) {
    verifiedCareerCount++;
  } else {
    zeroCareerCount++;
    missingCareer.push({ id: p.id, name: p.player_name, role: p.role, nationality: p.nationality });
  }

  if (hasSeason) {
    verifiedSeasonCount++;
  } else {
    zeroSeasonCount++;
    missing2026.push({ id: p.id, name: p.player_name, role: p.role, nationality: p.nationality });
  }

  // If player has no career stats, are they a genuine debutant?
  if (!hasCareer) {
    genuineDebutantsCount++;
  } else if (hasCareer && !hasSeason) {
    no2026AppearanceCount++;
  }

  // Consistency checks
  if (hasCareer && hasSeason) {
    if ((career.matches ?? 0) < (season.matches ?? 0)) {
      anomalies.push(`Player ${p.id} (${p.player_name}): Career matches (${career.matches}) < Season matches (${season.matches})`);
      dataDiscrepancies++;
    }
    if ((career.runs ?? 0) < (season.runs ?? 0)) {
      anomalies.push(`Player ${p.id} (${p.player_name}): Career runs (${career.runs}) < Season runs (${season.runs})`);
      dataDiscrepancies++;
    }
    if ((career.wickets ?? 0) < (season.wickets ?? 0)) {
      anomalies.push(`Player ${p.id} (${p.player_name}): Career wickets (${career.wickets}) < Season wickets (${season.wickets})`);
      dataDiscrepancies++;
    }
  }

  // Check name lookup consistency
  const careerByName = HISTORICAL_IPL_CAREER_BY_NAME[p.player_name];
  const seasonByName = HISTORICAL_IPL_2026_BY_NAME[p.player_name];
  if (!careerByName) {
    anomalies.push(`Player ${p.id} (${p.player_name}): Missing from HISTORICAL_IPL_CAREER_BY_NAME by name`);
  }
  if (!seasonByName) {
    anomalies.push(`Player ${p.id} (${p.player_name}): Missing from HISTORICAL_IPL_2026_BY_NAME by name`);
  }
}

console.log(`Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(', ') : 'None'}`);
console.log(`Duplicate Names: ${duplicateNames.length ? duplicateNames.join(', ') : 'None'}`);
console.log(`Total Auction Players: ${players.length}`);
console.log(`Players with Verified Career Stats (> 0 matches): ${verifiedCareerCount}`);
console.log(`Players with Zero/Missing Career Stats: ${zeroCareerCount}`);
console.log(`Players with Verified 2026 Stats (> 0 matches): ${verifiedSeasonCount}`);
console.log(`Players with Zero/Missing 2026 Stats: ${zeroSeasonCount}`);
console.log(`Genuine IPL Debutants (No career stats): ${genuineDebutantsCount}`);
console.log(`Established IPL Players with No 2026 Appearances: ${no2026AppearanceCount}`);
console.log(`Data Inconsistencies / Anomalies: ${anomalies.length}`);

if (anomalies.length > 0) {
  console.log('\nTop 15 anomalies:');
  console.log(anomalies.slice(0, 15).join('\n'));
}

console.log('\nSample Established Players marked with 0 in 2026 (first 20):');
const establishedNo2026 = missing2026.filter(m => {
  const c = HISTORICAL_IPL_CAREER_BY_ID[m.id];
  return c && c.has_ipl_career && (c.matches ?? 0) > 0;
});
console.log(`Count: ${establishedNo2026.length}`);
for (const p of establishedNo2026.slice(0, 20)) {
  const c = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  console.log(`- ${p.id} ${p.name} (${p.role}, ${p.nationality}) -> Career Matches: ${c?.matches}, Runs: ${c?.runs}, Wkts: ${c?.wickets}`);
}

console.log('\nAll 93 Players Currently Marked as IPL Debutants (No Career Stats):');
for (const p of missingCareer) {
  console.log(`- ${p.id}: ${p.name} (${p.nationality}, ${p.role})`);
}
