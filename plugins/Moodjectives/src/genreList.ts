// Curated genre whitelist. Last.fm's crowd tags are noisy (fan in-jokes, place
// names, "best of 2025", artist names), so we only keep tags that match a real
// genre on this list. Everything is compared lowercase. Shared shape with the
// Tidal Genres plugin — extend it when a legitimate genre gets filtered out.

export const GENRE_WHITELIST = new Set<string>([
	// Umbrella
	"pop", "rock", "hip hop", "hip-hop", "rap", "electronic", "electronica", "dance",
	"jazz", "blues", "classical", "country", "folk", "metal", "punk", "reggae",
	"soul", "funk", "r&b", "rnb", "rhythm and blues", "world", "latin", "ambient",
	"experimental", "instrumental", "acoustic", "indie", "alternative", "singer-songwriter",
	"soundtrack", "score", "gospel", "spoken word", "new age", "disco", "house",
	"techno", "trance", "dubstep", "drum and bass", "drum n bass", "dnb", "garage",
	"grime", "trap", "edm", "downtempo", "trip hop", "trip-hop", "lo-fi", "lofi",

	// Pop
	"synth-pop", "synthpop", "electropop", "dance-pop", "dream pop", "power pop",
	"art pop", "indie pop", "k-pop", "j-pop", "britpop", "teen pop", "chamber pop",
	"baroque pop", "sophisti-pop", "hyperpop", "bubblegum pop", "brazilian pop",
	"latin pop", "pop rock", "pop punk", "bedroom pop",

	// Rock
	"classic rock", "hard rock", "soft rock", "indie rock", "alternative rock",
	"progressive rock", "prog rock", "psychedelic rock", "garage rock", "art rock",
	"post-rock", "math rock", "surf rock", "blues rock", "folk rock", "country rock",
	"southern rock", "glam rock", "gothic rock", "krautrock", "grunge", "shoegaze",
	"new wave", "post-punk", "emo", "arena rock", "stoner rock", "noise rock",

	// Metal
	"heavy metal", "death metal", "black metal", "thrash metal", "doom metal",
	"power metal", "progressive metal", "nu metal", "metalcore", "deathcore",
	"groove metal", "folk metal", "symphonic metal", "gothic metal", "sludge metal",
	"speed metal", "industrial metal", "melodic death metal", "hardcore", "post-hardcore",

	// Electronic
	"deep house", "tech house", "progressive house", "electro house", "future house",
	"afro house", "melodic house", "melodic techno", "acid house", "acid techno",
	"minimal techno", "detroit techno", "hardstyle", "hardcore techno", "gabber",
	"breakbeat", "big beat", "idm", "glitch", "electro", "eurodance", "future bass",
	"bass house", "bassline", "uk garage", "future garage", "2-step", "jungle",
	"liquid dnb", "neurofunk", "chillout", "chillwave", "vaporwave", "synthwave",
	"darkwave", "ebm", "industrial", "moombahton", "nightcore", "phonk", "witch house",
	"club", "footwork", "juke", "tropical house", "progressive trance", "psytrance",
	"goa trance", "uplifting trance",

	// Hip hop / rap
	"boom bap", "trap music", "trap edm", "drill", "uk drill", "conscious hip hop",
	"gangsta rap", "west coast hip hop", "east coast hip hop", "southern hip hop",
	"cloud rap", "emo rap", "mumble rap", "lo-fi hip hop", "jazz rap", "g-funk",
	"crunk", "hyphy", "pop rap", "party rap", "hip house", "old school hip hop",

	// R&B / soul / funk
	"neo-soul", "neo soul", "contemporary r&b", "motown", "northern soul",
	"quiet storm", "new jack swing", "funk carioca", "p-funk", "boogie", "afrobeat",
	"afrobeats", "afropop", "amapiano",

	// Jazz / blues
	"smooth jazz", "bebop", "swing", "big band", "cool jazz", "free jazz", "fusion",
	"jazz fusion", "nu jazz", "acid jazz", "hard bop", "vocal jazz", "dixieland",
	"delta blues", "chicago blues", "electric blues",

	// Folk / country / americana
	"americana", "bluegrass", "alt-country", "outlaw country", "folk pop", "indie folk",
	"contemporary folk", "traditional folk", "celtic", "singer songwriter", "roots",
	"honky tonk", "country pop", "folk punk",

	// Reggae / caribbean
	"dancehall", "dub", "ska", "rocksteady", "roots reggae", "reggaeton", "soca",
	"calypso", "mento", "ragga",

	// Latin
	"salsa", "bachata", "merengue", "cumbia", "tango", "bossa nova", "samba", "mpb",
	"forró", "forro", "sertanejo", "pagode", "axé", "axe", "tropicália", "tropicalia",
	"latin jazz", "latin rock", "flamenco", "mariachi", "ranchera", "bolero",
	"latin trap", "corridos", "regional mexican",

	// World / regional
	"world music", "afro", "highlife", "soukous", "raï", "rai", "fado", "klezmer",
	"balkan", "gypsy jazz", "bhangra", "bollywood", "k-indie", "city pop", "enka",
	"gamelan", "qawwali", "celtic folk", "nordic folk",

	// Moods / textures often used as genres
	"chill", "atmospheric", "cinematic", "minimal", "drone", "post-metal",
	"industrial rock", "space rock", "dark ambient", "ethereal",
]);
