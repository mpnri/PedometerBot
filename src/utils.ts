export const isDevelopmentMode = () => process.env.NODE_ENV === "development";

const hindiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const digitsToHindi = (number?: string): string => {
	return number?.replace(/[0-9]/g, (w) => hindiDigits[+w]) ?? "";
};

export function toMoneyFormat(value: string): string {
	const v = value.replace(/,/g, "");
	if (!v) return "";
	if (v.length < 3) return v;
	return v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
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
