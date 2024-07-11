import { createElement } from "./utils.ts";

let edit_mode_toggle = document.getElementById(
	"edit-mode-toggle"
) as HTMLInputElement;
const EDITABLE = {
	text: ["p", "h1", "h2", "h3", "h4", "h5", "h6"],
	image: ["img"],
	video: ["video"],
	iframe: ["iframe"],
	audio: ["audio"],
	link: ["a"],
};
const HANDLERS = {
	text: (element: HTMLElement, menu, menuWidth: number) => {
		element.setAttribute("contenteditable", "true");
		let position = element.getBoundingClientRect();
		menu.style.left =
			String(position.left + position.width / 2 - menuWidth / 2) + "px";
		menu.style.top = String(position.bottom + 10) + "px";
		menu.style.display = "flex";
		document.body.appendChild(menu);
		element.focus();
		let blur = () => {
			element.style.border = "none";
			menu.style.display = "none";
			element.setAttribute("contenteditable", "false");
		};
		element.addEventListener(
			"blur",
			() => {
				blur();
			},
			{ once: true }
		);
	},
	image: (element) => {},
	video: (element) => {},
	iframe: (element) => {},
	audio: (element) => {},
	link: (element) => {},
};
window.addEventListener("load", () => {
	for (let type in EDITABLE) {
		for (let tag of EDITABLE[type]) {
			let elements = Array.from(document.getElementsByTagName(tag));
			for (let element of elements) {
				let menu = createTextEditMenu();
				menu.style.display = "none";
				let menuWidth = menu.getBoundingClientRect().width;
				element.addEventListener("click", () => {
					if (edit_mode_toggle.checked)
						HANDLERS[type](element, menu, menuWidth);
				});
			}
		}
	}
});

function createTextEditMenu() {
	let menu = createElement("menu", {
		classes: ["editor-menu"],
		children: [
			{
				tag: "div",
				classes: [
					"color-picker-wrapper",
					"menu-item-wrapper",
					"menu-item-round",
				],
				children: [
					{
						tag: "input",
						attributes: { type: "color" },
						classes: ["color-picker"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-box"],
				children: [
					{
						tag: "span",
						classes: ["font-selector", "menu-item"],
						text: "Aa",
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-box"],
				children: [
					{
						tag: "span",
						classes: ["font-size-selector", "menu-item"],
						text: "20",
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "span",
						classes: ["bold-toggle", "menu-item"],
						text: "B",
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "span",
						classes: ["strikethrough-toggle", "menu-item"],
						text: "S",
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "span",
						classes: ["underline-toggle", "menu-item"],
						text: "U",
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: { src: "/static/media/image/icon/Align Icon.svg" },
						classes: ["text-align-toggle", "menu-item"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: {
							src: "/static/media/image/icon/Bullet Point Icon.svg",
						},
						classes: ["bullet-point-toggle", "menu-item"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: { src: "/static/media/image/icon/link.svg" },
						classes: ["link-button", "menu-item"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: { src: "/static/media/image/icon/Copy.svg" },
						classes: ["copy-button", "menu-item"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: { src: "/static/media/image/icon/trash.svg" },
						classes: ["delete-button", "menu-item"],
					},
				],
			},
			{
				tag: "div",
				classes: ["menu-item-wrapper", "hover-menu", "menu-item-round"],
				children: [
					{
						tag: "img",
						attributes: { src: "/static/media/image/icon/ellipsis.svg" },
						classes: ["options-button", "hover-menu__text"],
					},
					{
						tag: "menu",
						classes: ["hover-menu__content", "menu-bar", "vertical"],
						children: [
							{ tag: "li", classes: ["hover-menu__item"], text: "Item 0" },
							{ tag: "li", classes: ["hover-menu__item"], text: "Item 1" },
							{ tag: "li", classes: ["hover-menu__item"], text: "Item 2" },
						],
					},
				],
			},
		],
	});

	document.body.appendChild(menu);
	return menu;
}

export { createTextEditMenu };
