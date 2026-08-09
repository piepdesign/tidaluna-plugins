// Square image cropper for the folder image path, modelled on TIDAL's native
// crop: the whole image is shown (full width), with a centered square selection
// box (border + rule-of-thirds grid) and the area outside it dimmed. Drag to pan,
// slider to zoom, plus rotate / flip / center. toCanvas() renders exactly the
// square selection at full cover resolution.
//
// Rotate/flip bake the transform into a fresh source image and reload, so the
// pan/zoom/clamp math stays simple (always an axis-aligned image).

import { COVER_SIZE } from "./emoji";

export type Cropper = {
	setImage(src: string): Promise<void>;
	hasImage(): boolean;
	toCanvas(): HTMLCanvasElement;
	rotate(): Promise<void>;
	flip(): Promise<void>;
	center(): void;
	onChange(cb: () => void): void;
};

export function createCropper(container: HTMLElement): Cropper {
	container.classList.add("cc-crop");
	container.innerHTML = `<div class="cc-crop-view"><img class="cc-crop-img" draggable="false" alt=""/><div class="cc-crop-square"></div></div><input type="range" class="cc-crop-zoom" min="1" max="4" step="0.01" value="1"/>`;
	const view = container.querySelector<HTMLElement>(".cc-crop-view")!;
	const img = container.querySelector<HTMLImageElement>(".cc-crop-img")!;
	const square = container.querySelector<HTMLElement>(".cc-crop-square")!;
	const zoom = container.querySelector<HTMLInputElement>(".cc-crop-zoom")!;

	let natW = 0;
	let natH = 0;
	let base = 1;
	let scale = 1;
	let offX = 0;
	let offY = 0;
	let ready = false;
	const listeners = new Set<() => void>();
	const notify = (): void => listeners.forEach((cb) => cb());

	/** Current view + centered crop-square geometry (recomputed each use). */
	const geom = (): { vw: number; vh: number; sq: number; cl: number; ct: number } => {
		const vw = view.clientWidth || 400;
		const vh = view.clientHeight || 300;
		// Fill the view's full height: the square's outer border touches the top/bottom
		// edges of the dimmed area (like native), dimming only left/right.
		const sq = Math.max(40, Math.min(vw, vh));
		return { vw, vh, sq, cl: (vw - sq) / 2, ct: (vh - sq) / 2 };
	};

	const clamp = (): void => {
		const { sq, cl, ct } = geom();
		offX = Math.min(cl, Math.max(cl + sq - natW * scale, offX));
		offY = Math.min(ct, Math.max(ct + sq - natH * scale, offY));
	};

	const render = (): void => {
		const { sq, cl, ct } = geom();
		square.style.left = `${cl}px`;
		square.style.top = `${ct}px`;
		square.style.width = `${sq}px`;
		square.style.height = `${sq}px`;
		img.style.width = `${natW * scale}px`;
		img.style.height = `${natH * scale}px`;
		img.style.transform = `translate(${offX}px, ${offY}px)`;
	};

	const center = (): void => {
		const { vw, vh, sq } = geom();
		base = sq / Math.min(natW, natH); // smaller side just covers the square
		scale = base;
		zoom.value = "1";
		offX = (vw - natW * scale) / 2;
		offY = (vh - natH * scale) / 2;
		clamp();
		render();
		notify();
	};

	const load = (src: string): Promise<void> =>
		new Promise((resolve, reject) => {
			img.onload = () => {
				natW = img.naturalWidth;
				natH = img.naturalHeight;
				ready = true;
				center();
				resolve();
			};
			img.onerror = () => reject(new Error("image load failed"));
			img.src = src;
		});

	const bakeAndReload = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Promise<void> => {
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		const ctx = c.getContext("2d")!;
		draw(ctx);
		return load(c.toDataURL("image/png"));
	};

	zoom.oninput = () => {
		const { cl, ct, sq } = geom();
		const cx = cl + sq / 2;
		const cy = ct + sq / 2;
		const prev = scale;
		scale = base * parseFloat(zoom.value);
		const k = scale / prev;
		offX = cx - (cx - offX) * k;
		offY = cy - (cy - offY) * k;
		clamp();
		render();
		notify();
	};

	let dragging = false;
	let sx = 0;
	let sy = 0;
	view.addEventListener("pointerdown", (e) => {
		if (!ready) return;
		dragging = true;
		sx = e.clientX - offX;
		sy = e.clientY - offY;
		view.setPointerCapture(e.pointerId);
	});
	view.addEventListener("pointermove", (e) => {
		if (!dragging) return;
		offX = e.clientX - sx;
		offY = e.clientY - sy;
		clamp();
		render();
		notify();
	});
	const endDrag = (): void => {
		dragging = false;
	};
	view.addEventListener("pointerup", endDrag);
	view.addEventListener("pointercancel", endDrag);

	return {
		setImage: load,
		hasImage: () => ready,
		center,
		rotate: () => bakeAndReload(natH, natW, (ctx) => {
			ctx.translate(natH / 2, natW / 2);
			ctx.rotate(Math.PI / 2);
			ctx.drawImage(img, -natW / 2, -natH / 2);
		}),
		flip: () => bakeAndReload(natW, natH, (ctx) => {
			ctx.translate(natW, 0);
			ctx.scale(-1, 1);
			ctx.drawImage(img, 0, 0);
		}),
		toCanvas() {
			const { sq, cl, ct } = geom();
			const canvas = document.createElement("canvas");
			canvas.width = COVER_SIZE;
			canvas.height = COVER_SIZE;
			const ctx = canvas.getContext("2d")!;
			// Map the crop square (view coords) back to source-image coords.
			const ss = sq / scale;
			ctx.drawImage(img, (cl - offX) / scale, (ct - offY) / scale, ss, ss, 0, 0, COVER_SIZE, COVER_SIZE);
			return canvas;
		},
		onChange(cb) {
			listeners.add(cb);
		},
	};
}
