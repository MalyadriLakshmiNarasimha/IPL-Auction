import db from '../players-database.json';
import { HISTORICAL_IPL_CAREER_BY_ID } from '../src/shared/player-career-data';

const wks = (db as any[]).filter(p => p.role.toUpperCase().includes('WICKET') || p.role === 'WK');
console.log('Total Wicketkeepers:', wks.length);
for (const p of wks) {
  const c = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  console.log(`${p.id} ${p.player_name}: matches=${c?.matches}, catches=${c?.catches}, stumpings=${c?.stumpings}, dismissals=${c?.dismissals}`);
}

