import type { Telegraf } from "telegraf";
import type { BotContext } from "../session";
import { getTopMembers } from "./utils";
import { getMyStatusReport } from "../scenes/main";

export const groupAdminMessageHandler = async (
	bot: Telegraf<BotContext>,
	gID: number,
	messageText: string,
): Promise<string> => {
	switch (messageText) {
		case "خلاصه وضعیت": {
			const reply = await getTopMembers(bot, gID, 3).catch((err) => {
				console.error("groupMessageHandler getTopMembers Error:", err);
				return "";
			});
			return reply;
		}
	}

	return "";
};

export const groupNonAdminMessageHandler = async (
	gID: number,
	myUID: number,
	messageText: string,
): Promise<{ replyMessage: string | null; reply_message_id?: number }> => {
	switch (messageText) {
		case "ارسال گزارش": {
			if (!process.env.GROUP_IDs?.split(",").includes(gID.toString())) {
				return { replyMessage: null };
			}

			const reply = await getMyStatusReport(myUID).catch((err) => {
				console.error("groupMessageHandler getTopMembers Error:", err);
				return "";
			});
			return {
				replyMessage: reply,
				reply_message_id: 5397,
			};
		}

		case "سلام":
			return {
				replyMessage:
					"سلام 👋👋\nمن بات هم‌قدم🚶‍♂️🚶‍♀️ هستم.\nکاری باری بود درخدمتم :)",
			};
	}

	return { replyMessage: null };
};
