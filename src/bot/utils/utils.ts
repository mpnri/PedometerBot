import { prisma } from "~/db";
import type { BotContext } from "../session";
import type { Telegraf } from "telegraf";
import { digitsToEmoji, digitsToHindi } from "~/utils";

export async function getTopMembers(bot: Telegraf<BotContext>, gID: number) {
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
					? digitsToEmoji(index.toString()).split("").reverse().join("")
					: "";
			topMessage += `${rankStr}${indexStr} کاربر ${name}: با ${digitsToHindi(sum.toString())} قدم\n\n`;
			index++;
			if (index > 50) break;
		} catch (error) {
			console.log("getTopMembersError", error);
		}
	}

	const totalSumStr = users
		.reduce(
			(prevSum, curr) =>
				prevSum + curr.walks.reduce((prev, c) => prev + c.count, 0),
			0,
		)
		.toString();
	const message = `📈برترین های این ماه:\n\n${topMessage}تا این لحظه در مجموع ${digitsToHindi(totalSumStr)} قدم توسط اعضای این گروه طی شده است.`;

	return message;
}
