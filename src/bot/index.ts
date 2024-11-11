import { SocksProxyAgent } from "socks-proxy-agent";
import { Markup, session, Telegraf } from "telegraf";
import { SQLite } from "@telegraf/session/sqlite";
import type { BotContext, BotSession } from "./session";
import { getNow, isDevelopmentMode } from "../utils";
import { BotStage } from "./scenes";
import { goToMainScene, ScenesIDs } from "./scenes/common";
import { prisma } from "../db";
import { getTopMembers } from "./utils/utils";

const proxy = new SocksProxyAgent("socks5://127.0.0.1:10808");

export const SetupBot = async (token: string) => {
	const store = SQLite<BotSession>({
		filename: "././telegraf-sessions.sqlite",
		onInitError: (e) => {
			console.error("session db error", e);
		},
	});
	const bot = new Telegraf<BotContext>(token, {
		telegram: isDevelopmentMode() ? { agent: proxy } : undefined,
	});

	// bot.telegram.sendMessage
	setInterval(() => {
		const { now } = getNow();

		const time = now.format("HH:mm");
		if (time === process.env.GROUP_JOB_TIME) {
			process.env.GROUP_IDs?.split(",").map((gID) =>
				getTopMembers(bot, gID).then((message) => {
					bot.telegram
						.sendMessage(gID, message)
						.then((res) => {
							console.log(`message successfully sent to ${gID}`, res);
						})
						.catch((err) => {
							console.error(`Job sendMessage error for ${gID}`, err);
						});
				}),
			);
		}
	}, 60_000);
	// bot.use(async (ctx) => {
	// 	console.log("balee", ctx.message);
	// 	// if (ctx.scene.current?.id !== ScenesIDs.MainScene) {
	// 	// 	//todo: not working
	// 	// 	return goToMainScene(ctx);
	// 	// }
	// });
	// bot.on("message", async (ctx) => {});

	// bot.use(session({ defaultSession: (c) => ({}) }));
	bot.use(session({ store }));
	bot.use(BotStage.middleware());

	bot.start(async (ctx, next) => {
		const chat = ctx.chat;
		if (chat.type !== "private") return;

		console.log("start bot:", chat.id);
		if (ctx.session.cnt) {
			ctx.session.cnt++;
		} else {
			ctx.session.cnt = 1;
		}
		console.log(ctx.session.cnt);
		await ctx.reply(`سلام ${chat.first_name} 👋`, Markup.removeKeyboard());
		return goToMainScene(ctx);
	});

	bot.use(async (ctx) => {
		console.log(
			ctx.chat?.id,
			"initialed without /start command",
			ctx.scene.current?.id,
		);
		if (ctx.scene.current?.id !== ScenesIDs.MainScene) {
			//todo: not working
			return goToMainScene(ctx);
		}
	});

	bot.launch();
	process.once("SIGINT", () => bot.stop("SIGINT"));
	process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
