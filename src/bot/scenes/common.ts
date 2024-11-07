import type { BotContext } from "../session";

export enum ScenesIDs {
	MainScene = "MainScene",
	RecordTodayScene = "RecordTodayScene",
}

export const goToMainScene = (ctx: BotContext) =>
	ctx.scene.enter(ScenesIDs.MainScene);
