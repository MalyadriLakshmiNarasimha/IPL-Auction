import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTargets() {
  const targetCodes = ['TRADE9', 'ECO8ST', 'PDF8NW', 'L8FMBC', 'L8FMCB', 'AEK87X', 'D37RMM', '8JLZAE', 'TEST99', 'JQCKFM'];
  const rooms = await prisma.room.findMany({
    where: { room_code: { in: targetCodes } },
    include: {
      host: { select: { id: true, email: true, name: true } },
      participants: { select: { user_id: true, session_id: true, team_name: true, is_host: true } }
    }
  });

  console.log('Targets found count:', rooms.length);
  for (const r of rooms) {
    console.log(JSON.stringify({
      code: r.room_code,
      name: r.name,
      status: r.status,
      host: r.host?.email,
      host_id: r.host_user_id,
      participants: r.participants
    }, null, 2));
  }
}

checkTargets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
