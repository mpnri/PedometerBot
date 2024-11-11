import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";
import { digitsToEmoji, digitsToHindi, toMoneyFormat } from "~/utils";
import moment from "jalali-moment";

const sceneReplyWithButtons = (ctx: BotContext, message: string) =>
	ctx.reply(
		message,
		Markup.keyboard(
			["ثبت پیاده‌روی امروز", "ثبت پیاده‌روی روز‌های قبل", "مشاهده وضعیت"],
			{ columns: 2 },
		),
	);

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

		await sceneReplyWithButtons(ctx, "یک گزینه را انتخاب کنید.");
	},
);

mainScene.hears("ثبت پیاده‌روی امروز", async (ctx) => {
	return ctx.scene.enter(ScenesIDs.RecordTodayScene);
});
mainScene.hears("ثبت پیاده‌روی روز‌های قبل", async (ctx) => {
	return ctx.scene.enter(ScenesIDs.RecordBeforeScene);
});
mainScene.hears("مشاهده وضعیت", async (ctx) => {
	const { id } = ctx.session;
	if (!id) {
		return sceneReplyWithButtons(
			ctx,
			"مشکلی پیش آمد. بات را مجددا استارت کنید.",
		);
	}
	const user = await prisma.user.findUnique({
		where: { id },
		include: { walks: { orderBy: { date: "asc" } } },
	});
	if (!user) {
		return sceneReplyWithButtons(
			ctx,
			"مشکلی پیش آمد. بات را مجددا استارت کنید.",
		);
	}
	if (!user.walks.length) {
		return sceneReplyWithButtons(ctx, "شما تا اکنون رکوردی ثبت نکردید.");
	}
	const status = user.walks
		.map((walk, index) => {
			const dataMoment = moment.from(walk.date, "en", "YYYY-MM-DD");
			const dataMomentStr = digitsToHindi(
				dataMoment.locale("fa").format("jDD jMMMM"),
			);
			const indexStr = (index + 1).toString().split("").reverse().join("");
			return `${digitsToEmoji(indexStr)} ${dataMomentStr}\n🔸تعداد قدم‌ها: ${digitsToHindi(walk.count.toString())}`;
		})
		.join("\n\n");

	const totalCount = user.walks.reduce(
		(prev, current) => prev + current.count,
		0,
	);
	const totalCountStr = toMoneyFormat(digitsToHindi(totalCount.toString()));

	const message = `📊وضعیت شما در ۳۰ روز گذشته:\n\n${status}\n\n📈 شما در ۳۰ روز گذشته در مجموع ${totalCountStr} قدم پیاده‌روی داشته اید.`;
	return sceneReplyWithButtons(ctx, message);
});

export { mainScene };
