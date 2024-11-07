import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import { isTextMessage } from "~/bot/utils/types";
import { digitsToLatin } from "~/utils";
import moment from "moment";

const sceneReplyWithBack = (ctx: BotContext, message: string) =>
	ctx.reply(message, Markup.keyboard(["بازگشت"]));

const recordTodayScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.RecordTodayScene,
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		await sceneReplyWithBack(ctx, "میزان پیاده‌روی امروز خود را وارد کنید.");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		const message = ctx.message;
		if (!isTextMessage(message)) {
			return sceneReplyWithBack(
				ctx,
				"لطفا یک عدد در قالب یک پیام متنی بفرستید!",
			);
		}
		const latinMessage = digitsToLatin(message.text.trim());
		const count = +latinMessage;
		if (Number.isNaN(count)) {
			return sceneReplyWithBack(
				ctx,
				"لطفا یک عدد در قالب یک پیام متنی بفرستید!",
			);
		}
		if (count < 0) {
			return sceneReplyWithBack(ctx, "پیاده‌روی منفی؟ :)");
		}
		if (count > 1e6) {
			return sceneReplyWithBack(
				ctx,
				"بیشتر از یه میلیون قدم راه رفتی؟؟\nخداقوت ولی نمیتونیم ثبت کنیم :)",
			);
		}

		//iran time
		const now = moment().utc().utcOffset(3.5);
		console.log(now.calendar());

		await prisma.walk.create({
			data: {
				ownerID: id,
				count,
				date: now.format("YYYY-MM-DD"),
			},
		});
		await ctx.reply("با موفقیت ذخیره شد ✅");
		await goToMainScene(ctx);
		return ctx.wizard.next();
	},
);

recordTodayScene.hears("بازگشت", async (ctx) => {
	return goToMainScene(ctx);
});

recordTodayScene.leave(async (ctx) => {
	return goToMainScene(ctx);
});

recordTodayScene.start(async (ctx) => {
	await goToMainScene(ctx);
});

export { recordTodayScene };
