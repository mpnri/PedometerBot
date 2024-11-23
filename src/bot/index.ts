import { SocksProxyAgent } from "socks-proxy-agent";
import { Markup, session, Telegraf } from "telegraf";
import { SQLite } from "@telegraf/session/sqlite";
import type { BotContext, BotSession } from "./session";
import { getNow, isDevelopmentMode } from "../utils";
import { BotStage } from "./scenes";
import { goToMainScene, ScenesIDs } from "./scenes/common";
import { getTopMembers, isGroupAdminOrBotAdminInGroup } from "./utils/utils";
import { runReminderJob } from "./jobs";
import { isTextMessage } from "./utils/types";
import {
	groupAdminMessageHandler,
	groupNonAdminMessageHandler,
} from "./utils/group";

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

	//todo: move to Jobs
	setInterval(() => {
		const { now } = getNow();

		const time = now.format("HH:mm");
		if (time === process.env.GROUP_JOB_TIME) {
			process.env.GROUP_IDs?.split(",").map((gID) =>
				getTopMembers(bot, gID).then((message) => {
					bot.telegram
						.sendMessage(gID, message, { parse_mode: "HTML" })
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

	setTimeout(() => {
		//* run reminders Job
		runReminderJob(bot);
	}, 60_000);

	// bot.use(async (ctx) => {
	// if (ctx.scene.current?.id !== ScenesIDs.MainScene) {
	// 	//todo: not working
	// 	return goToMainScene(ctx);
	// }
	// });
	// bot.on("message", async (ctx) => {});

	// bot.use(session({ defaultSession: (c) => ({}) }));
	bot.use(session({ store }));
	bot.use(BotStage.middleware());

	bot.start(async (ctx, next) => {
		const chat = ctx.chat;
		if (chat.type !== "private") return next();

		console.log("start bot:", chat.id);
		if (ctx.session.cnt) {
			ctx.session.cnt++;
		} else {
			ctx.session.cnt = 1;
		}
		console.log(ctx.session.cnt);
		await ctx
			.reply(`سلام ${chat.first_name} 👋`, Markup.removeKeyboard())
			.catch((err) => console.error("Start Error:", err));
		return goToMainScene(ctx);
	});

	bot.on(["message"], async (ctx, next) => {
		if (ctx.chat.type === "private") return next();
		//* just for group messages
		const message = ctx.message;
		if (isTextMessage(message)) {
			if (message.from.is_bot) {
				//todo: handle anonymous admins (is_bot: true)
				return;
			}

			const text = message.text.trim();
			const { replyMessage: reply_msg, reply_message_id } =
				await groupNonAdminMessageHandler(
					message.chat.id,
					message.from.id,
					text,
				);

			if (reply_msg) {
				console.log("send non admin message:", { text });
				return ctx
					.replyWithHTML(reply_msg, {
						reply_parameters: {
							message_id: reply_message_id ?? message.message_id,
						},
					})
					.catch((err) => {
						console.log(
							`send response to message '${text}', Error`,
							message.chat,
							message.from,
							":::::",
							err,
						);
					});
			}

			const isAdmin = await isGroupAdminOrBotAdminInGroup(ctx);
			if (!isAdmin) {
				//* no admin message
				return;
			}

			const replyMessage = await groupAdminMessageHandler(
				bot,
				message.chat.id,
				text,
			);

			if (replyMessage) {
				console.log("get admin message:", { text });

				return ctx
					.replyWithHTML(replyMessage, {
						reply_parameters: {
							message_id: message.message_id,
						},
					})
					.catch((err) => {
						console.log(
							`send Admin response to message '${text}', Error`,
							message.chat,
							message.from,
							":::::",
							err,
						);
					});
			}
		}
	});

	bot.use(async (ctx) => {
		console.log(
			ctx.chat?.id,
			"initialed without /start command",
			ctx.scene.current?.id,
		);
		if (ctx.chat?.type !== "private") return;
		if (ctx.scene.current?.id !== ScenesIDs.MainScene) {
			//todo: not working
			return goToMainScene(ctx);
		}
	});

	bot.launch();
	process.once("SIGINT", () => bot.stop("SIGINT"));
	process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
