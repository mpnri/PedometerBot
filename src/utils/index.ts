import moment, { type Moment } from "jalali-moment";

export const isDevelopmentMode = () => process.env.NODE_ENV === "development";

const hindiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const digitsToHindi = (number?: string): string => {
	return number?.replace(/[0-9]/g, (w) => hindiDigits[+w]) ?? "";
};

const persianNumbers = [
	/۰/g,
	/۱/g,
	/۲/g,
	/۳/g,
	/۴/g,
	/۵/g,
	/۶/g,
	/۷/g,
	/۸/g,
	/۹/g,
];
const arabicNumbers = [
	/٠/g,
	/١/g,
	/٢/g,
	/٣/g,
	/٤/g,
	/٥/g,
	/٦/g,
	/٧/g,
	/٨/g,
	/٩/g,
];

export const digitsToLatin = (inputNumber: string): string => {
	let result = inputNumber;
	if (typeof result === "string") {
		new Array(10).fill(0).map((e, index) => {
			result = result
				.replace(persianNumbers[index], String(index))
				.replace(arabicNumbers[index], String(index));
		});
	}
	return result;
};

const digitEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export const digitsToEmoji = (inputString: string): string => {
	let result = "";
	inputString.split("").forEach((char, index) => {
		if (!Number.isNaN(+char) && 0 <= +char && +char <= 9) {
			result += digitEmojis[+char];
		} else {
			result += char;
		}
	});
	return result;
};

export function toMoneyFormat(value: string): string {
	const v = value.replace(/,/g, "");
	if (!v) return "";
	if (v.length < 3) return v;
	return v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

/**
 ** Iran Time
 * @returns **nowDate:** `format("YYYY-MM-DD")`
 */
export function getNow() {
	const now = toIranMoment(moment());
	const nowDate = () => now.format("YYYY-MM-DD");

	const nowJalali = now.clone().locale("fa");
	const nowDateJalali = () => nowJalali.format("YYYY-MM-DD");
	return { now, nowDate, nowJalali, nowDateJalali };
}

export function toIranMoment(moment: Moment) {
	return moment.utc().utcOffset(3.5);
}

export class Mutex {
	private _locking: Promise<void>;

	private _locks: number;

	constructor() {
		this._locking = Promise.resolve();
		this._locks = 0;
	}

	isLocked() {
		return this._locks > 0;
	}

	lock() {
		this._locks += 1;

		let unlockNext: () => void;

		const willLock = new Promise<void>((resolve) => {
			unlockNext = () => {
				this._locks -= 1;
				resolve();
			};
		});

		const willUnlock = this._locking.then(() => unlockNext);

		this._locking = this._locking.then(() => willLock);

		return willUnlock;
	}
}

export { FeatureFlag, isFeatureFlagActive } from "./feature";
export { inlineErrorHandler } from "./error";

const reminderFormat = /^[0-9][0-9]:[0-9][0-9]$/;
export const checkIsReminderFormat = (value: string) =>
	reminderFormat.test(value);
