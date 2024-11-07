import { Scenes } from "telegraf";
import { mainScene } from "./main";
import { recordTodayScene } from "./record";

export const BotStage = new Scenes.Stage([mainScene, recordTodayScene]);
