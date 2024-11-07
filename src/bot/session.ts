// import { Path } from "@prisma/client";
import type { Context, Scenes } from "telegraf";
import { Location } from "telegraf/typings/core/types/typegram";

interface BotWizardSession extends Scenes.WizardSessionData {
  //* choose path scene:
  // start?: Location;
  // end?: Location;
  // paths?: Path[];
}

export interface BotSession extends Scenes.WizardSession<BotWizardSession> {
  cnt?: number;
  id?: number;
  uid?: number;
  isAuthenticated?: boolean;
}

export interface BotContext extends Context {
  session: BotSession;

  scene: Scenes.SceneContextScene<BotContext, BotWizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}
