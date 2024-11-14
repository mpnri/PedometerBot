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
	const totalSumStr = totalSum.toString();
	const topAndTotal = `📈برترین های این ماه:\n\n${topMessage}🚶‍♂️ تا این لحظه در مجموع ${digitsToHindi(toMoneyFormat(totalSumStr))} قدم توسط اعضای این گروه طی شده است.`;

	const stridesLeftToMoon = Math.trunc(
		DistanceToMoon / AverageHumanStride - totalSum,
	);
	const stridesLeftToMoonStr = `🌙 فاصله باقی‌مانده تا ماه: <b>${digitsToHindi(toMoneyFormat(stridesLeftToMoon.toString()))} قدم</b>🔥🦶`;

	const stridesLeftToAtmosphere = Math.trunc(
		DistanceToOuterOfAtmosphere / AverageHumanStride - totalSum,
	);
	const stridesLeftToAtmosphereStr = `🌏 فاصله باقی‌مانده تا خارج اتمسفر زمین: <b>${digitsToHindi(toMoneyFormat(stridesLeftToAtmosphere.toString()))} قدم</b>🔥🦶`;

	const message = `${topAndTotal}\n\n${stridesLeftToMoonStr}\n\n${stridesLeftToAtmosphereStr}`;

	return message;
}
