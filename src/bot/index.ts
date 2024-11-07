import { SocksProxyAgent } from "socks-proxy-agent";
import { Markup, session, Telegraf } from "telegraf";
import { SQLite } from "@telegraf/session/sqlite";
import type { BotContext, BotSession } from "./session";
import { isDevelopmentMode } from "../utils";
import { BotStage } from "./scenes";
import { goToMainScene, ScenesIDs } from "./scenes/common";
import { prisma } from "../db";

const proxy = new SocksProxyAgent("socks5://127.0.0.1:10808");

export const SetupBot = async (token: string) => {
	const store = SQLite<BotSession>({
		filename: "././telegraf-sessions.sqlite",
		onInitError: (e) => {console.error("errrr", e)},
	});
	const bot = new Telegraf<BotContext>(token, {
		telegram: isDevelopmentMode() ? { agent: proxy } : undefined,
	});
	// bot.telegram.sendMessage

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
		console.log("balee", ctx.scene.current?.id);
		if (ctx.scene.current?.id !== ScenesIDs.MainScene) {
			//todo: not working
			return goToMainScene(ctx);
		}
	});

	bot.launch();
	process.once("SIGINT", () => bot.stop("SIGINT"));
	process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
