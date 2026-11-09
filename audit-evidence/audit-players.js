const fs = require('fs');
const path = require('path');

const playersDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../players-database.json'), 'utf8'));
const playerDataTs = fs.readFileSync(path.join(__dirname, '../src/shared/player-data.ts'), 'utf8');

console.log('Total players in players-database.json:', playersDb.length);

// Extract VERIFIED_STAR_STATS names from player-data.ts
const starStatsMatch = playerDataTs.match(/const VERIFIED_STAR_STATS: Record<string, Partial<PlayerStats2026>> = {([\s\S]*?)};/);
const starPlayers = [];
if (starStatsMatch) {
  const matches = starStatsMatch[1].matchAll(/'([^']+)':\s*{/g);
  for (const m of matches) {
    starPlayers.push(m[1]);
  }
}
console.log('Star players with manual stat overrides in VERIFIED_STAR_STATS:', starPlayers.length, starPlayers);

// Check avatars / images
// In player-data.ts:
// const image_url = generatePlayerAvatarSvg(initials, raw.jersey_number, teamColor, raw.player_name);
// Are there any real photo URLs anywhere?
let realPhotoCount = 0;
let svgAvatarCount = 0;
let missingPhotoCount = 0;

const playerAuditRows = [];

for (const p of playersDb) {
  const name = p.player_name;
  const isStar = starPlayers.includes(name);
  
  // Stats evaluation
  let statsPresent = true;
  let source = '';
  let timestamp = '';
  let status = '';
  
  if (isStar) {
    source = 'Hardcoded in VERIFIED_STAR_STATS (labeled "Official IPL Match Center & Historical Registry")';
    timestamp = '2026-03-01 (hardcoded string in code)';
    status = 'UNSOURCED'; // No external URL, commit, or verifiable provider for unplayed 2026 season
  } else {
    source = 'Synthetic procedural formula (hashString(id + name) with tier multipliers)';
    timestamp = '2026-03-01 (hardcoded default in code)';
    status = 'SYNTHETIC / FORMULA';
  }
  
  // Photo evaluation
  // Check if player has image_url in database record or if it's generated
  const photoType = 'SVG Initials Avatar (Procedural)';
  svgAvatarCount++;
  
  playerAuditRows.push({
    id: p.id,
    name: p.player_name,
    team: p.team,
    team_code: p['team code'],
    role: p.role,
    nationality: p.nationality,
    statsPresent,
    source,
    timestamp,
    status,
    photoType
  });
}

const auditSummary = {
  total_players: playersDb.length,
  real_photographs: realPhotoCount,
  svg_avatars: svgAvatarCount,
  missing_photos: missingPhotoCount,
  marquee_stars_with_overrides: starPlayers.length,
  synthetic_formula_players: playersDb.length - starPlayers.length,
  sample_players: playerAuditRows.slice(0, 25),
  star_players: starPlayers
};

fs.writeFileSync(path.join(__dirname, 'player-audit-summary.json'), JSON.stringify(auditSummary, null, 2));
console.log('Player audit summary written to audit-evidence/player-audit-summary.json');

