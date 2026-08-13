import { getCredentials, TidalApi } from "@luna/lib";
import { trace } from "./index.safe";

async function authHeaders(): Promise<Record<string, string>> {
	const { token, clientId } = await getCredentials();
	return { Authorization: `Bearer ${token}`, "x-tidal-token": clientId };
}

interface RawArtist {
	name?: string;
}
interface RawItem {
	item?: { artists?: RawArtist[]; artist?: RawArtist };
	artists?: RawArtist[];
	artist?: RawArtist;
}

/**
 * Fetches the artist names of a mix's current tracks, in track order (duplicates
 * kept — a mix leaning on one artist should weight that artist's genres more).
 *
 * VERIFY (TidaLuna is Beta, no official docs): the items endpoint below is the
 * first thing to check if names never change. Confirm the real URL + payload in
 * the TIDAL devtools Network tab while opening a mix, then adjust here.
 */
export async function fetchMixArtists(mixId: string): Promise<string[]> {
	try {
		const headers = await authHeaders();
		const q = TidalApi.queryArgs();
		const res = await fetch(`https://desktop.tidal.com/v1/mixes/${mixId}/items?limit=50&${q}`, { headers });
		if (!res.ok) {
			trace.warn(`Mix items fetch failed: ${res.status} (mix ${mixId})`);
			return [];
		}
		const data = (await res.json()) as { items?: RawItem[] };
		const items = data?.items ?? [];
		const names: string[] = [];
		for (const it of items) {
			const t = it.item ?? it;
			const arts = t.artists ?? (t.artist ? [t.artist] : []);
			for (const a of arts) if (a?.name) names.push(a.name);
		}
		return names;
	} catch (err) {
		trace.warn(`fetchMixArtists errored (mix ${mixId}).`, err);
		return [];
	}
}
