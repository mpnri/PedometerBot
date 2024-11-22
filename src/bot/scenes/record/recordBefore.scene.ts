import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import { isDateQuery, isTextMessage } from "~/bot/utils/types";
import { digitsToHindi, digitsToLatin, getNow } from "~/utils";
import moment from "jalali-moment";

const AvailableEditDaysCount = 15;

const callbackDateHandler = async (ctx: BotContext, uid: number) => {
	const callbackQuery = ctx.callbackQuery;
	if (isDateQuery(callbackQuery)) {
		const data = callbackQuery.data;
		if (data === "edit-together") {
			ctx
				.answerCbQuery("در حال انجام عملیات", { show_alert: false })
				.catch((err) => {
					console.log(
						`answer CB query 'edit-together' error for ${uid}:`,
						err,
						"در حال انجام عملیات",
					);
				});
			return "edit-together";
		}
		if (data === "back-home") {
			ctx.answerCbQuery("بازگشت", { show_alert: false }).catch((err) => {
				console.log(
					`answer CB query 'back-home' error for ${uid}:`,
					err,
					"بازگشت",
				);
			});
			return "go-home";
		}

		//* so data is a "Date"
		const dataDate = data;

		//* check if it's before than `AvailableEditDaysCount` days ago
		const { now } = getNow();
		const twelveDaysBefore = now.subtract(AvailableEditDaysCount, "days");
		if (twelveDaysBefore.isAfter(dataDate, "day")) {
			await ctx
				.reply(
					`این تاریخ قبل تر از ${digitsToHindi(AvailableEditDaysCount.toString())} روز قبل است و امکان ویرایش یا ثبت برای آن وجود ندارد.`,
				)
				.catch(console.error);
			return "fail";
		}

		//! careful it returns utc time
		const dataMoment = moment.from(dataDate, "en", "YYYY-MM-DD");
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
		const CBQueryMessage = `میزان پیاده‌روی خود در ${dataDateLabel} را وارد کنید.`;

		ctx.answerCbQuery(CBQueryMessage).catch((err) => {
			console.log(
				`answer CB query "record for date" error for ${uid}:`,
				err,
				CBQueryMessage,
			);
		});
		if (walk) {
			await ctx
				.reply(
					`میزان پیاده‌روی شما در ${dataDateLabel}: ${digitsToHindi(walk.count.toString())} قدم\nدرصورت نیاز به ویرایش، میزان پیاده‌روی خود را مجددا وارد کنید.`,
				)
				.catch(console.error);
		} else {
			await ctx
				.reply(`میزان پیاده‌روی خود در ${dataDateLabel} را وارد کنید.`)
				.catch(console.error);
		}
		ctx.scene.session.recordBeforeScene = { date: dataDate };
		return "next";
	}
	return "fail";
};

const sendInlineDatesMessage = async (
	ctx: BotContext,
	uid: number,
	lastAction?: "sent" | "edited",
) => {
	const { now } = getNow();

	//todo: heavy action?
	const user = await prisma.user.findUnique({
		where: { uid },
		include: { walks: true },
	});
	const walks = user?.walks;
	const availableDateButton = new Array(5)
		.fill(0)
		.map((_, index) => index)
		.map((index) => {
			const startDayOffSet = AvailableEditDaysCount - index * 3;
			const cloneNow = now.clone().subtract(startDayOffSet, "days");
			return new Array(3).fill(0).map((_, index) => {
				const data = cloneNow.locale("en").format("YYYY-MM-DD");
				const isAlreadyRecorded = walks?.find((walk) => walk.date === data);
				const textPostfix = isAlreadyRecorded ? " ✅" : "";
				const text = digitsToHindi(
					cloneNow.locale("fa").format(`jDD jMMMM${textPostfix}`),
				);

				cloneNow.add(1, "days");
				return Markup.button.callback(text, data);
			});
		});
	availableDateButton.push(
		// [Markup.button.callback("ویرایش چند روز به صورت یک جا", "edit-together")],
		[Markup.button.callback("بازگشت", "back-home")],
	);

	const lastActionMessage =
		lastAction === "sent"
			? "با موفقیت ذخیره شد ✅\n\n"
			: lastAction === "edited"
				? "با موفقیت به روزرسانی شد ✅\n\n"
				: "";
	const message =
		lastActionMessage +
		"یکی از گزینه‌های زیر را برای ثبت و یا ویرایش میزان پیاده‌روی خود انتخاب کنید." +
		"\n" +
		`شما می‌توانید میزان پیاده‌روی خود را تا حداکثر ${digitsToHindi(AvailableEditDaysCount.toString())} روز قبل ویرایش کنید.`;

	await ctx
		.reply(message, Markup.inlineKeyboard(availableDateButton))
		.catch(console.error);
};

const recordBeforeScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.RecordBeforeScene,
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid) return;

		await ctx
			.reply("لطفا کمی صبر کنید", Markup.removeKeyboard())
			.catch(console.error);
		// ctx.deleteMessage(message.message_id);
		await sendInlineDatesMessage(ctx, uid);
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
		if (result === "edit-together") {
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
			return ctx
				.reply("لطفا یک عدد در قالب یک پیام متنی بفرستید!")
				.catch(console.error);
		}
		const latinMessage = digitsToLatin(message.text.trim());
		const count = +latinMessage;
		if (Number.isNaN(count)) {
			return ctx
				.reply("لطفا یک عدد در قالب یک پیام متنی بفرستید!")
				.catch(console.error);
		}
		if (count < 0) {
			return ctx.reply("پیاده‌روی منفی؟ :)").catch(console.error);
		}
		if (count > 1e6) {
			return ctx
				.reply(
					"بیشتر از یه میلیون قدم راه رفتی؟؟\nخداقوت ولی نمیتونیم ثبت کنیم :)",
				)
				.catch(console.error);
		}

		//iran time
		console.log(uid, targetDate);
		const oldWalk = await prisma.walk.findFirst({
			where: { ownerID: id, date: targetDate },
		});
		if (oldWalk) {
			await prisma.walk.update({ where: { id: oldWalk.id }, data: { count } });
			// await ctx.reply("با موفقیت به روزرسانی شد ✅");
			await sendInlineDatesMessage(ctx, uid, "edited");
		} else {
			await prisma.walk.create({
				data: {
					ownerID: id,
					count,
					date: targetDate,
				},
			});
			// await ctx.reply("با موفقیت ذخیره شد ✅");
			await sendInlineDatesMessage(ctx, uid, "sent");
		}

		return ctx.wizard.selectStep(1);
		// await goToMainScene(ctx);
		// return ctx.wizard.next();
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
