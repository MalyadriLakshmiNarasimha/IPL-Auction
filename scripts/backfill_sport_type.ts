import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting backfill of sport_type on rooms table...');
  
  // 1. Fetch all rooms
  const rooms = await prisma.room.findMany({
    select: { room_code: true, name: true, sport_type: true },
  });
  console.log(`Found ${rooms.length} rooms to inspect.`);

  // 2. Fetch latest snapshot per room
  const snapshots = await prisma.roomSnapshot.findMany({
    select: { room_code: true, state_data: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });

  const snapshotSportMap = new Map<string, string>();
  for (const s of snapshots) {
    if (!snapshotSportMap.has(s.room_code)) {
      const data = s.state_data as any;
      const st = data?.settings?.sport_type;
      if (st) {
        snapshotSportMap.set(s.room_code, st);
      }
    }
  }

  let updatedCount = 0;
  for (const r of rooms) {
    let resolvedSport = snapshotSportMap.get(r.room_code);
    if (!resolvedSport) {
      // Heuristic fallback: check room name or code prefix
      if (
        r.name.toLowerCase().includes('pkl') ||
        r.name.toLowerCase().includes('kabaddi') ||
        r.room_code.startsWith('PK') ||
        r.room_code.startsWith('K')
      ) {
        resolvedSport = 'PKL';
      } else {
        resolvedSport = 'IPL';
      }
    }

    if (r.sport_type !== resolvedSport) {
      await prisma.room.update({
        where: { room_code: r.room_code },
        data: { sport_type: resolvedSport },
      });
      updatedCount++;
      console.log(`Updated room ${r.room_code} (${r.name}) -> ${resolvedSport}`);
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} rooms.`);
}

backfill()
  .catch(e => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
