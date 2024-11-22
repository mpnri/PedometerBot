import { Scenes } from "telegraf";
import { mainScene } from "./main";
import { recordBeforeScene, recordTodayScene } from "./record";
import { setReminderScene } from "./reminder";

export const BotStage = new Scenes.Stage([
	mainScene,
	recordTodayScene,
	recordBeforeScene,
	setReminderScene,
]);
