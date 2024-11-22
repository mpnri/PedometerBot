import type { Telegraf } from "telegraf";
import type { BotContext, BotSession } from "../session";
import { getNow } from "~/utils";
import { prisma } from "~/db";
import fs from "node:fs";
import moment from "jalali-moment";

const LastJobFilePath = "./lastJob.db.txt";
const JobTimeFormat = "YYYY-MM-DD HH:mm:ss";
const ReminderJobTimeout = 1 * 60_000;
const JobsTimeDiff = 1 * 60_000;

export async function runReminderJob(bot: Telegraf<BotContext>) {
	const lastRunJobTimeStr = await new Promise<string | undefined>(
		(res, rej) => {
			fs.readFile(LastJobFilePath, (err, data) => {
				if (err) {
					res(undefined);
				} else {
					//todo: test regex data
					res(data.toString());
				}
			});
		},
	);
	const { now } = getNow();
	const time = now.format("HH:mm");
	const beforeDiff = now.clone().subtract(JobsTimeDiff / 1000, "seconds");

	const ensureLastRunJobTime = lastRunJobTimeStr
		? moment.from(lastRunJobTimeStr, "en", JobTimeFormat)
		: beforeDiff;

	const diff = now.diff(ensureLastRunJobTime);
	if (diff < JobsTimeDiff) {
		//* run job after remained time
		setTimeout(() => runReminderJob(bot), JobsTimeDiff - Math.max(diff, 0));
		return;
	}

	const lastRunJobTimeFormatted = ensureLastRunJobTime.format("HH:mm");

	prisma.user
		.findMany({
			//todo: add lastRemindedTime for each user and check it instead of this remind time
			where: { reminderTime: { gt: lastRunJobTimeFormatted, lte: time } },
		})
		.then((users) => {
			//todo: add smart reminder (do not send if already record today)

			const message =
				"<b>⏰ یادآور ثبت پیاده‌روی امروز 🚶‍♂️🚶‍♀️</b>" +
				"\n\n" +
				'کاربر گرامی با مراجعه به قسمت "ثبت پیاده‌روی امروز" در بات، همراه با بقیه اعضا کمپین (در رسیدن به ماه 🌙) مشارکت کنید! 😁' + "\n\n"+ "";

			users.forEach((user) => {
				const uid = user.uid.toString();
				bot.telegram
					.sendMessage(uid, message, { parse_mode: "HTML" })
					.then((res) => {
						console.log(`reminder message successfully sent to ${uid}`, res);
					})
					.catch((err) => {
						console.error(`reminder sendMessage error for ${uid}`, err);
					});
			});
			fs.writeFile(LastJobFilePath, now.format(JobTimeFormat), (err) => {
				if (err) {
					console.error("write lastJobFile", time, "ERROR:", err);
				}
			});
		})
		.catch((error) => {
			console.error("cant find users for time", time, "ERROR:", error);
		})
		.finally(() => {
			setTimeout(() => runReminderJob(bot), ReminderJobTimeout);
		});
}
