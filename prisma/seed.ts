import "dotenv/config";

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const username =
    process.env.ADMIN_USERNAME || "admin";

  const password =
    process.env.ADMIN_PASSWORD || "Admin@123456";

  const firstName =
    process.env.ADMIN_FIRST_NAME || "مدیر";

  const lastName =
    process.env.ADMIN_LAST_NAME || "سیستم";

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: {
      username,
    },

    update: {
      passwordHash,
      firstName,
      lastName,
      role: "ADMIN",
      isActive: true,
    },

    create: {
      username,
      passwordHash,
      firstName,
      lastName,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Admin created successfully:");
  console.log({
    id: admin.id,
    username: admin.username,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });