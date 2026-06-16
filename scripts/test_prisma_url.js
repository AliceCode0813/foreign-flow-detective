const { PrismaClient } = require("@prisma/client");

const url = process.argv[2];
if (!url) {
  console.error("usage: node scripts/test_prisma_url.js <DATABASE_URL>");
  process.exit(1);
}

process.env.DATABASE_URL = url;
const prisma = new PrismaClient();

prisma.stock
  .count()
  .then((count) => {
    console.log("ok stock count =", count);
    return prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("fail", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
