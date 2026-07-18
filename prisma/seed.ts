import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Super admin
  const password = await bcrypt.hash("NHArafat99", 10);
  await prisma.user.upsert({
    where: { email: "nazmulha30@gmail.com" },
    update: {},
    create: {
      name: "Nazmul Hasan",
      email: "nazmulha30@gmail.com",
      password,
      role: "SUPER_ADMIN",
    },
  });

  // Default exchange rates (admin can edit in Settings)
  for (const [code, rate] of [
    ["USD", 120],
    ["EUR", 130],
    ["GBP", 152],
  ] as const) {
    await prisma.exchangeRate.upsert({
      where: { code },
      update: {},
      create: { code, rateToBdt: rate },
    });
  }

  // Default loyalty + reserve + withdraw settings
  for (const [key, value] of [
    ["loyalty.pointsPer", "50"],
    ["loyalty.perAmountUsd", "10"],
    ["loyalty.pointsPerDollar", "100"],
    ["reserve.percent", "10"],
    ["reserve.emergencyMaxPercent", "70"],
    ["reserve.releaseThresholdBdt", "100000"],
    ["withdraw.windowDays", "7"],
  ]) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // Starter skills
  for (const name of [
    "UI/UX",
    "Figma",
    "Elementor",
    "WordPress",
    "Next.js",
    "Strapi",
    "SEO",
    "Branding",
    "Video Editing",
  ]) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seed complete ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());