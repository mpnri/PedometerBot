import dotenv from "dotenv";
import { SetupBot } from "./bot/";
import { prisma } from "./db";

dotenv.config().parsed;

async function main() {
  const token = process.env.BOT_TOKEN;

  if (!token) throw new Error("no Token");

  console.log("====================================");
  console.log("TOKEN Available");
  console.log("====================================");
  return SetupBot(token);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
