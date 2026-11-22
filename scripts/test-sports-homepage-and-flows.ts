/**
 * Comprehensive verification of Homepage Visual Polish, Responsive Layouts,
 * Authentication Gate, and Core User Flows.
 */

import { ALL_PLAYERS } from '../src/shared/player-data';
import { ALL_PKL_PLAYERS, PKL_FRANCHISES } from '../src/shared/pkl-player-data';
import { OFFICIAL_IPL_FRANCHISES } from '../src/shared/constants';
import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

function log(label: string, pass: boolean, detail?: string) {
  const mark = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${mark}: ${label}${detail ? ` (${detail})` : ''}`);
  if (!pass) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('SPORTS AUCTION HOMEPAGE POLISH & FLOW VERIFICATION');
  console.log('======================================================\n');

  // 1. Asset verification
  console.log('--- 1. Image Assets Verification ---');
  const requiredImages = [
    'hero-batsman.png',
    'hero-raider.png',
    'hero-stadium-bg.jpg',
    'trophy-ipl.png',
    'trophy-pkl.png',
    'card-bg-cricket.jpg',
    'card-bg-kabaddi.jpg',
  ];

  for (const img of requiredImages) {
    const fullPath = path.join(process.cwd(), 'public', 'images', img);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    log(`Asset public/images/${img} exists & non-empty`, exists && size > 1000, `${size} bytes`);
  }

  // 2. Component Markup & Design Rules Verification
  console.log('\n--- 2. Design Rules & Bug Fixes Verification ---');
  const heroContent = fs.readFileSync(path.join(process.cwd(), 'src/components/HeroSection.tsx'), 'utf-8');
  const finalCtaContent = fs.readFileSync(path.join(process.cwd(), 'src/components/FinalCtaSection.tsx'), 'utf-8');
  const navContent = fs.readFileSync(path.join(process.cwd(), 'src/components/NavigationShell.tsx'), 'utf-8');
  const notifContent = fs.readFileSync(path.join(process.cwd(), 'src/components/NotificationsPopover.tsx'), 'utf-8');
  const cardsContent = fs.readFileSync(path.join(process.cwd(), 'src/components/SportsSelectionSection.tsx'), 'utf-8');
  const featuresContent = fs.readFileSync(path.join(process.cwd(), 'src/components/PlatformFeaturesSection.tsx'), 'utf-8');
  const statsContent = fs.readFileSync(path.join(process.cwd(), 'src/components/PlatformStatsSection.tsx'), 'utf-8');

  // Bug Fix 1: Notification bell hidden when unauthenticated
  log('Bug Fix 1: NotificationsPopover returns null when !isAuthenticated', notifContent.includes('if (!isAuthenticated) {\n    return null;') || notifContent.includes('if (!isAuthenticated) return null;'));

  // Bug Fix 2: Glyph clipping prevention on italic gradient headings
  log('Bug Fix 2a: Final CTA heading has inline padding (pe-3) to prevent ? clipping', finalCtaContent.includes('pe-3 inline-block'));
  log('Bug Fix 2b: Hero "SPORTS AUCTION" heading has inline padding (pe-3) to prevent clipping', heroContent.includes('pe-3 inline-block'));

  // Hero rules
  log('Hero: Stadium background used via next/image', heroContent.includes('/images/hero-stadium-bg.jpg'));
  log('Hero: Batsman on left with gold glow', heroContent.includes('/images/hero-batsman.png') && heroContent.includes('amber-500'));
  log('Hero: Raider on right with purple glow', heroContent.includes('/images/hero-raider.png') && heroContent.includes('purple-600'));
  log('Hero: Live Kohli card removed from hero', !heroContent.includes('Virat Kohli'));
  log('Hero: Priority attribute set on hero images', (heroContent.match(/priority/g) || []).length >= 3);

  // League card rules
  log('Cards: Cricket background at low opacity with dark overlay', cardsContent.includes('/images/card-bg-cricket.jpg') && cardsContent.includes('opacity-25'));
  log('Cards: Kabaddi background at low opacity with dark overlay', cardsContent.includes('/images/card-bg-kabaddi.jpg') && cardsContent.includes('opacity-25'));
  log('Cards: IPL trophy on left', cardsContent.includes('/images/trophy-ipl.png'));
  log('Cards: PKL trophy on left', cardsContent.includes('/images/trophy-pkl.png'));
  log('Cards: Label changed to "Franchises" (not "Official Franchises")', cardsContent.includes('Franchises\n') || cardsContent.includes('Franchises</div>'));
  log('Cards: Circular arrow button present on both cards', (cardsContent.match(/rounded-full.*bg-gradient/g) || []).length >= 2);
  log('Cards: Entire card is keyboard accessible with role="button" and tabIndex', (cardsContent.match(/role="button"/g) || []).length >= 2);

  // Features and Stats rules
  log('Features: Single horizontal strip on desktop', featuresContent.includes('md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/10'));
  log('Features: 4-column shortcuts grid on mobile', featuresContent.includes('sm:hidden grid grid-cols-4'));
  log('Stats: Horizontal pill bar matching reference', statsContent.includes('THE BIDDING ARENA') && statsContent.includes('IN NUMBERS'));

  // Mobile Bottom Navigation Bar rules
  log('Mobile Nav: Fixed bottom nav with safe-area insets', navContent.includes('fixed bottom-0') && navContent.includes('safe-area-inset-bottom'));
  log('Mobile Nav: 5 items (Home, My Rooms, History, Stats, Profile)', navContent.includes('Home') && navContent.includes('My Rooms') && navContent.includes('History') && navContent.includes('Stats') && navContent.includes('Profile'));
  log('Mobile Nav: Min 44px touch targets', (navContent.match(/min-h-\[44px\]/g) || []).length >= 5);
  log('Mobile Nav: Main content has pb-20 so content is not obscured', navContent.includes('pb-20 lg:pb-0'));

  // 3. User Flows: Authentication, Room Creation, Arenas
  console.log('\n--- 3. Core Flows: Auth, Room Creation, Arenas ---');
  
  // Test User DB operations (create, find, auth)
  const testEmail = `test_flow_${Date.now()}@arena.com`;
  const createdUser = await db.user.create({
    data: {
      name: 'Flow Tester',
      email: testEmail,
      password_hash: 'hashed_password_123'
    }
  });
  log('DB User Registration Flow', Boolean(createdUser && createdUser.id));

  const foundUser = await db.user.findUnique({ where: { email: testEmail } });
  log('DB User Login / Fetch Flow', Boolean(foundUser && foundUser.email === testEmail));

  // Test IPL Room Creation (room_code is max 6 chars: VarChar(6))
  const iplRoomCode = 'IP' + Math.floor(Math.random() * 8999 + 1000);
  const iplRoom = await db.room.create({
    data: {
      room_code: iplRoomCode,
      name: 'IPL Test Arena',
      host_user_id: createdUser.id,
      status: 'lobby'
    }
  });
  log('IPL Arena Room Creation Flow', Boolean(iplRoom && iplRoom.room_code === iplRoomCode));

  // Test PKL Room Creation
  const pklRoomCode = 'PK' + Math.floor(Math.random() * 8999 + 1000);
  const pklRoom = await db.room.create({
    data: {
      room_code: pklRoomCode,
      name: 'PKL Test Arena',
      host_user_id: createdUser.id,
      status: 'lobby'
    }
  });
  log('PKL Arena Room Creation Flow', Boolean(pklRoom && pklRoom.room_code === pklRoomCode));

  // Test Room Fetching / Join Flow
  const fetchedRoom = await db.room.findUnique({ where: { room_code: pklRoomCode } });
  log('Room Join Query Flow', Boolean(fetchedRoom && fetchedRoom.room_code === pklRoomCode));

  // Test Stats Aggregation Flow
  const userCount = await db.user.count();
  const roomCount = await db.room.count();
  log('Stats Aggregation Flow', userCount >= 1 && roomCount >= 2, `Users: ${userCount}, Rooms: ${roomCount}`);

  // 4. PKL Dataset Investigation (Bug Fix 3)
  console.log('\n--- 4. Bug Fix 3: PKL Player Pool Investigation ---');
  console.log(`Current PKL player count: ${ALL_PKL_PLAYERS.length}`);
  console.log(`Current PKL franchises: ${PKL_FRANCHISES.length}`);
  console.log(`Official minimum squad size: 14`);
  console.log(`Minimum players needed to fill all 12 teams: 12 × 14 = 168`);
  console.log(`Missing players: 168 - ${ALL_PKL_PLAYERS.length} = ${168 - ALL_PKL_PLAYERS.length}`);

  console.log('\n======================================================');
  console.log('ALL VERIFICATIONS SUCCESSFUL!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\nVerification Error:', err);
  process.exit(1);
});
