import db from '../players-database.json';
import { HISTORICAL_IPL_CAREER_BY_ID, HISTORICAL_IPL_2026_BY_ID } from '../src/shared/player-career-data';

const ars = (db as any[]).filter(p => p.role.toUpperCase().includes('ALL') || p.role === 'AR');
console.log('Total All-Rounders:', ars.length);
for (const p of ars) {
  const c = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  const s = HISTORICAL_IPL_2026_BY_ID[p.id];
  console.log(`${p.id} ${p.player_name}: Career [M=${c?.matches}, R=${c?.runs}, W=${c?.wickets}, Best=${c?.best_bowling}] | 2026 [M=${s?.matches}, R=${s?.runs}, W=${s?.wickets}, Best=${s?.best_bowling}]`);
}

