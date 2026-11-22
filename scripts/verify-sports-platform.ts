import { ALL_PLAYERS } from '../src/shared/player-data';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES } from '../src/shared/pkl-player-data';
import {
  OFFICIAL_IPL_FRANCHISES,
  DEFAULT_ROOM_SETTINGS,
  DEFAULT_PKL_ROOM_SETTINGS,
  getFranchisesForSport,
  getSettingsForSport,
  formatRoleName,
  formatCurrency,
} from '../src/shared/constants';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('================================================================');
  console.log('SPORTS AUCTION PLATFORM: COMPREHENSIVE INTEGRITY VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. IPL Dataset Verification
  console.log('1. IPL Cricket Dataset Verification:');
  assert(ALL_PLAYERS.length === 274, 'IPL Player Count', `Expected 274, got ${ALL_PLAYERS.length}`);
  assert(OFFICIAL_IPL_FRANCHISES.length === 10, 'IPL Franchise Count', `Expected 10, got ${OFFICIAL_IPL_FRANCHISES.length}`);
  const iplSample = ALL_PLAYERS.find(p => p.name.includes('Kohli') || p.name.includes('Bumrah'));
  assert(Boolean(iplSample), 'IPL Marquee Stars Found', iplSample?.name);

  // 2. PKL Dataset Verification
  console.log('\n2. PKL Kabaddi Dataset Verification:');
  assert(ALL_PKL_PLAYERS.length === 72, 'PKL Player Count', `Expected 72, got ${ALL_PKL_PLAYERS.length}`);
  assert(PKL_FRANCHISES.length === 12, 'PKL Franchise Count', `Expected 12, got ${PKL_FRANCHISES.length}`);
  const pawan = ALL_PKL_PLAYERS.find(p => p.name === 'Pawan Sehrawat');
  assert(Boolean(pawan && (pawan.role as string) === 'Raider'), 'Pawan Sehrawat Loaded as Raider');
  const fazel = ALL_PKL_PLAYERS.find(p => p.name === 'Fazel Atrachali');
  assert(Boolean(fazel && (fazel.role as string) === 'Defender'), 'Fazel Atrachali Loaded as Defender');
  const shadloui = ALL_PKL_PLAYERS.find(p => p.name.includes('Shadloui'));
  assert(Boolean(shadloui && (shadloui.role as string) === 'All-Rounder'), 'Mohammadreza Shadloui Loaded as All-Rounder');

  // 3. Sport Settings & Constraints
  console.log('\n3. Sport-Specific Settings & Constraints:');
  const iplSettings = getSettingsForSport('IPL');
  assert(iplSettings.sport_type === 'IPL' && iplSettings.purse === 100_00_00_000, 'IPL ₹100 Cr Purse & SportType');
  const pklSettings = getSettingsForSport('PKL');
  assert(pklSettings.sport_type === 'PKL' && pklSettings.purse === 5_00_00_000, 'PKL ₹5 Cr Purse & SportType');
  assert(pklSettings.squad_size === 14, 'PKL Squad Size (Starting 7 + Reserves)');

  // 4. Franchise Resolution
  console.log('\n4. Franchise Resolution & Independence:');
  const iplTeams = getFranchisesForSport('IPL');
  const pklTeams = getFranchisesForSport('PKL');
  assert(iplTeams.some(t => t.short_code === 'CSK') && !iplTeams.some(t => t.short_code === 'PAT'), 'IPL Teams isolated');
  assert(pklTeams.some(t => t.short_code === 'PAT') && !pklTeams.some(t => t.short_code === 'CSK'), 'PKL Teams isolated');

  // 5. Currency & Role Formatters
  console.log('\n5. Formatters Verification:');
  assert(formatCurrency(100_00_00_000) === '₹100 Cr', 'IPL Purse Format (₹100 Cr)');
  assert(formatCurrency(5_00_00_000) === '₹5 Cr', 'PKL Purse Format (₹5 Cr)');
  assert(formatCurrency(30_00_000) === '₹30 L', 'PKL Category A Base Price Format (₹30 L)');
  assert(formatRoleName('RAID') === 'Raider', 'Role RAID -> Raider');
  assert(formatRoleName('DEF') === 'Defender', 'Role DEF -> Defender');
  assert(formatRoleName('BAT') === 'Batter', 'Role BAT -> Batter');

  // 6. Homepage Build & Content Audit
  console.log('\n6. Homepage Content & Branding Audit in Build Artifacts:');
  const indexPath = path.join(process.cwd(), '.next', 'server', 'app', 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert(html.includes('SPORTS AUCTION'), 'Brand: SPORTS AUCTION present');
    assert(html.includes('THE BIDDING ARENA') || html.includes('The Bidding Arena'), 'Brand: The Bidding Arena present');
    assert(html.includes('THE ULTIMATE'), 'Hero main heading present');
    assert(html.includes('Build your team. Bid for legends.'), 'Hero supporting heading present');
    assert(html.includes('CHOOSE YOUR ARENA'), 'Sports selection heading present');
    assert(html.includes('IPL AUCTION') && html.includes('PKL AUCTION'), 'Both IPL & PKL Arena cards present');
    assert(html.includes('Build Your Dream XI') && html.includes('Build Your Dream Seven'), 'Dream XI & Dream Seven present');
    assert(html.includes('MORE THAN JUST BIDDING'), 'Features section present');
    assert(html.includes('Live Auction Room'), 'Feature 1: Live Auction Room present');
    assert(html.includes('Smart Purse Management'), 'Feature 2: Smart Purse Management present');
    assert(html.includes('Squad Composition Analyzer'), 'Feature 3: Squad Composition Analyzer present');
    assert(html.includes('Live Scorecards'), 'Feature 4: Live Scorecards present');
    assert(html.includes('Manager Leaderboard'), 'Feature 5: Manager Leaderboard present');
    assert(html.includes('READY FOR'), 'Final CTA heading present');
    assert(html.includes('Legal Disclaimer') || html.includes('BCCI'), 'Legal disclaimer present');
  } else {
    console.log('  [INFO] .next/server/app/index.html not generated as static HTML (rendered via dynamic chunks).');
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
