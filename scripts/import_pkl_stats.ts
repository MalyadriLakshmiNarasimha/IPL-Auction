/**
 * Reproducible Ingestion & Pipeline Script for PKL Statistics Datasets
 *
 * Implements row-level validation, dataset segregation (Season vs Career),
 * and compiles authoritative registries:
 * - src/shared/pkl-player-stats-registry.json
 * - src/shared/pkl-team-stats.json
 */

import fs from 'fs';
import path from 'path';

interface PlayerStatsCsvRow {
  player_id: string;
  player_name: string;
  season: string;
  matches: number;
  total_points: number;
  raid_points: number;
  tackle_points: number;
  successful_raids: number;
  super_raids: number;
  super_10s: number;
  high_5s: number;
  super_tackles: number;
  do_or_die_points: number;
  tackle_success_rate: number;
  not_out_percentage: number;
}

interface TeamStatsCsvRow {
  team_id: string;
  team_name: string;
  season: string;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  points_table_position: number;
  total_raid_points: number;
  total_tackle_points: number;
}

export function parseCsv<T>(content: string): T[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, idx) => {
      const val = values[idx];
      const num = Number(val);
      row[header] = !isNaN(num) && val !== '' ? num : val;
    });
    rows.push(row as T);
  }

  return rows;
}

export function runPklImport(
  playerCsvPath?: string,
  teamCsvPath?: string
): { success: boolean; errors: string[]; playerCount: number; teamCount: number } {
  const errors: string[] = [];
  const projectRoot = path.resolve(__dirname, '..');

  const defaultPlayerCsv = path.join(projectRoot, 'templates', 'pkl_player_stats_template.csv');
  const defaultTeamCsv = path.join(projectRoot, 'templates', 'pkl_team_stats_template.csv');

  const pCsv = playerCsvPath || defaultPlayerCsv;
  const tCsv = teamCsvPath || defaultTeamCsv;

  const playerRegistry: Record<string, {
    canonical_name: string;
    season_12: Partial<PlayerStatsCsvRow>;
    career: Partial<PlayerStatsCsvRow>;
    seasons_available: string[];
  }> = {};

  if (fs.existsSync(pCsv)) {
    const rawContent = fs.readFileSync(pCsv, 'utf-8');
    const playerRows = parseCsv<PlayerStatsCsvRow>(rawContent);

    playerRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (!row.player_id || !row.player_id.startsWith('k-')) {
        errors.push(`Row ${lineNum}: Invalid or missing player_id '${row.player_id}'. Must start with 'k-'.`);
        return;
      }
      if (typeof row.matches !== 'number' || row.matches < 0) {
        errors.push(`Row ${lineNum}: Invalid matches value '${row.matches}' for player ${row.player_id}.`);
        return;
      }

      if (!playerRegistry[row.player_id]) {
        playerRegistry[row.player_id] = {
          canonical_name: row.player_name || row.player_id,
          season_12: {},
          career: {},
          seasons_available: [],
        };
      }

      const reg = playerRegistry[row.player_id];
      if (!reg.seasons_available.includes(row.season)) {
        reg.seasons_available.push(row.season);
      }

      if (row.season.toLowerCase().includes('12')) {
        reg.season_12 = { ...row };
      } else {
        reg.career = { ...row };
      }
    });
  } else {
    errors.push(`Player CSV file not found at: ${pCsv}`);
  }

  const teamRegistry: Record<string, TeamStatsCsvRow[]> = {};
  if (fs.existsSync(tCsv)) {
    const rawContent = fs.readFileSync(tCsv, 'utf-8');
    const teamRows = parseCsv<TeamStatsCsvRow>(rawContent);

    teamRows.forEach((row, idx) => {
      const lineNum = idx + 2;
      if (!row.team_id || !row.team_name) {
        errors.push(`Team Row ${lineNum}: Missing team_id or team_name.`);
        return;
      }
      if (!teamRegistry[row.team_id]) {
        teamRegistry[row.team_id] = [];
      }
      teamRegistry[row.team_id].push(row);
    });
  }

  // Save compiled registries
  const outPlayerRegistryPath = path.join(projectRoot, 'src', 'shared', 'pkl-player-stats-registry.json');
  fs.writeFileSync(outPlayerRegistryPath, JSON.stringify({
    metadata: {
      generated_at: new Date().toISOString(),
      source: 'PKL Validated Ingestion Pipeline',
      player_records: Object.keys(playerRegistry).length,
    },
    players: playerRegistry,
  }, null, 2), 'utf-8');

  const outTeamStatsPath = path.join(projectRoot, 'src', 'shared', 'pkl-team-stats.json');
  fs.writeFileSync(outTeamStatsPath, JSON.stringify({
    metadata: {
      generated_at: new Date().toISOString(),
      source: 'PKL Validated Team Stats Ingestion',
      teams_tracked: Object.keys(teamRegistry).length,
    },
    teams: teamRegistry,
  }, null, 2), 'utf-8');

  console.log(`[PKL-IMPORT] Ingested ${Object.keys(playerRegistry).length} players and ${Object.keys(teamRegistry).length} teams.`);
  if (errors.length > 0) {
    console.warn(`[PKL-IMPORT] Warnings/Errors encountered:\n  - ${errors.join('\n  - ')}`);
  }

  return {
    success: errors.length === 0,
    errors,
    playerCount: Object.keys(playerRegistry).length,
    teamCount: Object.keys(teamRegistry).length,
  };
}

if (require.main === module) {
  runPklImport();
}
