import moment from "jalali-moment";
import { prisma } from "~/db";
import { digitsToEmoji, digitsToHindi, toMoneyFormat } from "~/utils";

export async function getMyStatusReport(uid: number) {
	const user = await prisma.user.findUnique({
		where: { uid },
		include: { walks: { orderBy: { date: "asc" } } },
	});
	if (!user) {
		return null;
	}
	if (!user.walks.length) {
		return "شما تا اکنون رکوردی ثبت نکردید.";
	}

	const status = user.walks
		.map((walk, index) => {
			//! careful it returns utc time
			const dataMoment = moment.from(walk.date, "en", "YYYY-MM-DD");
			const dataMomentStr = digitsToHindi(
				dataMoment.locale("fa").format("jDD jMMMM"),
			);
			const statusEmoji = getStatusEmoji(walk.count);

			const indexStr = (index + 1).toString().split("").reverse().join("");
			return `${digitsToEmoji(indexStr)} ${dataMomentStr}\n🔸تعداد قدم‌ها: ${digitsToHindi(toMoneyFormat(walk.count.toString()))} ${statusEmoji}`;
		})
		.join("\n\n");

	const totalCount = user.walks.reduce(
		(prev, current) => prev + current.count,
		0,
	);
	const totalCountStr = digitsToHindi(toMoneyFormat(totalCount.toString()));

	const totalDaysCountStr = digitsToHindi(user.walks.length.toString());

	const averageCountStr = digitsToHindi(
		toMoneyFormat(Math.trunc(totalCount / user.walks.length).toString()),
	);

	const totalsMessage = `شما در طول <b>${totalDaysCountStr} روز</b>:\n📈 در مجموع <b>${totalCountStr} قدم</b> پیاده‌روی داشته اید.\n📉 به طور میانگین روزانه <b>${averageCountStr} قدم</b> پیاده‌روی کرده اید.`;

	const message = `📊وضعیت شما در ماه گذشته:\n\n${status}\n\n${totalsMessage}`;
	return message;
}

const emojis = [
	"😑",
	"😐",
	"☹️",
	"🙁",
	"😔",
	"😶",
	"🙂",
	"😄",
	"😃",
	"😎",
	"😎👌",
	"💪👌",
	"💪💯",
	"💪🎉💯",
];
function getStatusEmoji(count: number) {
	if (count < 0) return emojis[0];
	const index = Math.trunc(count / 1000);
	if (index >= emojis.length) {
		return emojis[emojis.length - 1];
	}
	return emojis[index];
}
