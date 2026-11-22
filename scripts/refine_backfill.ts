import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refine() {
  const rooms = await prisma.room.findMany();
  for (const r of rooms) {
    let sport = r.sport_type;
    const nameLower = r.name.toLowerCase();
    if (/\bipl\b/.test(nameLower) || nameLower.includes('cricket')) {
      sport = 'IPL';
    } else if (/\bpkl\b/.test(nameLower) || nameLower.includes('kabaddi') || nameLower.includes('mat')) {
      sport = 'PKL';
    }
    if (sport !== r.sport_type) {
      await prisma.room.update({
        where: { room_code: r.room_code },
        data: { sport_type: sport },
      });
      console.log(`Refined room ${r.room_code} (${r.name}) -> ${sport}`);
    }
  }
}

refine().finally(() => prisma.$disconnect());
