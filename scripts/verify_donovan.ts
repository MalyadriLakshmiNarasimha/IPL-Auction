import { getPlayerById } from '../src/shared/player-data';
import { getIplCareerStats, getIplSeasonStats, resolvePlayerId } from '../src/shared/player-career-data';

console.log('Resolving Donovan Ferreira:');
const idByName = resolvePlayerId('Donovan Ferreira');
console.log('Resolved ID:', idByName);

const df = getPlayerById('p-194');
console.log('Player name:', df?.name);
console.log('Role:', df?.role);
console.log('Career Stats:', df?.ipl_career_stats);
console.log('2026 Season Stats:', df?.season_2026_stats);

console.log('\nLookup by Name:');
console.log('Career by name:', getIplCareerStats('Donovan Ferreira'));
console.log('2026 by name:', getIplSeasonStats('Donovan Ferreira'));

console.log('\nLookup by Alias "D. Ferreira":');
console.log('Career by alias:', getIplCareerStats('D. Ferreira'));
console.log('2026 by alias:', getIplSeasonStats('D. Ferreira'));

