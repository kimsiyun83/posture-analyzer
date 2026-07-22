import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@studio.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "관리자",
      role: "admin",
    },
  });

  console.log(`Created admin account: ${email} / ${password}`);
  console.log("Log in and change this password immediately.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
