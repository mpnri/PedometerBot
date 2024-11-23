import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import {
	digitsToEmoji,
	digitsToHindi,
	FeatureFlag,
	isFeatureFlagActive,
	toMoneyFormat,
} from "~/utils";
import { getMyStatusReport } from "./utils";

const sceneReplyWithButtons = (
	ctx: BotContext,
	message: string,
	uid?: number,
	sendHTML?: boolean,
) => {
	const isRecordBeforeDateActive = uid
		? isFeatureFlagActive(FeatureFlag.RecordBeforeDate, uid)
		: false;

	return ctx
		.reply(message, {
			...Markup.keyboard(
				isRecordBeforeDateActive
					? [
							"ثبت پیاده‌روی امروز",
							"ثبت پیاده‌روی روز‌های قبل",
							"مشاهده وضعیت 📊",
							"یادآور روزانه ⏰",
						]
					: ["ثبت پیاده‌روی امروز", "مشاهده وضعیت 📊"],
				{ columns: isRecordBeforeDateActive ? 2 : 1 },
			),
			...(sendHTML ? { parse_mode: "HTML" } : {}),
		})
		.catch((err) => console.error("MAIN send message ERROR:", err));
};

const mainScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.MainScene,
	async (ctx) => {
		const chat = ctx.chat;
		if (chat?.type !== "private") return;

		if (!ctx.session.isAuthenticated) {
			//* create user if not exist
			let user = await prisma.user.findUnique({ where: { uid: chat.id } });
			if (!user) {
				user = await prisma.user.create({ data: { uid: chat.id } });
			}
			ctx.session.isAuthenticated = true;
			ctx.session.uid = chat.id;
			ctx.session.id = user.id;
		}

		await sceneReplyWithButtons(
			ctx,
			"یک گزینه را انتخاب کنید.",
			ctx.session.uid,
		);
	},
);

mainScene.hears("ثبت پیاده‌روی امروز", async (ctx) => {
	return ctx.scene.enter(ScenesIDs.RecordTodayScene);
});
mainScene.hears("ثبت پیاده‌روی روز‌های قبل", async (ctx) => {
	const { uid, id } = ctx.session;
	if (!uid || !id) return;
	if (isFeatureFlagActive(FeatureFlag.RecordBeforeDate, uid)) {
		return ctx.scene.enter(ScenesIDs.RecordBeforeScene);
	}
	return sceneReplyWithButtons(
		ctx,
		"یک گزینه را انتخاب کنید.",
		ctx.session.uid,
	);
});
mainScene.hears("مشاهده وضعیت 📊", async (ctx) => {
	const { id, uid } = ctx.session;
	if (!id || !uid) {
		return sceneReplyWithButtons(
			ctx,
			"مشکلی پیش آمد. بات را مجددا استارت کنید.",
		);
	}

	const message = await getMyStatusReport(uid).catch((err) => {
		console.error("getMyStatusReport Error", err);
	});
	if (!message) {
		return sceneReplyWithButtons(
			ctx,
			"مشکلی پیش آمد. بات را مجددا استارت کنید.",
			uid,
		);
	}
	return sceneReplyWithButtons(ctx, message, uid, true);
});

mainScene.hears("یادآور روزانه ⏰", async (ctx) => {
	return ctx.scene.enter(ScenesIDs.SetReminderScene);
});

export { mainScene };
