const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studios = await prisma.studio.findMany({ take: 3 });
  console.log('Studios:', JSON.stringify(studios, null, 2));

  const events = await prisma.event.findMany({ take: 3 });
  console.log('Events:', JSON.stringify(events, null, 2));
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());