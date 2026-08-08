// Minimal self-contained right-click menu (no dependency on TIDAL's menu API).

export type MenuItem = {
	label: string;
	danger?: boolean;
	onClick: () => void;
};

let openMenu: HTMLElement | null = null;

const close = (): void => {
	openMenu?.remove();
	openMenu = null;
	document.removeEventListener("mousedown", onOutside, true);
	document.removeEventListener("keydown", onKey, true);
	window.removeEventListener("blur", close);
};

const onOutside = (e: Event): void => {
	if (openMenu && !openMenu.contains(e.target as Node)) close();
};
const onKey = (e: KeyboardEvent): void => {
	if (e.key === "Escape") close();
};

export function openContextMenu(x: number, y: number, items: MenuItem[]): void {
	close();

	const menu = document.createElement("div");
	menu.className = "pl-menu";

	for (const item of items) {
		const el = document.createElement("div");
		el.className = "pl-menu-item" + (item.danger ? " pl-menu-danger" : "");
		el.textContent = item.label;
		el.onclick = (e) => {
			e.stopPropagation();
			close();
			item.onClick();
		};
		menu.appendChild(el);
	}

	// Position, then clamp into the viewport.
	menu.style.left = `${x}px`;
	menu.style.top = `${y}px`;
	document.body.appendChild(menu);
	const rect = menu.getBoundingClientRect();
	if (rect.right > window.innerWidth) menu.style.left = `${Math.max(0, x - rect.width)}px`;
	if (rect.bottom > window.innerHeight) menu.style.top = `${Math.max(0, y - rect.height)}px`;

	openMenu = menu;
	document.addEventListener("mousedown", onOutside, true);
	document.addEventListener("keydown", onKey, true);
	window.addEventListener("blur", close);
}
