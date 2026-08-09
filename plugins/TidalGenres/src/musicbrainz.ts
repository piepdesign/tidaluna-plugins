import { trace } from "./index.safe";

// Port of better-spotify-genres' src/api/musicbrainz.ts, hardened for TIDAL's
// fast track switching:
//  - results cached per key (recording id or "artist|title")
//  - failures (503 rate-limit, network) are NOT cached, so a throttled track
//    resolves on the next play instead of staying empty forever
//  - requests are serialized with a >=1.1s gap (MusicBrainz allows ~1 req/s)
//    and retried once on a 503

const cache = new Map<string, string[]>();

const MIN_GAP_MS = 1100;
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

/** Runs `fn` on a serialized queue that never fires faster than MIN_GAP_MS. */
function throttle<T>(fn: () => Promise<T>): Promise<T> {
	const run = async (): Promise<T> => {
		const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
		if (wait > 0) await new Promise((r) => setTimeout(r, wait));
		lastCall = Date.now();
		return fn();
	};
	const result = chain.then(run, run);
	chain = result.catch(() => undefined);
	return result;
}

/** GET JSON from MusicBrainz, retrying once after a pause on a 503. */
async function mbFetch(url: string): Promise<unknown> {
	const once = async (): Promise<Response> => throttle(() => fetch(url));
	let res = await once();
	if (res.status === 503) {
		await new Promise((r) => setTimeout(r, 1500));
		res = await once();
	}
	if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
	return res.json();
}

function tagsOf(recording: any): string[] {
	const recordingTags: string[] = (recording?.tags ?? []).map((t: { name: string }) => t.name);
	if (recordingTags.length > 0) return recordingTags;
	return (recording?.["artist-credit"]?.[0]?.artist?.tags ?? []).map((t: { name: string }) => t.name);
}

/** Genre/tags for a known MusicBrainz recording id — the accurate path when
 * TIDAL already resolved the recording (via MediaItem.brainzId()). */
export async function fetchTagsByRecordingId(id: string): Promise<string[]> {
	const key = `id:${id}`;
	const cached = cache.get(key);
	if (cached) return cached;
	try {
		const recording = await mbFetch(`https://musicbrainz.org/ws/2/recording/${id}?inc=tags+artists&fmt=json`);
		const tags = tagsOf(recording);
		cache.set(key, tags); // only cache successful lookups
		return tags;
	} catch (err) {
		trace.warn("MusicBrainz recording lookup failed (will retry next play).", err);
		return [];
	}
}

export async function fetchTagsFromMusicBrainz(artistName: string, trackName: string): Promise<string[]> {
	const key = `${artistName}|${trackName}`.toLowerCase();
	const cached = cache.get(key);
	if (cached) return cached;
	try {
		const search = new URL("https://musicbrainz.org/ws/2/recording?fmt=json&limit=1");
		search.searchParams.set("query", `recording:"${trackName}" AND artist:"${artistName}"`);
		const results = (await mbFetch(search.toString())) as { recordings?: Array<{ id: string }> };
		const recordingId = results?.recordings?.[0]?.id;
		if (!recordingId) {
			cache.set(key, []);
			return [];
		}
		const recording = await mbFetch(`https://musicbrainz.org/ws/2/recording/${recordingId}?inc=tags+artists&fmt=json`);
		const tags = tagsOf(recording);
		cache.set(key, tags);
		return tags;
	} catch (err) {
		trace.warn("MusicBrainz lookup failed (will retry next play).", err);
		return [];
	}
}
