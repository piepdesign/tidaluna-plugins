// Mood vocabulary built on "flavors", not genre buckets. Every genre is mapped
// individually to a handful of flavor tags (energetic, dark, dreamy, danceable…)
// via keyword rules, so distinct genres stay distinct: "deep house" and
// "hardstyle" no longer collapse to one "electronic" pool. A mix aggregates the
// flavors of its genres (weighted by how dominant each genre is), and the name is
// drawn from the pools of its top flavors. Unknown genres are handled by the same
// keyword rules (genre names usually carry their mood: "…core" -> aggressive,
// "dark …" -> dark, "dream …" -> dreamy), so the plugin works for any taste, not
// just a curated list.

export interface Vocab {
	adjectives: string[];
	nouns: string[];
}

// Each flavor owns a distinct pool. Words are single lower-case tokens. Pools are
// intentionally large (≈16 adjectives / ≈11 nouns) so that libraries dominated by
// one flavor still get varied names instead of colliding on the same few words.
// Genre-label words ("electronic", "synthetic") are kept out of the adjectives —
// they read as tags, not moods.
const FLAVORS: Record<string, Vocab> = {
	energetic: {
		adjectives: ["restless", "kinetic", "frantic", "surging", "hyper", "relentless", "electric", "breakneck", "feverish", "wired", "turbocharged", "pumping", "unstoppable", "blazing", "spry", "adrenal"],
		nouns: ["surge", "rush", "sprint", "charge", "blaze", "riot", "jolt", "dynamo", "thrill", "uproar", "overdrive"],
	},
	mellow: {
		adjectives: ["mellow", "easy", "gentle", "soft", "laidback", "unhurried", "hushed", "drowsy", "breezy", "serene", "placid", "lazy", "cushiony", "calm", "tranquil", "languid"],
		nouns: ["lull", "calm", "drift", "hush", "glow", "haze", "breeze", "siesta", "cocoon", "stillness", "afterglow"],
	},
	dark: {
		adjectives: ["shadowy", "nocturnal", "brooding", "murky", "sinister", "midnight", "grim", "cold", "ominous", "dusky", "obsidian", "haunted", "bleak", "smoldering", "unlit", "eerie"],
		nouns: ["shadow", "abyss", "nightfall", "void", "eclipse", "murk", "gloom", "crypt", "nightmare", "ashes", "underworld"],
	},
	bright: {
		adjectives: ["sunlit", "radiant", "glowing", "luminous", "vivid", "gleaming", "bright", "sparkling", "dazzling", "sunny", "beaming", "aglow", "incandescent", "shining", "candlelit", "flaring"],
		nouns: ["sunrise", "glow", "sparkle", "daylight", "beam", "shimmer", "flare", "halo", "dawn", "glimmer", "sunbeam"],
	},
	warm: {
		adjectives: ["warm", "honeyed", "golden", "cozy", "tender", "amber", "sunbaked", "plush", "balmy", "toasty", "snug", "sunny", "glowing", "welcoming", "roasted", "fond"],
		nouns: ["hearth", "honey", "amber", "embrace", "ember", "glow", "blanket", "sunset", "cocoa", "warmth", "campfire"],
	},
	cold: {
		adjectives: ["icy", "glacial", "frostbitten", "chrome", "steely", "wintry", "stark", "frozen", "arctic", "brittle", "crystalline", "numb", "polar", "frigid", "biting", "hoary"],
		nouns: ["frost", "glacier", "tundra", "chill", "ice", "sleet", "permafrost", "blizzard", "snowfall", "frostbite", "winter"],
	},
	dreamy: {
		adjectives: ["dreamy", "hazy", "floating", "weightless", "ethereal", "faded", "blurred", "distant", "gauzy", "otherworldly", "sleepy", "misty", "wispy", "drifting", "lucid", "softfocus"],
		nouns: ["reverie", "haze", "cloud", "daze", "drift", "mirage", "slumber", "fog", "dreamland", "lull", "trance"],
	},
	aggressive: {
		adjectives: ["brutal", "savage", "ferocious", "pummeling", "snarling", "vicious", "blistering", "molten", "merciless", "punishing", "feral", "raging", "thunderous", "ruthless", "seething", "jagged"],
		nouns: ["onslaught", "assault", "warpath", "fury", "wreckage", "rampage", "carnage", "havoc", "blitz", "maelstrom", "inferno"],
	},
	retro: {
		adjectives: ["retro", "vintage", "dusty", "throwback", "analog", "nostalgic", "worn", "faded", "oldschool", "sepia", "timeworn", "classic", "bygone", "yesteryear", "grainy", "aged"],
		nouns: ["flashback", "jukebox", "vinyl", "memory", "reel", "cassette", "polaroid", "throwback", "yesteryear", "tapedeck", "gramophone"],
	},
	futuristic: {
		adjectives: ["futuristic", "cybernetic", "holographic", "neon", "warped", "chrome", "sleek", "bionic", "astral", "interstellar", "luminescent", "hyperreal", "orbital", "quantum", "gleaming", "voltaic"],
		nouns: ["circuit", "hologram", "android", "voltage", "uplink", "machine", "cyberspace", "starship", "alloy", "grid", "nebula"],
	},
	organic: {
		adjectives: ["earthy", "woody", "rootsy", "handmade", "acoustic", "rustic", "weathered", "homespun", "natural", "mossy", "sunbaked", "grainy", "unplugged", "raw", "wholesome", "loamy"],
		nouns: ["hearth", "meadow", "timber", "roots", "harvest", "grain", "orchard", "driftwood", "soil", "thicket", "riverbank"],
	},
	synthetic: {
		adjectives: ["glitchy", "buzzing", "neon", "chrome", "wired", "metallic", "warped", "hyperreal", "prismatic", "plasticine", "voltaic", "gleaming", "pixelated", "circuited", "laser", "digital"],
		nouns: ["circuit", "synth", "pixel", "static", "wire", "signal", "waveform", "glitch", "feedback", "motherboard", "modem"],
	},
	romantic: {
		adjectives: ["romantic", "sultry", "tender", "longing", "swoony", "velvet", "moonlit", "lovestruck", "yearning", "amorous", "wistful", "starry", "dreamy", "aching", "flushed", "smitten"],
		nouns: ["swoon", "valentine", "embrace", "whisper", "longing", "rose", "serenade", "heartbeat", "candlelight", "blush", "moonlight"],
	},
	gritty: {
		adjectives: ["gritty", "raw", "rough", "scrappy", "grimy", "rugged", "unpolished", "coarse", "grungy", "ragged", "weathered", "dusty", "battered", "worn", "abrasive", "flinty"],
		nouns: ["grit", "gravel", "dust", "scuff", "grind", "rubble", "sandpaper", "asphalt", "soot", "scrapyard", "backalley"],
	},
	danceable: {
		adjectives: ["strutting", "bouncy", "groovy", "swaying", "funky", "hipshaking", "snappy", "springy", "sashaying", "wiggly", "jiving", "shimmying", "footloose", "boppy", "swinging", "twirling"],
		nouns: ["groove", "bounce", "strut", "boogie", "shuffle", "floor", "sashay", "jive", "twirl", "hustle", "sway"],
	},
	hypnotic: {
		adjectives: ["hypnotic", "pulsing", "looping", "entrancing", "spiraling", "trancelike", "steady", "mesmeric", "undulating", "droning", "cyclic", "tidal", "throbbing", "rippling", "swaying", "orbiting"],
		nouns: ["pulse", "loop", "spiral", "trance", "current", "hum", "vortex", "undertow", "cadence", "drone", "throb"],
	},
	epic: {
		adjectives: ["sweeping", "towering", "cinematic", "grand", "monumental", "vast", "heroic", "colossal", "majestic", "thunderous", "sovereign", "boundless", "soaring", "regal", "titanic", "storied"],
		nouns: ["overture", "summit", "horizon", "colossus", "crescendo", "saga", "monolith", "odyssey", "expanse", "coronation", "citadel"],
	},
	playful: {
		adjectives: ["playful", "giddy", "cheeky", "bubbly", "whimsical", "quirky", "sprightly", "jaunty", "goofy", "sunny", "mischievous", "perky", "chirpy", "frisky", "zany", "peppy"],
		nouns: ["romp", "confetti", "frolic", "caper", "bounce", "giggle", "jamboree", "tickle", "prank", "carousel", "hopscotch"],
	},
	melancholic: {
		adjectives: ["melancholic", "wistful", "aching", "forlorn", "bittersweet", "lonesome", "mournful", "tearful", "somber", "wintry", "plaintive", "hollow", "gloomy", "downcast", "yearning", "heavyhearted"],
		nouns: ["ache", "lament", "longing", "dusk", "sorrow", "rain", "farewell", "requiem", "heartbreak", "drizzle", "solitude"],
	},
	lush: {
		adjectives: ["lush", "plush", "velvety", "opulent", "saturated", "rich", "cushioned", "silky", "sumptuous", "verdant", "dense", "blooming", "creamy", "gilded", "layered", "downy"],
		nouns: ["velvet", "bloom", "canopy", "silk", "cascade", "garden", "tapestry", "brocade", "thicket", "orchard", "nectar"],
	},
	psychedelic: {
		adjectives: ["psychedelic", "swirling", "kaleidoscopic", "warped", "trippy", "melting", "liquid", "prismatic", "hallucinatory", "fractal", "wobbly", "iridescent", "morphing", "dizzy", "hazed", "cosmic"],
		nouns: ["kaleidoscope", "swirl", "prism", "vortex", "mirage", "ripple", "fractal", "phantasm", "lava", "spiral", "afterimage"],
	},
	eclectic: {
		adjectives: ["eclectic", "restless", "curious", "offbeat", "motley", "wandering", "mercurial", "vivid", "freewheeling", "kaleidoscopic", "unpredictable", "shapeshifting", "roaming", "spirited", "quixotic", "patchwork"],
		nouns: ["mosaic", "medley", "spectrum", "patchwork", "blend", "current", "kaleidoscope", "tapestry", "crosscurrent", "jumble", "grabbag"],
	},
};

