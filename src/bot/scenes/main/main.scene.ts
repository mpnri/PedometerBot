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
import moment from "jalali-moment";

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
	const user = await prisma.user.findUnique({
		where: { id },
		include: { walks: { orderBy: { date: "asc" } } },
	});
	if (!user) {
		return sceneReplyWithButtons(
			ctx,
			"مشکلی پیش آمد. بات را مجددا استارت کنید.",
			uid,
		);
	}
	if (!user.walks.length) {
		return sceneReplyWithButtons(ctx, "شما تا اکنون رکوردی ثبت نکردید.", uid);
	}
	const status = user.walks
		.map((walk, index) => {
			const dataMoment = moment.from(walk.date, "en", "YYYY-MM-DD");
			const dataMomentStr = digitsToHindi(
				dataMoment.locale("fa").format("jDD jMMMM"),
			);
			const statusEmoji = getStatusEmoji(walk.count);

			const indexStr = (index + 1).toString().split("").reverse().join("");
			return `${digitsToEmoji(indexStr)} ${dataMomentStr}\n🔸تعداد قدم‌ها: ${digitsToHindi(toMoneyFormat(walk.count.toString()))} ${statusEmoji}`;
		})
		.join("\n\n");

	const totalCount = user.walks.reduce(
		(prev, current) => prev + current.count,
		0,
	);
	const totalCountStr = digitsToHindi(toMoneyFormat(totalCount.toString()));

	const totalDaysCountStr = digitsToHindi(user.walks.length.toString());

	const averageCountStr = digitsToHindi(
		toMoneyFormat(Math.trunc(totalCount / user.walks.length).toString()),
	);

	const totalsMessage = `شما در طول <b>${totalDaysCountStr} روز</b>:\n📈 در مجموع <b>${totalCountStr} قدم</b> پیاده‌روی داشته اید.\n📉 به طور میانگین روزانه <b>${averageCountStr} قدم</b> پیاده‌روی کرده اید.`;

	const message = `📊وضعیت شما در ماه گذشته:\n\n${status}\n\n${totalsMessage}`;
	return sceneReplyWithButtons(ctx, message, uid, true);
});

mainScene.hears("یادآور روزانه ⏰", async (ctx) => {
	return ctx.scene.enter(ScenesIDs.SetReminderScene);
});

export { mainScene };

const emojis = [
	"😑",
	"😐",
	"☹️",
	"🙁",
	"😔",
	"😶",
	"🙂",
	"😄",
	"😃",
	"😎",
	"😎👌",
	"💪👌",
	"💪💯",
	"💪🎉💯",
];
function getStatusEmoji(count: number) {
	if (count < 0) return emojis[0];
	const index = Math.trunc(count / 1000);
	if (index >= emojis.length) {
		return emojis[emojis.length - 1];
	}
	return emojis[index];
}
