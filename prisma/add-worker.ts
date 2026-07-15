import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Worker123!", 10);
  const worker = await prisma.user.upsert({
    where: { email: "worker@aptech.test" },
    update: {},
    create: {
      name: "Test Worker",
      email: "worker@aptech.test",
      password,
      role: "TEAM_MEMBER",
      skills: {
        connect: [{ name: "UI/UX" }, { name: "Figma" }],
      },
    },
  });
  console.log("Worker ready:", worker.email, "/ Worker123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());