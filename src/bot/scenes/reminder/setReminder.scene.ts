import { Markup, Scenes } from "telegraf";
import {
	goToMainScene,
	ScenesIDs as SceneIDs,
	unknownErrorSoGoToMainScene,
} from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import {
	checkIsReminderFormat,
	digitsToLatin,
	inlineErrorHandler,
} from "~/utils";
import { isTextMessage } from "~/bot/utils/types";

const setReminderScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.SetReminderScene,
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid)
			return unknownErrorSoGoToMainScene(ctx);

		const user = await prisma.user.findUnique({ where: { uid } });
		const lastReminderStr =
			user?.reminderTime &&
			`\n\n⏰ زمان فعلی یادآور شما: <b>${user.reminderTime}</b>`;

		const replyMessage =
			"شما می‌تونید با تنظیم کردن یه زمان مشخص در طول روز، به صورت روزانه پیام یادآور (برای ثبت پیاده‌روی اون روز) دریافت کنید 😄" +
			"\n\n" +
			"به عنوان مثال با تنظیم کردن یادآور ⏰ به مقدار 18:35، به صورت روزانه در ساعت 18:35 برای شما پیام یادآوری ارسال خواهد شد ✅" +
			"\n\n" +
			"برای شروع ابتدا زمان مورد نظر خود برای ارسال یادآور⏳ را به فرمت زیر(ساعت به همراه دقیقه) و به * <b>ساعت ایران</b> * ارسال کنید:" +
			"\n" +
			"HH:MM" +
			"\n" +
			"(به عنوان مثال 22:50 یا 01:10 یا 15:00)" +
			(lastReminderStr ?? "");

		const replyKeyboard = lastReminderStr
			? Markup.keyboard(["بازگشت", "لغو یادآور ⏰"], { columns: 2 })
			: Markup.keyboard(["بازگشت"]);

		await ctx
			.reply(replyMessage, {
				...replyKeyboard,
				parse_mode: "HTML",
			})
			.catch(console.error);
		return ctx.wizard.next();
	},
	async (ctx) => {
		const chat = ctx.chat;
		const { id, uid } = ctx.session;
		if (chat?.type !== "private" || !id || !uid)
			return unknownErrorSoGoToMainScene(ctx);

		const message = ctx.message;
		if (!isTextMessage(message)) {
			return ctx
				.reply("لطفا زمان یادآور را در فرمت اشاره شده ارسال کنید.")
				.catch(console.error);
		}

		const text = digitsToLatin(message.text.trim());
		if (text.length !== 5) {
			return ctx
				.reply(
					"لطفا زمان یادآور⏰ را در فرمت اشاره شده ارسال کنید.\n(مثلا 22:50 یا 01:10 یا 15:00)",
				)
				.catch(console.error);
		}

		if (!checkIsReminderFormat(text)) {
			return ctx
				.reply(
					"لطفا زمان یادآور⏰ را در فرمت اشاره شده ارسال کنید.\n(مثلا 22:50 یا 01:10 یا 15:00)",
				)
				.catch(console.error);
		}

		const [_hour, _minute] = text.split(":").map(Number);
		if (
			Number.isNaN(_hour) ||
			Number.isNaN(_minute) ||
			_hour >= 24 ||
			_minute >= 60
		) {
			return ctx
				.reply(
					"لطفا زمان یادآور⏰ را در فرمت اشاره شده ارسال کنید.\n(مثلا 22:50 یا 01:10 یا 15:00)",
				)
				.catch(console.error);
		}

		try {
			await prisma.user.update({
				where: { uid },
				data: { reminderTime: text },
			});
			await ctx
				.reply("با موفقیت ثبت شد ✅", Markup.removeKeyboard())
				.catch(console.error);
			console.log(uid, "Set reminder for", text);
			await goToMainScene(ctx);
		} catch (error) {
			console.error("set reminder ERROR:", error);
			await unknownErrorSoGoToMainScene(ctx);
		}
		return ctx.wizard.next();
	},
);

setReminderScene.hears("بازگشت", async (ctx) => {
	return goToMainScene(ctx);
});

setReminderScene.hears("لغو یادآور ⏰", async (ctx) => {
	const chat = ctx.chat;
	const { id, uid } = ctx.session;
	if (chat?.type !== "private" || !id || !uid)
		return unknownErrorSoGoToMainScene(ctx);

	const [_, removeReminderError] = await inlineErrorHandler(
		prisma.user.update({
			where: { uid },
			data: { reminderTime: null },
		}),
	);

	if (removeReminderError) {
		console.error("removeReminderError:", removeReminderError);
		return unknownErrorSoGoToMainScene(ctx);
	}
	await ctx
		.reply("یادآور⏰ با موفقیت حذف شد.", Markup.removeKeyboard())
		.catch(console.error);
	console.log(uid, "Removed reminder");

	return goToMainScene(ctx);
});

setReminderScene.leave(async (ctx) => {
	return goToMainScene(ctx);
});

setReminderScene.start(async (ctx) => {
	await goToMainScene(ctx);
});

export { setReminderScene };
