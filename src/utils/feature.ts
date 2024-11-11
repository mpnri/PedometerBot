export enum FeatureFlag {
	RecordBeforeDate = "RecordBeforeDate",
}

export function isFeatureFlagActive(flagName: FeatureFlag, uID: number) {
	const flagValue = process.env[`${flagName}_FEATURE_FLAG`];
	if (flagValue === "all") return true;

	const allowedUIDs = flagValue?.split(",");
	return Boolean(allowedUIDs?.includes(uID.toString()));
}
