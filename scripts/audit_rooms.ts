import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, created_at: true },
  });
  console.log('=== USERS IN DATABASE (' + users.length + ') ===');
  console.log(JSON.stringify(users, null, 2));

  const targetCodes = ['TRADE9', 'ECO8ST', 'PDF8NW', 'L8FMBC', 'AEK87X', 'D37RMM', '8JLZAE', 'TEST99', 'JQCKFM'];
  
  const rooms = await prisma.room.findMany({
    where: { room_code: { in: targetCodes } },
    include: {
      host: { select: { id: true, email: true, name: true } },
      participants: { select: { id: true, user_id: true, session_id: true, team_name: true, is_host: true } },
      snapshots: { take: 1, orderBy: { created_at: 'desc' }, select: { stage: true, phase: true, created_at: true } }
    }
  });

  console.log('=== TARGET ROOMS FOUND (' + rooms.length + ') ===');
  for (const r of rooms) {
    const res = await prisma.result.findUnique({ where: { room_code: r.room_code } });
    console.log(JSON.stringify({
      room_code: r.room_code,
      name: r.name,
      sport_type: r.sport_type,
      status: r.status,
      host_user_id: r.host_user_id,
      host_email: r.host?.email,
      created_at: r.created_at,
      participants_count: r.participants.length,
      participants: r.participants.map(p => ({ user_id: p.user_id, session_id: p.session_id, team: p.team_name, is_host: p.is_host })),
      has_result: !!res,
      latest_snapshot: r.snapshots[0]
    }, null, 2));
  }

  // Also let's inspect all non-cancelled rooms in the DB
  const allActiveRooms = await prisma.room.findMany({
    where: { status: { not: 'cancelled' } },
    select: { room_code: true, name: true, status: true, host_user_id: true, host: { select: { email: true } }, created_at: true }
  });
  console.log('=== ALL ACTIVE/NON-CANCELLED ROOMS (' + allActiveRooms.length + ') ===');
  console.log(JSON.stringify(allActiveRooms, null, 2));
}

audit()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
  });
