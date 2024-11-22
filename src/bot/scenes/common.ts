import type { BotContext } from "../session";

export enum ScenesIDs {
	MainScene = "MainScene",

	RecordTodayScene = "RecordTodayScene",
	RecordBeforeScene = "RecordBeforeScene",

	SetReminderScene = "SetReminderScene",
}

export const goToMainScene = (ctx: BotContext) =>
	ctx.scene.enter(ScenesIDs.MainScene);

export const unknownErrorSoGoToMainScene = async (ctx: BotContext) => {
	await ctx.reply("با عرض پوزش. مشکلی پیش آمد.").catch(console.error);
	await goToMainScene(ctx);
};
