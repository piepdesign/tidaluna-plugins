// Our own cover-editing modal, built from plain DOM (no dependency on TIDAL's
// React modal, which changes between updates). Two tabs:
//   - "Change image" : pick an image file.
//   - "Emoji"        : background color (RGB values + hex + eyedropper) plus a
//                      pickable emoji, composited live into a preview.
//
// Resolves with the chosen cover as a data URL (preview/localStorage) plus a
// Blob factory (upload), or null if cancelled.

import "emoji-picker-element"; // registers the <emoji-picker> custom element (all emojis, grouped, searchable)
import Database from "emoji-picker-element/database.js"; // same emoji DB the picker uses, for the random emoji
import { createCropper } from "./cropper";
import { fileToDataUrl, renderEmojiBlob, renderEmojiDataUrl } from "./emoji";

export type CoverResult = {
	dataUrl: string;
	toBlob: () => Promise<Blob>;
};

type Options = {
	title: string;
	initialEmoji?: string;
	initialBg?: string;
	/** Emoji tab only (no image tab) — used inside TIDAL's native playlist modal, where images use the native flow. */
	emojiOnly?: boolean;
};

// --- color helpers ---
const clamp255 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (r: number, g: number, b: number): string =>
	"#" + [r, g, b].map((n) => clamp255(n).toString(16).padStart(2, "0")).join("");
const rand255 = (): number => Math.floor(Math.random() * 256); // uniform 0–255
const randomHex = (): string => toHex(rand255(), rand255(), rand255());

// Small fallback pool, only used until the full emoji DB has loaded.
const FALLBACK_EMOJIS = [
	"🎵", "🎶", "🎧", "🔥", "✨", "⭐", "🌈", "❤️", "😎", "🥳", "👑", "💎", "🚀", "🦄", "🐉", "🦋", "🎨", "🎬", "☕", "🍕",
];

type EmojiEntry = { unicode?: string; skins?: Array<{ tone?: number; unicode?: string }> };

// The complete emoji set (full objects, so skin-tone variants are available),
// loaded once from the same database the picker uses (emojibase groups, the
// "component"/skin-tone group 2 excluded). Preloaded on import so it's ready by
// the time a modal opens; falls back to the small pool if not.
let allEmojis: EmojiEntry[] = [];
// Currently selected skin tone (0 = default/none, 1–5 light→dark). Seeded from the
// picker's persisted preference, then kept in sync via its skin-tone-change event.
let currentSkinTone = 0;

void (async () => {
	try {
		const db = new Database() as unknown as {
			getEmojiByGroup(group: number): Promise<EmojiEntry[]>;
			getPreferredSkinTone(): Promise<number>;
		};
		currentSkinTone = (await db.getPreferredSkinTone().catch(() => 0)) || 0;
		const collected: EmojiEntry[] = [];
		for (const group of [0, 1, 3, 4, 5, 6, 7, 8, 9]) {
			const list = await db.getEmojiByGroup(group).catch(() => []);
			for (const e of list) if (e?.unicode) collected.push(e);
		}
		if (collected.length) allEmojis = collected;
	} catch {
		/* keep fallback */
	}
})();

