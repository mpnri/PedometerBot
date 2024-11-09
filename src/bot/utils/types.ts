import type {
	Message as MessageTypes,
	CallbackQuery as CallbackQueryTypes,
} from "telegraf/typings/core/types/typegram";

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

export function isDateQuery(
	callback_query?: CallbackQueryTypes.AbstractQuery,
): callback_query is CallbackQueryTypes.DataQuery {
	return !!callback_query && "data" in callback_query;
}
