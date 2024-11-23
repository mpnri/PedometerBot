declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV?: string;
			BOT_TOKEN?: string;
			GROUP_IDs?: string;
			GROUP_JOB_TIME?: string;
			BA_IDs?: string;
		}
	}
}

export {};
