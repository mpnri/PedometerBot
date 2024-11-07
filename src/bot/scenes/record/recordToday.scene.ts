import { Markup, Scenes } from "telegraf";
import { goToMainScene, ScenesIDs as SceneIDs, ScenesIDs } from "../common";
import type { BotContext } from "~/bot/session";
import { prisma } from "~/db";

const recordTodayScene = new Scenes.WizardScene<BotContext>(
	SceneIDs.RecordTodayScene,
	async (ctx) => {
		const chat = ctx.chat;
		if (chat?.type !== "private") return;
	},
);

recordTodayScene.start(async (ctx) => {
	await goToMainScene(ctx);
});

export { recordTodayScene };
