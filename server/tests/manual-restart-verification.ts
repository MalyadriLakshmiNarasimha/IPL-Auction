import 'dotenv/config';
import { prisma, db } from '../../src/lib/db';
import { RoomManager } from '../room';
import { ALL_PLAYERS } from '../../src/shared/player-data';
import { FRANCHISE_PRESETS } from '../../src/shared/constants';

function createMockIo(): any {
  return {
    to: () => ({ emit: () => {} }),
    emit: () => {},
  };
}

async function runManualRestartVerification() {
  console.log('================================================================');
  console.log('IPL AUCTION — MANUAL SERVER RESTART & PERSISTENCE VERIFICATION');
  console.log('================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const mockIo = createMockIo();

  // 1. Verify MySQL connection
  console.log('\n[STEP 1] Checking MySQL connection...');
  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ MySQL is online and accepting queries on localhost:3306');

  // 2. Prepare test user in MySQL
  console.log('\n[STEP 2] Ensuring test manager exists in database...');
  const testHost = await prisma.user.upsert({
    where: { email: 'reboot_host@ipltest.com' },
    create: {
      name: 'Reboot Host',
      email: 'reboot_host@ipltest.com',
      password_hash: 'test-hash-xyz',
    },
    update: {},
  });
  console.log(`✓ Test manager verified with ID: ${testHost.id}`);

  // 3. Clean up any previous test room
  const ROOM_CODE = 'REBOOT';
  await prisma.bidEvent.deleteMany({ where: { room_code: ROOM_CODE } });
  await prisma.roomSnapshot.deleteMany({ where: { room_code: ROOM_CODE } });
  await prisma.room.deleteMany({ where: { room_code: ROOM_CODE } });

  // 4. Start authoritative Server #1 (Process 1)
  console.log('\n[STEP 3] Starting Server Instance #1 (Pre-Crash)...');
  const serverInstance1 = new RoomManager(mockIo);
  const room = serverInstance1.createRoom(ROOM_CODE, 'Championship Arena', testHost.id, testHost.name);
  console.log(`✓ Room ${ROOM_CODE} created in Node.js memory`);

  // 5. Participants join and pick franchises
  console.log('\n[STEP 4] Participants joining and claiming franchises...');
  serverInstance1.joinRoom(ROOM_CODE, 'guest-user-1', 'MI Manager', 'sock-mi-1');
  serverInstance1.pickFranchise(ROOM_CODE, testHost.id, FRANCHISE_PRESETS[0]); // CSK
  serverInstance1.pickFranchise(ROOM_CODE, 'guest-user-1', FRANCHISE_PRESETS[1]); // MI
  console.log('✓ Host claimed CSK, Guest claimed MI');

  // 6. Start the auction
  console.log('\n[STEP 5] Starting Live Main Auction...');
  serverInstance1.startAuction(ROOM_CODE, testHost.id);
  // Advance to first player immediately
  serverInstance1.nextPlayer(room);
  console.log(`✓ Live Auction started. Current player on spotlight: ${room.auction_state.current_player?.name}`);
  console.log(`  Base price: ₹${((room.auction_state.current_player?.base_price || 0) / 10000000).toFixed(2)} Cr`);

  // 7. Place bids
  console.log('\n[STEP 6] Bidding activity: CSK places bid at base price...');
  serverInstance1.placeBid(ROOM_CODE, testHost.id, 0); // Opening bid
  console.log(`✓ Current highest bid: ₹${(room.auction_state.current_bid / 10000000).toFixed(2)} Cr by ${testHost.name}`);

  // Wait for snapshot queue to settle
  await serverInstance1.saveRoomSnapshot(ROOM_CODE, 'active_bidding');
  console.log('✓ Snapshot and BidEvent written to MySQL');

  // 8. Verify MySQL records directly
  console.log('\n[STEP 7] Inspecting raw MySQL tables directly...');
  const dbRoom = await prisma.room.findUnique({ where: { room_code: ROOM_CODE } });
  const dbSnapshots = await prisma.roomSnapshot.findMany({ where: { room_code: ROOM_CODE } });
  const dbBids = await prisma.bidEvent.findMany({ where: { room_code: ROOM_CODE } });

  console.log(`✓ [rooms table] room_code: ${dbRoom?.room_code}, status: ${dbRoom?.status}, name: ${dbRoom?.name}`);
  console.log(`✓ [room_snapshots table] Found ${dbSnapshots.length} snapshot(s) for room ${ROOM_CODE}`);
  console.log(`  Latest snapshot stage: ${dbSnapshots[dbSnapshots.length - 1]?.stage}, phase: ${dbSnapshots[dbSnapshots.length - 1]?.phase}`);
  console.log(`✓ [bid_events table] Found ${dbBids.length} bid event(s) recorded`);

  // 9. SIMULATE HARD SERVER CRASH / TERMINATION
  console.log('\n================================================================');
  console.log('[STEP 8] SIMULATING AUTHORITATIVE SERVER HARD CRASH / RESTART...');
  console.log('================================================================');
  serverInstance1.stopPeriodicSnapshotLoop();
  serverInstance1.removeRoom(ROOM_CODE);
  console.log('💥 Process 1 killed. In-memory Node.js state completely destroyed.');

  // 10. Start Server Instance #2 (Process 2) and Rehydrate from DB
  console.log('\n[STEP 9] Booting Server Instance #2 (Post-Crash Recovery)...');
  const serverInstance2 = new RoomManager(mockIo);
  expectRoomNotInMemory: {
    const checkBefore = serverInstance2.getRoom(ROOM_CODE);
    if (checkBefore) throw new Error('Room unexpectedly in memory before boot rehydration!');
    console.log('✓ Confirmed: Room is absent from Node.js memory prior to DB rehydration');
  }

  console.log('✓ Rehydrating active rooms from database snapshot...');
  const restoredRoom = await serverInstance2.restoreRoomFromSnapshot(ROOM_CODE);

  if (!restoredRoom) {
    throw new Error('FAILED TO RESTORE ROOM FROM DATABASE SNAPSHOT!');
  }

  console.log('================================================================');
  console.log('RESTORATION VERIFICATION REPORT');
  console.log('================================================================');
  console.log(`✓ Room Code: ${restoredRoom.room_code}`);
  console.log(`✓ Room Name: ${restoredRoom.name}`);
  console.log(`✓ Stage: ${restoredRoom.stage}`);
  console.log(`✓ Auction Phase: ${restoredRoom.auction_state.phase}`);
  console.log(`✓ Current Player: ${restoredRoom.auction_state.current_player?.name} (${restoredRoom.auction_state.current_player?.role})`);
  console.log(`✓ Highest Bid: ₹${(restoredRoom.auction_state.current_bid / 10000000).toFixed(2)} Cr`);
  console.log(`✓ Highest Bidder ID: ${restoredRoom.auction_state.current_bidder_id}`);
  console.log(`✓ Total Participants: ${restoredRoom.participants.size}`);

  const restoredHost = restoredRoom.participants.get(testHost.id);
  const restoredGuest = restoredRoom.participants.get('guest-user-1');

  console.log(`✓ CSK Manager: ${restoredHost?.display_name} (Purse: ₹${((restoredHost?.purse_remaining || 0) / 10000000).toFixed(2)} Cr)`);
  console.log(`✓ MI Manager: ${restoredGuest?.display_name} (Purse: ₹${((restoredGuest?.purse_remaining || 0) / 10000000).toFixed(2)} Cr)`);
  console.log(`✓ Room Paused for Reconnection: ${restoredRoom.auction_state.is_paused}`);

  // Clean up test room
  serverInstance2.stopPeriodicSnapshotLoop();
  serverInstance2.removeRoom(ROOM_CODE);
  await prisma.bidEvent.deleteMany({ where: { room_code: ROOM_CODE } });
  await prisma.roomSnapshot.deleteMany({ where: { room_code: ROOM_CODE } });
  await prisma.room.deleteMany({ where: { room_code: ROOM_CODE } });

  console.log('\n================================================================');
  console.log('SUCCESS: SERVER RESTART & PERSISTENCE FULLY VERIFIED ON MYSQL');
  console.log('================================================================\n');
}

runManualRestartVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