const randomEmoji = (): string => {
	if (!allEmojis.length) return FALLBACK_EMOJIS[Math.floor(Math.random() * FALLBACK_EMOJIS.length)];
	const e = allEmojis[Math.floor(Math.random() * allEmojis.length)];
	if (currentSkinTone && e.skins) {
		const toned = e.skins.find((s) => s.tone === currentSkinTone)?.unicode;
		if (toned) return toned;
	}
	return e.unicode ?? FALLBACK_EMOJIS[0];
};
const parseHex = (hex: string): [number, number, number] | null => {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return null;
	const int = parseInt(m[1], 16);
	return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const hasEyeDropper = (): boolean => typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper === "function";

export function openCoverModal(opts: Options): Promise<CoverResult | null> {
	return new Promise((resolve) => {
		let result: CoverResult | null = null;
		let done = false;

		const finish = (value: CoverResult | null): void => {
			if (done) return;
			done = true;
			document.removeEventListener("focusin", reclaimFocus, true);
			if (dlg.open) dlg.close();
			dlg.remove();
			resolve(value);
		};

		// Keep focus inside the dialog for its whole lifetime. Whatever opened us
		// (the folder "⋯" menu, or the still-open native playlist-edit modal) can
		// hand focus back to its own trigger asynchronously after we've shown; a
		// one-off refocus would lose that race, so we watch document-wide and
		// reclaim focus whenever it lands outside the dialog while it's open.
		const reclaimFocus = (): void => {
			if (!dlg.open) return;
			if (dlg.contains(document.activeElement)) return;
			dlg.focus();
		};

		// A native <dialog> in the top layer, so it stacks ABOVE TIDAL's own
		// <dialog> (z-index can't beat the top layer; only another dialog can).
		const dlg = document.createElement("dialog");
		dlg.className = "cc-overlay";
		dlg.addEventListener("click", (e) => {
			if (e.target === dlg) finish(null); // backdrop click
		});
		dlg.addEventListener("cancel", (e) => {
			e.preventDefault(); // ESC
			finish(null);
		});
		// TIDAL has a global "type to search" key listener that would steal our
		// keystrokes (its check misses inputs inside the emoji-picker's shadow DOM).
		// Stop key events from bubbling out of our modal.
		for (const type of ["keydown", "keyup", "keypress"]) {
			dlg.addEventListener(type, (e) => e.stopPropagation());
		}

		const modal = document.createElement("div");
		modal.className = "cc-modal";
		dlg.appendChild(modal);

		modal.innerHTML = `
			<div class="cc-head">
				<span class="cc-title"></span>
				<button class="cc-x" title="Close">✕</button>
			</div>
			<div class="cc-tabs">
				<button class="cc-tab cc-tab-active" data-tab="image">Image</button>
				<button class="cc-tab" data-tab="emoji">Emoji</button>
			</div>
			<div class="cc-body">
				<div class="cc-preview"><img class="cc-preview-img" alt="Preview"/></div>
				<div class="cc-pane cc-pane-image">
					<label class="cc-file-btn">Choose image<input type="file" accept="image/*" hidden/></label>
					<div class="cc-crop-container" hidden></div>
					<div class="cc-crop-tools" hidden>
						<button type="button" class="cc-crop-tool" data-act="rotate" title="Rotate">↻</button>
						<button type="button" class="cc-crop-tool" data-act="flip" title="Flip">⇋</button>
						<button type="button" class="cc-crop-tool" data-act="center" title="Center">⌖</button>
					</div>
				</div>
				<div class="cc-pane cc-pane-emoji" hidden>
					<div class="cc-row">
						<input type="color" class="cc-color"/>
						<input type="text" class="cc-hex" maxlength="7" spellcheck="false"/>
						<button class="cc-pipette" title="Pick color from screen">🎯</button>
						<button class="cc-random" title="Random color">🎲</button>
					</div>
					<div class="cc-row cc-rgb">
						<label>R<input type="number" min="0" max="255" class="cc-r"/></label>
						<label>G<input type="number" min="0" max="255" class="cc-g"/></label>
						<label>B<input type="number" min="0" max="255" class="cc-b"/></label>
					</div>
					<emoji-picker class="cc-emoji-picker dark"></emoji-picker>
				</div>
			</div>
			<div class="cc-foot">
				<button class="cc-cancel">Cancel</button>
				<button class="cc-save">Save</button>
			</div>`;

		const $ = <T extends Element>(sel: string): T => modal.querySelector<T>(sel) as T;
		$(".cc-title").textContent = opts.title;
		const previewImg = $<HTMLImageElement>(".cc-preview-img");
		const saveBtn = $<HTMLButtonElement>(".cc-save");

		// --- tabs ---
		const panes: Record<string, HTMLElement> = { image: $(".cc-pane-image"), emoji: $(".cc-pane-emoji") };
		let activeTab: "image" | "emoji" = "image";
		modal.querySelectorAll<HTMLButtonElement>(".cc-tab").forEach((tab) => {
			tab.onclick = () => {
				activeTab = tab.dataset.tab as "image" | "emoji";
				modal.querySelectorAll(".cc-tab").forEach((t) => t.classList.toggle("cc-tab-active", t === tab));
				for (const [name, pane] of Object.entries(panes)) pane.hidden = name !== activeTab;
				refresh();
			};
		});

		// Emoji-only mode: drop the tab bar and the image pane entirely.
		if (opts.emojiOnly) {
			$<HTMLElement>(".cc-tabs").style.display = "none";
			panes.image.remove();
			activeTab = "emoji";
			panes.emoji.hidden = false;
		}

		// --- image tab (with square crop, like TIDAL's native flow) ---
		const cropHost = modal.querySelector<HTMLElement>(".cc-crop-container");
		const cropper = cropHost ? createCropper(cropHost) : null;
		cropper?.onChange(() => refresh());
		const cropTools = modal.querySelector<HTMLElement>(".cc-crop-tools");
		cropTools?.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
			b.onclick = async () => {
				if (b.dataset.act === "rotate") await cropper!.rotate();
				else if (b.dataset.act === "flip") await cropper!.flip();
				else cropper!.center();
			};
		});
		const fileInput = modal.querySelector<HTMLInputElement>(".cc-pane-image input[type=file]");
		if (fileInput && cropHost) fileInput.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			cropHost.hidden = false; // unhide first so the viewport has a measurable width
			if (cropTools) cropTools.hidden = false;
			await cropper!.setImage(await fileToDataUrl(file));
			refresh();
		};

		// --- emoji tab: color (starts on a random color unless one was passed in) ---
		let bg = opts.initialBg && parseHex(opts.initialBg) ? opts.initialBg : randomHex();
		const colorInput = $<HTMLInputElement>(".cc-color");
		const hexInput = $<HTMLInputElement>(".cc-hex");
		const rInput = $<HTMLInputElement>(".cc-r");
		const gInput = $<HTMLInputElement>(".cc-g");
		const bInput = $<HTMLInputElement>(".cc-b");

		const syncColorInputs = (): void => {
			const rgb = parseHex(bg) ?? [235, 64, 52];
			colorInput.value = bg;
			hexInput.value = bg;
			rInput.value = String(rgb[0]);
			gInput.value = String(rgb[1]);
			bInput.value = String(rgb[2]);
		};
		const setBg = (next: string): void => {
			const rgb = parseHex(next);
			if (!rgb) return;
			bg = toHex(rgb[0], rgb[1], rgb[2]);
			syncColorInputs();
			refresh();
		};
		colorInput.oninput = () => setBg(colorInput.value);
		hexInput.onchange = () => setBg(hexInput.value);
		const onRgb = (): void => setBg(toHex(+rInput.value, +gInput.value, +bInput.value));
		rInput.oninput = gInput.oninput = bInput.oninput = onRgb;

		const pipette = $<HTMLButtonElement>(".cc-pipette");
		if (!hasEyeDropper()) pipette.hidden = true;
		pipette.onclick = async () => {
			try {
				const ed = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
				setBg((await ed.open()).sRGBHex);
			} catch {
				/* cancelled */
			}
		};

		// --- emoji tab: full grouped, searchable emoji picker ---
		let emoji = opts.initialEmoji ?? randomEmoji();
		// The 🎲 button randomises both the background color AND the emoji.
		$<HTMLButtonElement>(".cc-random").onclick = () => {
			emoji = randomEmoji();
			setBg(randomHex()); // also triggers refresh()
		};
		const picker = $<HTMLElement>(".cc-emoji-picker");
		// Hide the bottom "favorites/recent" bar (no official option; style the shadow root).
		const hideFavorites = (): void => {
			const root = (picker as unknown as { shadowRoot?: ShadowRoot }).shadowRoot;
			if (!root) {
				requestAnimationFrame(hideFavorites);
				return;
			}
			const s = document.createElement("style");
			s.textContent = ".favorites { display: none !important; }";
			root.appendChild(s);
		};
		hideFavorites();
		picker.addEventListener("emoji-click", (ev: Event) => {
			const detail = (ev as CustomEvent<{ unicode?: string }>).detail;
			if (detail?.unicode) {
				emoji = detail.unicode;
				refresh();
			}
		});
		// Keep the random emoji's skin tone in sync with the picker's tone selector.
		picker.addEventListener("skin-tone-change", (ev: Event) => {
			const tone = (ev as CustomEvent<{ skinTone?: number }>).detail?.skinTone;
			if (typeof tone === "number") currentSkinTone = tone;
		});

		// --- live preview + result ---
		const previewEl = $<HTMLElement>(".cc-preview");
		function refresh(): void {
			if (activeTab === "image") {
				// The cropper is the preview here; the image is rendered on save.
				result = null;
				previewEl.style.display = "none";
				saveBtn.disabled = !cropper?.hasImage();
			} else {
				const cover = { emoji, bg };
				result = { dataUrl: renderEmojiDataUrl(cover), toBlob: () => renderEmojiBlob(cover) };
				previewEl.style.display = "";
				previewImg.src = result.dataUrl;
				previewImg.style.visibility = "visible";
				saveBtn.disabled = false;
			}
		}

		$<HTMLButtonElement>(".cc-x").onclick = () => finish(null);
		$<HTMLButtonElement>(".cc-cancel").onclick = () => finish(null);
		saveBtn.onclick = () => {
			if (activeTab === "image") {
				if (!cropper?.hasImage()) return;
				const canvas = cropper.toCanvas();
				finish({
					dataUrl: canvas.toDataURL("image/png"),
					toBlob: () => new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")),
				});
			} else {
				finish(result);
			}
		};

		syncColorInputs();
		refresh();
		document.body.appendChild(dlg);
		dlg.showModal();
		document.addEventListener("focusin", reclaimFocus, true);
		reclaimFocus();
	});
}
