import rawPlayers from '../players-database.json';
import { HISTORICAL_IPL_CAREER_BY_ID, HISTORICAL_IPL_2026_BY_ID } from '../src/shared/player-career-data';

const targetNames = [
  'Donovan Ferreira',
  'Virat Kohli',
  'Rohit Sharma',
  'MS Dhoni',
  'Mahendra Singh Dhoni',
  'Hardik Pandya',
  'Ayush Mhatre',
  'Vaibhav Sooryavanshi',
  'Cameron Green',
  'Aiden Markram',
  'KL Rahul',
  'Marcus Stoinis',
  'Mitchell Marsh',
  'Mitch Marsh',
  'Finn Allen'
];

for (const name of targetNames) {
  const p = (rawPlayers as any[]).find(x => x.player_name.toLowerCase().includes(name.toLowerCase()));
  if (!p) {
    console.log('NOT FOUND in DB:', name);
    continue;
  }
  const c = HISTORICAL_IPL_CAREER_BY_ID[p.id];
  const s = HISTORICAL_IPL_2026_BY_ID[p.id];
  console.log(`\n=== ${p.id} ${p.player_name} (${p.role}, ${p.nationality}) ===`);
  console.log('Career:', JSON.stringify(c));
  console.log('Season 2026:', JSON.stringify(s));
}

