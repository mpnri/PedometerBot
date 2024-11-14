import dotenv from "dotenv";
import { prisma } from "./db";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Telegraf } from "telegraf";
import { isDevelopmentMode } from "./utils";

const proxy = new SocksProxyAgent("socks5://127.0.0.1:10808");
dotenv.config().parsed;

async function main() {
	const token = process.env.BOT_TOKEN;

	if (!token) throw new Error("no Token");

	console.log("====================================");
	console.log("TOKEN Available");
	console.log("====================================");

	if (!(process.env.IS_JOB_COMMAND_ACTIVE === "true")) {
		console.log("job command is not active!!!");
		return;
	}
	const bot = new Telegraf(token, {
		telegram: isDevelopmentMode() ? { agent: proxy } : undefined,
	});

	setTimeout(() => {
		const message = process.env.MESSAGE_TO_ALL?.trim();
		if (message) {
			sendMessageToAllUsers(bot, message);
		} else {
			console.log("no message found");
		}
	}, 20_000);

	bot.launch();
	process.once("SIGINT", () => bot.stop("SIGINT"));
	process.once("SIGTERM", () => bot.stop("SIGTERM"));
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

async function sendMessageToAllUsers(bot: Telegraf, message: string) {
	console.log("message:");
	console.log(message);
	const allUsers = await prisma.user.findMany();
	console.log("sending this message to all Users:", allUsers.length, "user.\n");

	let errorCount = 0;
	for (const user of allUsers) {
		try {
			await bot.telegram.sendMessage(user.uid.toString(), message, {
				parse_mode: "Markdown",
			});
			console.log("message successfully sent to", user.uid.toString());
		} catch (error) {
			console.error("send message error", error);
			errorCount++;
		}
	}

	console.log(
		`\n📊 Results: (${allUsers.length} users)\n✅ ${allUsers.length - errorCount} succeed.\n❌ ${errorCount} failed.`,
	);
	bot.stop();
}
