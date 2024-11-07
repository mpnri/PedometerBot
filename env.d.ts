declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV?: string;
			BOT_TOKEN?: string;
		}
	}
}

export {};
