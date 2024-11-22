export async function inlineErrorHandler<T>(
	promise: Promise<T>,
): Promise<[T, undefined] | [undefined, unknown]> {
	try {
		const value = await promise;
		return [value, undefined];
	} catch (error) {
		return [undefined, error];
	}
}
