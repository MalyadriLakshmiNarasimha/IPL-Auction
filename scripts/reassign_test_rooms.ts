import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING SAFE TEST ROOM REASSIGNMENT ---');

  // 1. Ensure system test host user exists
  let systemBot = await prisma.user.findUnique({
    where: { email: 'system-bot@auction.internal' },
  });

  if (!systemBot) {
    systemBot = await prisma.user.create({
      data: {
        id: 'system-bot-host-id',
        name: 'System Test Host',
        email: 'system-bot@auction.internal',
        password_hash: 'system-bot-hash-internal',
      },
    });
    console.log('[SystemBot] Created system bot user:', systemBot.id);
  } else {
    console.log('[SystemBot] Found existing system bot user:', systemBot.id);
  }

  // 2. Target rooms to reassign
  const targetCodes = [
    'TRADE9',
    'ECO8ST',
    'PDF8NW',
    'L8FMCB',
    'AEK87X',
    'D37RMM',
    '8JLZAE',
    'TEST99',
    'JQCKFM',
  ];

  console.log(`[Reassignment] Target rooms count: ${targetCodes.length}`);

  const updateLog: any[] = [];

  for (const code of targetCodes) {
    const existing = await prisma.room.findUnique({
      where: { room_code: code },
      include: { participants: true, snapshots: { take: 1, orderBy: { created_at: 'desc' } } },
    });

    if (!existing) {
      console.log(`[Reassignment] Room ${code} not found in DB, skipping.`);
      continue;
    }

    // Reassign room host
    await prisma.room.update({
      where: { room_code: code },
      data: {
        host_user_id: systemBot.id,
        status: 'archived',
      },
    });

    // Reassign participants
    const updatedParticipants = await prisma.roomParticipant.updateMany({
      where: {
        room_code: code,
        OR: [
          { user_id: 'cmw2wl0bn0000q7vcxb912mna' },
          { session_id: 'cmw2wl0bn0000q7vcxb912mna' },
        ],
      },
      data: {
        user_id: systemBot.id,
        session_id: systemBot.id,
        display_name: 'System Test Runner',
      },
    });

    updateLog.push({
      room_code: code,
      name: existing.name,
      previous_host_id: existing.host_user_id,
      new_host_id: systemBot.id,
      status: 'archived',
      participants_reassigned: updatedParticipants.count,
    });
  }

  console.log('[Reassignment Log]:', JSON.stringify(updateLog, null, 2));
  console.log('--- REASSIGNMENT COMPLETE ---');
}

main()
  .catch((e) => {
    console.error('[Reassignment Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
