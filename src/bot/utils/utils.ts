import { prisma } from "~/db";
import type { BotContext } from "../session";
import type { Telegraf } from "telegraf";
import { digitsToEmoji, digitsToHindi, toMoneyFormat } from "~/utils";

//* Average human stride in meter
const AverageHumanStride = 0.7;
const DistanceToMoon = 384_000_000;
const DistanceToOuterOfAtmosphere = 10_000_000;

export async function getTopMembers(
	bot: Telegraf<BotContext>,
	gID: number | string,
) {
	const users = await prisma.user.findMany({ include: { walks: true } });
	const sortedUsers = users.sort((user1, user2) => {
		const sum1 = user1.walks.reduce((prevSum, curr) => prevSum + curr.count, 0);
		const sum2 = user2.walks.reduce((prevSum, curr) => prevSum + curr.count, 0);

		return sum2 - sum1;
	});
	let topMessage = "";
	let index = 1;
	for (const user of sortedUsers) {
		try {
			const fullUser = await bot.telegram.getChatMember(
				gID,
				+user.uid.toString(),
			);
			const name =
				fullUser.user.first_name +
				(fullUser.user.last_name ? ` ${fullUser.user.last_name}` : "");
			const sum = user.walks.reduce((prevSum, curr) => prevSum + curr.count, 0);
			let rankStr = "";
			switch (index) {
				case 1:
					rankStr = "🥇";
					break;
				case 2:
					rankStr = "🥈";
					break;
				case 3:
					rankStr = "🥉";
					break;
			}
			const indexStr =
				index > 3
					? digitsToEmoji(index.toString().split("").reverse().join(""))
					: "";

			const walksCountStr = digitsToHindi(user.walks.length.toString());
			topMessage += `${rankStr}${indexStr} کاربر <b>${name}</b> با ${digitsToHindi(toMoneyFormat(sum.toString()))} قدم (${walksCountStr} روز)\n\n`;
			index++;
			if (index > 50) break;
		} catch (error) {
			console.log("getTopMembersError", error);
		}
	}

	const totalSum = users.reduce(
		(prevSum, curr) =>
			prevSum + curr.walks.reduce((prev, c) => prev + c.count, 0),
		0,
	);
	const totalCount = users.reduce(
		(prevCount, curr) => prevCount + curr.walks.length,
		0,
	);

	const totalSumStr = digitsToHindi(toMoneyFormat(totalSum.toString()));
	const totalAverageStr = digitsToHindi(
		toMoneyFormat(Math.trunc(totalSum / totalCount).toString()),
	);

	const topAndTotal = `📈برترین های این ماه:\n\n${topMessage}🚶‍♂️ تا این لحظه در مجموع <b>${totalSumStr} قدم</b> توسط اعضای این گروه طی شده‌است.\n🚶‍♀️ اعضای این گروه به طور متوسط روزانه <b>${totalAverageStr} قدم</b> را طی می‌کنند.`;

	const stridesLeftToMoon = Math.trunc(
		DistanceToMoon / AverageHumanStride - totalSum,
	);
	const stridesLeftToMoonStr =
		stridesLeftToMoon > 0
			? `🌙 فاصله باقی‌مانده تا ماه: <b>${digitsToHindi(toMoneyFormat(stridesLeftToMoon.toString()))} قدم</b>🔥🦶`
			: "🎉 تبریک به من، تبریک به تو، تبریک به اعضا گروه، تبریک به همه !!!\nبه ماه 🌙 رسیدیم 🔥🔥🔥";

	const stridesLeftToAtmosphere = Math.trunc(
		DistanceToOuterOfAtmosphere / AverageHumanStride - totalSum,
	);
	const stridesLeftToAtmosphereStr =
		stridesLeftToAtmosphere > 0
			? `🌏 فاصله باقی‌مانده تا خارج اتمسفر زمین: <b>${digitsToHindi(toMoneyFormat(stridesLeftToAtmosphere.toString()))} قدم</b>🔥🦶`
			: "🎉 تبریییییک!  از اتمسفر زمین 🌏 خارج شدیم 🔥🔥";

	const message = `${topAndTotal}\n\n${stridesLeftToMoonStr}\n\n${stridesLeftToAtmosphereStr}`;

	return message;
}
