import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import { isDateQuery, isTextMessage } from "~/bot/utils/types";
import { digitsToHindi, digitsToLatin, getNow } from "~/utils";
import moment from "jalali-moment";

const AvailableEditDaysCount = 12;

const callbackDateHandler = async (ctx: BotContext, uid: number) => {
	const callbackQuery = ctx.callbackQuery;
	if (isDateQuery(callbackQuery)) {
		const data = callbackQuery.data;
		await ctx.answerCbQuery("در حال انجام عملیات", { show_alert: false });
		if (data === "edit-together") {
			return "edit";
		}
		if (data === "back-home") {
			return "go-home";
		}
		const dataMoment = moment.from(data, "en", "YYYY-MM-DD");
		const dataDate = data;
		const dataDateLabel = digitsToHindi(
			dataMoment.locale("fa").format("jDD jMMMM"),
		);
		const user = await prisma.user.findUnique({
			where: { uid },
			include: { walks: true },
		});
		if (!user) {
			return "go-home";
		}
		const walk = user.walks.find((walk) => walk.date === dataDate);
		if (walk) {
			await ctx.reply(
				`میزان پیاده‌روی شما در ${dataDateLabel}: ${digitsToHindi(walk.count.toString())} قدم\nدرصورت نیاز به ویرایش ، میزان پیاده‌روی خود را مجددا وارد کنید.`,
			);
		} else {
			await ctx.reply(`میزان پیاده‌روی خود در ${dataDateLabel} را وارد کنید.`);
		}
		ctx.scene.session.recordBeforeScene = { date: dataDate };
		return "next";
	}
	return "fail";
};

const recordBeforeScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.RecordBeforeScene,
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		const { now } = getNow();

		const availableDateButton = new Array(4)
			.fill(0)
			.map((_, index) => index)
			.map((index) => {
				const startDayOffSet = AvailableEditDaysCount - index * 3;
				const cloneNow = now.clone().subtract(startDayOffSet, "days");
				return new Array(3).fill(0).map((_, index) => {
					const text = digitsToHindi(cloneNow.locale("fa").format("jDD jMMMM"));
					const data = cloneNow.locale("en").format("YYYY-MM-DD");

					cloneNow.add(1, "days");
					return Markup.button.callback(text, data);
				});
			});
		availableDateButton.push(
			// [Markup.button.callback("ویرایش چند روز به صورت یک جا", "edit-together")],
			[Markup.button.callback("بازگشت", "back-home")],
		);
		await ctx.reply("لطفا کمی صبر کنید", Markup.removeKeyboard());
		await ctx.reply(
			"یکی از گزینه‌های زیر را برای ثبت و یا ویرایش میزان پیاده‌روی خود انتخاب کنید.\n شما می‌توانید میزان پیاده‌روی خود را تا حداکثر ۱۲ روز قبل ویرایش کنید.",
			Markup.inlineKeyboard(availableDateButton),
		);

		return ctx.wizard.next();
	},
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		const result = await callbackDateHandler(ctx, uid);
		if (result === "go-home") {
			return goToMainScene(ctx);
		}
		if (result === "next") {
			return ctx.wizard.next();
		}
		if (result === "edit") {
			return ctx.wizard.selectStep(ctx.wizard.cursor + 2);
		}
		return;
	},
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		const targetDate = ctx.scene.session.recordBeforeScene?.date;
		if (chat?.type !== "private" || !id || !uid || !targetDate) return;

		if (isDateQuery(ctx.callbackQuery)) {
			const res = await callbackDateHandler(ctx, uid);
			if (res === "go-home") {
				return goToMainScene(ctx);
			}
			return;
		}

		const message = ctx.message;
		if (!isTextMessage(message)) {
			return ctx.reply("لطفا یک عدد در قالب یک پیام متنی بفرستید!");
		}
		const latinMessage = digitsToLatin(message.text.trim());
		const count = +latinMessage;
		if (Number.isNaN(count)) {
			return ctx.reply("لطفا یک عدد در قالب یک پیام متنی بفرستید!");
		}
		if (count < 0) {
			return ctx.reply("پیاده‌روی منفی؟ :)");
		}
		if (count > 1e6) {
			return ctx.reply(
				"بیشتر از یه میلیون قدم راه رفتی؟؟\nخداقوت ولی نمیتونیم ثبت کنیم :)",
			);
		}

		//iran time
		console.log(uid, targetDate);
		const oldWalk = await prisma.walk.findFirst({
			where: { ownerID: id, date: targetDate },
		});
		if (oldWalk) {
			await prisma.walk.update({ where: { id: oldWalk.id }, data: { count } });
			await ctx.reply("با موفقیت به روزرسانی شد ✅");
		} else {
			await prisma.walk.create({
				data: {
					ownerID: id,
					count,
					date: targetDate,
				},
			});
			await ctx.reply("با موفقیت ذخیره شد ✅");
		}

		await goToMainScene(ctx);
		return ctx.wizard.next();
	},
	// async (ctx) => {},
);

recordBeforeScene.hears("بازگشت", async (ctx) => {
	return goToMainScene(ctx);
});

recordBeforeScene.leave(async (ctx) => {
	ctx.scene.session.recordBeforeScene = undefined;
	return goToMainScene(ctx);
});

recordBeforeScene.start(async (ctx) => {
	await goToMainScene(ctx);
});

export { recordBeforeScene };
