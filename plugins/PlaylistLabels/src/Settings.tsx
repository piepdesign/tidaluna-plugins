import React, { useCallback, useEffect, useState } from "react";
import { LunaSettings, LunaSwitchSetting } from "@luna/ui";

import {
	excludeFolder,
	getExcluded,
	getExcludedFolders,
	includeFolder,
	includePlaylist,
	isFolderExcluded,
	onExcludedChange,
} from "./excluded";
import { folderNames, onFoldersChange } from "./folders";

const KEY = "playlist-labels:show-all";

/** Module-wide, synchronously readable settings (used by index.ts). */
export const settings = {
	showAll: localStorage.getItem(KEY) === "true",
};

const listeners = new Set<() => void>();
/** index.ts registers a redraw here so changes take effect immediately. */
export const onSettingsChange = (cb: () => void): void => {
	listeners.add(cb);
};

const rowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "6px 0",
	borderBottom: "1px solid rgba(255,255,255,0.08)",
};
const nameStyle: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 };
const btnStyle: React.CSSProperties = {
	cursor: "pointer",
	background: "transparent",
	border: "1px solid currentColor",
	borderRadius: 4,
	padding: "3px 10px",
	color: "inherit",
	flex: "0 0 auto",
};

export const Settings = () => {
	const [showAll, setShowAll] = useState(settings.showAll);
	const [excluded, setExcluded] = useState(getExcluded());
	const [excludedFolders, setExcludedFolders] = useState(getExcludedFolders());
	const [folders, setFolders] = useState<[string, string][]>([...folderNames]);

	useEffect(() => {
		onExcludedChange(() => {
			setExcluded(getExcluded());
			setExcludedFolders(getExcludedFolders());
		});
		onFoldersChange(() => setFolders([...folderNames]));
	}, []);

	const onChange = useCallback((_: unknown, checked: boolean) => {
		settings.showAll = checked;
		setShowAll(checked);
		localStorage.setItem(KEY, String(checked));
		listeners.forEach((cb) => cb());
	}, []);

	const playlistEntries = Object.entries(excluded);
	const sortedFolders = [...folders].sort((a, b) => a[1].localeCompare(b[1]));

	return (
		<LunaSettings>
			<LunaSwitchSetting
				title="Show all saved playlists"
				desc="Also label followed playlists, not only your own."
				checked={showAll}
				onChange={onChange}
			/>

			<div style={{ marginTop: 16 }}>
				<div style={{ fontWeight: 600, marginBottom: 4 }}>Exclude folders</div>
				<div style={{ opacity: 0.7, fontSize: 13, marginBottom: 8 }}>
					Hides every playlist inside a folder. Loaded when you first open a tracklist.
				</div>
				{sortedFolders.length === 0 ? (
					<div style={{ opacity: 0.6, fontSize: 13 }}>No folders loaded yet.</div>
				) : (
					sortedFolders.map(([id, name]) => {
						const off = isFolderExcluded(id);
						return (
							<div key={id} style={rowStyle}>
								<span style={{ ...nameStyle, opacity: off ? 0.5 : 1 }}>{name}</span>
								<button style={btnStyle} onClick={() => (off ? includeFolder(id) : excludeFolder(id, name))}>
									{off ? "Show" : "Hide"}
								</button>
							</div>
						);
					})
				)}
			</div>

			<div style={{ marginTop: 16 }}>
				<div style={{ fontWeight: 600, marginBottom: 4 }}>Hidden playlists</div>
				<div style={{ opacity: 0.7, fontSize: 13, marginBottom: 8 }}>
					Right-click a cover in the tracklist and choose “Hide” to add it here.
				</div>
				{playlistEntries.length === 0 ? (
					<div style={{ opacity: 0.6, fontSize: 13 }}>None hidden.</div>
				) : (
					playlistEntries.map(([id, title]) => (
						<div key={id} style={rowStyle}>
							<span style={nameStyle}>{title || id}</span>
							<button style={btnStyle} onClick={() => includePlaylist(id)}>
								Show again
							</button>
						</div>
					))
				)}
			</div>
		</LunaSettings>
	);
};
