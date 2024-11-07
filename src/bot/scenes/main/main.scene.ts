import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";

const mainScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.MainScene,
	async (ctx) => {
		const chat = ctx.chat;
		if (chat?.type !== "private") return;

		if (!ctx.session.isAuthenticated) {
			//* create user if not exist
			if (!(await prisma.user.findUnique({ where: { id: chat.id } }))) {
				await prisma.user.create({ data: { uid: chat.id } });
				ctx.session.isAuthenticated = true;
			}
		}

		await ctx.reply(
			"یک گزینه را انتخاب کنید.",
			Markup.keyboard(["ثبت پیاده‌روی امروز", "مشاهده وضعیت"]),
		);
	},
);

mainScene.hears("ثبت پیاده‌روی امروز", async (ctx) => {
	ctx.scene.enter(ScenesIDs.RecordTodayScene);
});

export { mainScene };
