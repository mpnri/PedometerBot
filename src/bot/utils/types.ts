import type { Message as MessageTypes } from "telegraf/typings/core/types/typegram";

export function isTextMessage(
	message?: MessageTypes.ServiceMessage,
): message is MessageTypes.TextMessage {
	return !!message && "text" in message;
}

export function isLocationMessage(
	message?: MessageTypes.ServiceMessage,
): message is MessageTypes.LocationMessage {
	return !!message && "location" in message;
}
