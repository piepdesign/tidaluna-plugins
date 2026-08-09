// Emoji cover generator. Pure, no TIDAL/DOM dependencies beyond a canvas, so it
// is trivially testable and shared by both the playlist and the folder path.
//
// Produces a square cover: a solid background color with one emoji centered on
// top, large. Output either as a data URL (for instant preview / localStorage
// folder covers) or as a Blob (for the TIDAL playlist cover upload).

export type EmojiCover = { emoji: string; bg: string };

/** Default rendition size. 640 is plenty for the largest playlist header. */
export const COVER_SIZE = 640;

/** Draws the cover into a fresh canvas and returns it. */
function draw(cover: EmojiCover, size: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2D canvas context unavailable");

	// Background fill.
	ctx.fillStyle = cover.bg;
	ctx.fillRect(0, 0, size, size);

	// Emoji, centered. The font stack covers macOS, Windows and Linux color-emoji
	// fonts; whichever exists on the host renders. textBaseline "middle" plus a
	// tiny downward nudge counters the fact that emoji glyphs sit slightly high.
	const emoji = cover.emoji.trim() || "🎵";
	ctx.font = `${Math.round(size * 0.6)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(emoji, size / 2, size / 2 + size * 0.03);

	return canvas;
}

/** PNG data URL, e.g. for <img src> preview and folder covers in localStorage. */
export function renderEmojiDataUrl(cover: EmojiCover, size = COVER_SIZE): string {
	return draw(cover, size).toDataURL("image/png");
}

/** PNG Blob, e.g. for uploading as a TIDAL playlist cover. */
export function renderEmojiBlob(cover: EmojiCover, size = COVER_SIZE): Promise<Blob> {
	return new Promise((resolve, reject) => {
		draw(cover, size).toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
	});
}

/** Reads a user-picked image File into a square-ish data URL (no re-encoding). */
export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

/** Converts any data URL to a Blob (for the upload path when an image was picked). */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
	const res = await fetch(dataUrl);
	return res.blob();
}
