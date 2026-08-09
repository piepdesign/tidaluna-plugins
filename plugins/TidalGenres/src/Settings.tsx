import React, { useCallback, useState } from "react";
import { LunaSettings, LunaTextSetting } from "@luna/ui";

const KEY = "tidal-genres:lastfm-key";

/** Module-wide, synchronously readable settings (used by index.ts). */
export const settings = {
	lastFmKey: localStorage.getItem(KEY) ?? "",
};

const listeners = new Set<() => void>();
/** index.ts registers a refresh here so a new key takes effect immediately. */
export const onSettingsChange = (cb: () => void): void => {
	listeners.add(cb);
};

// LunaTextSetting's onChange may hand us an event or a raw string depending on
// the build — normalise both.
const readValue = (e: unknown): string => {
	if (typeof e === "string") return e;
	const target = (e as { target?: { value?: string } })?.target;
	return target?.value ?? "";
};

export const Settings = () => {
	const [key, setKey] = useState(settings.lastFmKey);

	const onChange = useCallback((e: unknown) => {
		const value = readValue(e).trim();
		settings.lastFmKey = value;
		setKey(value);
		localStorage.setItem(KEY, value);
		listeners.forEach((cb) => cb());
	}, []);

	return (
		<LunaSettings>
			<LunaTextSetting
				title="Last.fm API key"
				desc="Optional but recommended. Uses Last.fm's much larger genre database. Get a free key at last.fm/api/account/create, then paste the API key here. Leave empty to use MusicBrainz only."
				value={key}
				onChange={onChange}
			/>
		</LunaSettings>
	);
};