// Genre -> flavors. ACCUMULATIVE: a genre is tested against every rule and picks
// up the flavors of each rule it matches, so it can carry several tags. Keyword
// based on purpose, so it also classifies genres not seen before. Word boundaries
// keep short tokens from over-matching.
const FLAVOR_RULES: Array<[RegExp, string[]]> = [
	[/metal|metalcore|deathcore/, ["aggressive", "dark", "epic"]],
	[/death|black|thrash|doom|grind|slam|brutal/, ["aggressive", "dark", "gritty"]],
	[/punk|grunge|\bgarage rock\b/, ["raw", "gritty", "energetic"]],
	[/hardstyle|gabber|happy hardcore|hard ?core|gabba|rawstyle|frenchcore|speedcore/, ["aggressive", "energetic", "synthetic"]],
	[/\bhouse\b/, ["danceable", "hypnotic", "warm"]],
	[/techno|\btech\b/, ["hypnotic", "synthetic", "dark"]],
	[/trance|psytrance|goa|uplifting/, ["hypnotic", "futuristic", "energetic"]],
	[/\bedm\b|big room|electro house|festival|complextro/, ["energetic", "synthetic", "danceable"]],
	[/dubstep|brostep|riddim|bass music|drum ?and ?bass|\bdnb\b|jungle|breakbeat|neurofunk|hardwave/, ["aggressive", "energetic", "synthetic"]],
	[/future bass|melodic dubstep|chillstep/, ["bright", "synthetic", "dreamy"]],
	[/synthwave|vaporwave|retrowave|outrun|chillwave/, ["retro", "synthetic", "dreamy"]],
	[/ambient|\bdrone\b|new age/, ["dreamy", "mellow", "cold"]],
	[/chill|lo-?fi|lofi|downtempo|trip.?hop/, ["mellow", "dreamy", "warm"]],
	[/dream pop|shoegaze|ethereal|slowcore/, ["dreamy", "lush", "mellow"]],
	[/trap|drill|phonk/, ["dark", "aggressive", "futuristic"]],
	[/\brap\b|hip.?hop|boom bap|grime/, ["gritty", "danceable", "dark"]],
	[/g-funk|west coast/, ["warm", "danceable", "retro"]],
	[/\bfunk\b|funky|\bboogie\b|p-funk/, ["danceable", "playful", "retro"]],
	[/\bdisco\b/, ["danceable", "retro", "playful"]],
	[/soul|neo.?soul|motown|r&b|\brnb\b|quiet storm/, ["warm", "romantic", "mellow"]],
	[/afrobeat|afrobeats|amapiano|\bafro\b|highlife/, ["warm", "danceable", "bright"]],
	[/jazz|bebop|\bswing\b|big band|\bfusion\b|dixieland/, ["mellow", "romantic", "warm"]],
	[/\bblues\b/, ["melancholic", "raw", "warm"]],
	[/\bfolk\b|acoustic|americana|country|bluegrass|singer.?songwriter|celtic/, ["organic", "warm", "melancholic"]],
	[/classical|orchestr|baroque|symphon|opera|\bscore\b|soundtrack|cinematic|requiem|chamber/, ["epic", "lush", "dreamy"]],
	[/reggae|\bdub\b|\bska\b|dancehall|rocksteady/, ["warm", "mellow", "danceable"]],
	[/latin|salsa|samba|bossa|reggaeton|cumbia|bachata|merengue|mariachi|flamenco|sertanejo|forr/, ["warm", "danceable", "playful"]],
	[/gospel|worship|spiritual/, ["warm", "epic", "bright"]],
	[/\bpop\b|pop$/, ["bright", "playful", "danceable"]],
	[/indie|alternative/, ["melancholic", "warm", "dreamy"]],
	[/experimental|avant|noise|\bidm\b|glitch|deconstructed/, ["futuristic", "gritty", "psychedelic"]],
	[/psychedelic|\bacid\b|neo-?psych|krautrock/, ["psychedelic", "dreamy", "warm"]],
	[/gothic|goth|witch|industrial|darkwave|coldwave/, ["dark", "cold", "aggressive"]],
	[/bubblegum|kawaii|kidcore|nightcore/, ["playful", "bright", "energetic"]],
	[/hyperpop|glitchpop|pc music/, ["energetic", "synthetic", "playful"]],
	[/\bemo\b|sad|midwest/, ["melancholic", "raw", "dreamy"]],
	[/world|ethnic|traditional/, ["organic", "warm", "epic"]],
	// Broader coverage for tastes that don't overlap the ones above. Still keyword
	// based, so it generalises rather than hard-coding a full genre list.
	[/k-?pop|j-?pop|c-?pop|mandopop|cantopop|city pop/, ["bright", "playful", "danceable"]],
	[/schlager|volksmusik|polka|chanson|folk pop/, ["warm", "playful", "retro"]],
	[/tango|milonga/, ["romantic", "melancholic", "warm"]],
	[/fado|bolero|ranchera|copla/, ["melancholic", "romantic", "warm"]],
	[/opera|operatic|choral|cantata|oratorio|aria/, ["epic", "lush", "romantic"]],
	[/marching|brass band|fanfare|military band/, ["epic", "bright", "energetic"]],
	[/celtic|irish|nordic folk|viking/, ["organic", "epic", "warm"]],
	[/bhangra|bollywood|desi|filmi|punjabi/, ["danceable", "bright", "warm"]],
	[/gqom|kwaito|afro ?house|amapiano/, ["danceable", "hypnotic", "warm"]],
	[/mbalax|soukous|highlife|makossa|afropop/, ["danceable", "warm", "bright"]],
	[/enka|min'?yo|shibuya/, ["melancholic", "warm", "retro"]],
	[/cumbia|vallenato|banda|norteno|corrido|mariachi|ranchera/, ["warm", "danceable", "playful"]],
	[/klezmer|balkan|gypsy|romani|manele/, ["playful", "melancholic", "organic"]],
	[/qawwali|sufi|ghazal|nasheed/, ["epic", "romantic", "dreamy"]],
	[/gamelan|raga|carnatic|hindustani|sitar/, ["dreamy", "organic", "hypnotic"]],
	[/flamenco|rumba|sevillanas/, ["energetic", "warm", "romantic"]],
	[/vaporwave|mallsoft|future funk|barber beats/, ["retro", "dreamy", "synthetic"]],
	[/screamo|post-?hardcore|mathcore/, ["aggressive", "raw", "melancholic"]],
	[/math ?rock|post-?rock|slowcore/, ["dreamy", "epic", "gritty"]],
	[/prog|progressive/, ["epic", "psychedelic", "hypnotic"]],
	[/surf|rockabilly|doo-?wop/, ["retro", "playful", "energetic"]],
	[/electro|synth|electronic|\bdance\b/, ["synthetic", "danceable", "energetic"]],
];

// Some purely descriptive words appear inside genre names and reliably signal a
// mood even when the genre itself is unknown. Checked in addition to the rules.
const KEYWORD_HINTS: Array<[RegExp, string]> = [
	[/dark|black|doom|evil/, "dark"],
	[/dream|ethereal|celestial|angel/, "dreamy"],
	[/hard|core|heavy|brutal|power/, "aggressive"],
	[/chill|calm|sleep|soft|smooth/, "mellow"],
	[/party|club|dance|floor/, "danceable"],
	[/sad|cry|blue|melanchol|lonely/, "melancholic"],
	[/retro|vintage|old ?school|classic/, "retro"],
	[/future|cyber|space|hyper|neon/, "futuristic"],
	[/love|romantic|sensual/, "romantic"],
	[/happy|sunny|bright|feel ?good/, "bright"],
	[/tropical|summer|beach|island/, "warm"],
	[/epic|cinematic|orchestral|anthemic/, "epic"],
];

// Flavor keys usable as a fallback (everything except the generic "eclectic").
const FALLBACK_FLAVORS = Object.keys(FLAVORS).filter((k) => k !== "eclectic");

// Deterministic string hash (djb2) — same genre name always yields the same
// number, so an unknown genre maps to a stable, repeatable flavor.
const hashStr = (s: string): number => {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
	return h >>> 0;
};

/**
 * Flavors for a single genre. Known/keyword-bearing genres map via the rules and
 * hints above. A genre that matches NOTHING (a regional or niche style with no
 * English mood cue — "schlager", "gqom", "enka") still gets two flavors derived
 * deterministically from its own name, so every listener's genres contribute
 * something and no one is stuck on generic filler. Not mood-accurate for those,
 * but stable per genre and distinct between genres.
 */
const flavorsOfGenre = (genre: string): string[] => {
	const g = genre.toLowerCase();
	const out: string[] = [];
	for (const [re, flavors] of FLAVOR_RULES) if (re.test(g)) for (const f of flavors) if (!out.includes(f)) out.push(f);
	for (const [re, flavor] of KEYWORD_HINTS) if (re.test(g) && !out.includes(flavor)) out.push(flavor);
	if (out.length === 0) {
		const h = hashStr(g);
		const a = FALLBACK_FLAVORS[h % FALLBACK_FLAVORS.length];
		let b = FALLBACK_FLAVORS[Math.floor(h / 31) % FALLBACK_FLAVORS.length];
		if (b === a) b = FALLBACK_FLAVORS[(FALLBACK_FLAVORS.indexOf(a) + 1) % FALLBACK_FLAVORS.length];
		out.push(a, b);
	}
	return out;
};

/**
 * Ranks the mix's flavors. Each genre contributes its flavors weighted by how
 * dominant the genre is (earlier in the ranked list = heavier), and a flavor's
 * position within a genre also counts (first-listed flavor is that genre's
 * strongest). Returns flavors strongest-first.
 */
export function flavorsForGenres(genres: string[]): string[] {
	const score = new Map<string, number>();
	genres.slice(0, 6).forEach((genre, gi) => {
		const genreWeight = 6 - gi; // 6,5,4,…
		flavorsOfGenre(genre).forEach((flavor, fi) => {
			const w = genreWeight * (3 - Math.min(fi, 2)); // flavor position 0/1/2 -> ×3/×2/×1
			score.set(flavor, (score.get(flavor) ?? 0) + w);
		});
	});
	return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
}

export interface NamePools {
	adj1: string[]; // dominant flavor's adjectives
	adj2: string[]; // second flavor's adjectives (dominant's if there's only one)
	nouns: string[]; // dominant flavor's nouns
}

/**
 * Word pools for the name: adjective 1 from the mix's dominant flavor, adjective
 * 2 from its second flavor (so the pair reflects the blend), the noun from the
 * dominant flavor. Falls back to "eclectic" only when NO flavor could be derived.
 */
export function poolsForGenres(genres: string[]): NamePools {
	const flavors = flavorsForGenres(genres);
	const primary = flavors[0] ?? "eclectic";
	const secondary = flavors[1] ?? primary;
	return { adj1: FLAVORS[primary].adjectives, adj2: FLAVORS[secondary].adjectives, nouns: FLAVORS[primary].nouns };
}
