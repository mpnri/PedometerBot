import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import { isTextMessage } from "~/bot/utils/types";
import { digitsToHindi, digitsToLatin, getNow } from "~/utils";

const sceneReplyWithBack = (
	ctx: BotContext,
	message: string,
	sendHTML?: boolean,
) =>
	ctx
		.reply(message, {
			...Markup.keyboard(["بازگشت"]),
			...(sendHTML ? { parse_mode: "HTML" } : {}),
		})
		.catch(console.error);

const recordTodayScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.RecordTodayScene,
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		const { nowDate, now } = getNow();
		const todayFa = now.clone().locale("fa").format("jDD jMMMM");

		const user = await prisma.user.findUnique({
			where: { uid },
			include: { walks: true },
		});
		if (!user) {
			return goToMainScene(ctx);
		}
		const walk = user.walks.find((walk) => walk.date === nowDate());
		if (walk) {
			await sceneReplyWithBack(
				ctx,
				`🚶‍♂️ میزان پیاده‌روی امروز شما (${digitsToHindi(todayFa)}): <b>${digitsToHindi(walk.count.toString())} قدم</b>\nدرصورت نیاز به ویرایش، میزان پیاده‌روی خود را مجددا وارد کنید.`,
				true,
			);
		} else {
			await sceneReplyWithBack(
				ctx,
				`🚶‍♂️ میزان پیاده‌روی امروز خود (${digitsToHindi(todayFa)}) را وارد کنید.`,
			);
		}
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
		const { now, nowDate } = getNow();
		console.log(uid, now.calendar());
		const oldWalk = await prisma.walk.findFirst({
			where: { ownerID: id, date: nowDate() },
		});
		if (oldWalk) {
			await prisma.walk.update({ where: { id: oldWalk.id }, data: { count } });
			await ctx.reply("با موفقیت به روزرسانی شد ✅").catch(console.error);
		} else {
			await prisma.walk.create({
				data: {
					ownerID: id,
					count,
					date: nowDate(),
				},
			});
			await ctx.reply("با موفقیت ذخیره شد ✅").catch(console.error);
		}

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
