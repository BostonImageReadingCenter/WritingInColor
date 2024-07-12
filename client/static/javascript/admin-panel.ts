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
let textEditMenu: HTMLElement;
let currentlyEditing: HTMLElement;
const HANDLERS = {
	text: (element: HTMLElement) => {
		element.setAttribute("contenteditable", "true");
		element.focus();
		element.style.outline = "1px solid blue";
		currentlyEditing = element;
		textEditMenu.style.display = "flex";
		let menuBoundingRect = textEditMenu.getBoundingClientRect();
		let elementBoundingRect = element.getBoundingClientRect();
		console.log(menuBoundingRect, elementBoundingRect);
		textEditMenu.style.left =
			String(
				elementBoundingRect.left +
					elementBoundingRect.width / 2 -
					menuBoundingRect.width / 2
			) + "px";
		textEditMenu.style.top = String(elementBoundingRect.bottom + 10) + "px";
		element.focus();
		element.addEventListener(
			"inactive",
			() => {
				console.log("inactive");
				element.style.outline = "none";
				textEditMenu.style.display = "none";
				element.setAttribute("contenteditable", "false");
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
	textEditMenu = createTextEditMenu();
	textEditMenu.style.display = "none";
	for (let type in EDITABLE) {
		for (let tag of EDITABLE[type]) {
			let elements = Array.from(document.getElementsByTagName(tag));
			for (let element of elements) {
				element.addEventListener("click", () => {
					if (edit_mode_toggle.checked) HANDLERS[type](element);
				});
			}
		}
	}
	window.addEventListener("click", (event: PointerEvent) => {
		if (currentlyEditing) {
			let currentlyEditingBoundingRect =
				currentlyEditing.getBoundingClientRect();
			let textEditMenuBoundingRect = textEditMenu.getBoundingClientRect();
			if (
				!isPointInRect(
					{ x: event.clientX, y: event.clientY },
					currentlyEditingBoundingRect
				) &&
				!isPointInRect(
					{ x: event.clientX, y: event.clientY },
					textEditMenuBoundingRect
				)
			) {
				currentlyEditing.dispatchEvent(new CustomEvent("inactive"));
				currentlyEditing = null;
			}
		}
	});
});
function isPointInRect(point: { x: number; y: number }, rect: DOMRect) {
	return (
		point.x >= rect.left &&
		point.x <= rect.right &&
		point.y >= rect.top &&
		point.y <= rect.bottom
	);
}

function createTextEditMenu() {
	let menu = createElement("menu", {
		classes: ["editor-menu"],
		children: [
			{
				tag: "div",
				classes: [
					"color-picker-wrapper",
					"menu-item-wrapper",
					// "menu-item-round",
				],
				children: [
					{
						tag: "input",
						attributes: { type: "color" },
						classes: ["color-picker"],
						eventHandlers: {
							input(event) {
								console.log("color changed", event.target.value);
								currentlyEditing.style.color = event.target.value;
							},
						},
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
				classes: [
					"menu-item-wrapper",
					"menu-item-box",
					"font-size-selector-wrapper",
				],
				children: [
					{
						tag: "input",
						attributes: {
							type: "number",
							min: "1",
							max: "1000",
							value: "20",
							step: "0.5",
							inputmode: "numeric",
						},
						classes: ["font-size-selector", "menu-item"],
						text: "20",
					},
				],
				eventHandlers: {
					input(event) {
						currentlyEditing.style.fontSize = event.target.value + "px";
					},
				},
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
				eventHandlers: {
					click(event) {
						let currentFontWeight =
							window.getComputedStyle(currentlyEditing).fontWeight;
						currentlyEditing.style.fontWeight =
							currentFontWeight == "700" ? "400" : "700";
					},
				},
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
				eventHandlers: {
					click(event) {
						let currentTextDecoration =
							window.getComputedStyle(currentlyEditing).textDecoration;
						currentlyEditing.style.textDecoration =
							currentTextDecoration == "line-through" ? "none" : "line-through";
					},
				},
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
				eventHandlers: {
					click(event) {
						let currentTextDecoration =
							window.getComputedStyle(currentlyEditing).textDecoration;
						currentlyEditing.style.textDecoration =
							currentTextDecoration == "underline" ? "none" : "underline";
					},
				},
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
				eventHandlers: {
					click(event) {
						//TODO: SHOW OPTIONS
						let currentTextAlign =
							window.getComputedStyle(currentlyEditing).textAlign;
						currentlyEditing.style.textAlign =
							currentTextAlign == "left" ? "center" : "left";
					},
				},
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
				eventHandlers: {
					click(event) {
						currentlyEditing.dispatchEvent(new Event("inactive"));
						currentlyEditing.remove();
					},
				},
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
						classes: ["hover-menu__content", "right", "menu-bar", "vertical"],
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
