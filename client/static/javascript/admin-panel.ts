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
interface Command {
	command_type: string;
	command_target: HTMLElement;
	value?: any;
	previousState?: any;
	input?: HTMLElement;
}
let commandStack: Command[] = [];
let undid: Command[] = [];
const HANDLERS = {
	text: (element: HTMLElement) => {
		element.setAttribute("contenteditable", "true");
		element.focus();
		element.style.outline = "1px solid blue";
		currentlyEditing = element;
		textEditMenu.style.display = "flex";
		element.focus();
		let resizeHandler = () => {
			let menuBoundingRect = textEditMenu.getBoundingClientRect();
			let elementBoundingRect = element.getBoundingClientRect();
			textEditMenu.style.left =
				String(
					elementBoundingRect.left +
						elementBoundingRect.width / 2 -
						menuBoundingRect.width / 2
				) + "px";
			textEditMenu.style.top = String(elementBoundingRect.bottom + 10) + "px";
		};
		let previousText = element.innerText;
		let inputHandler = (event: InputEvent) => {
			commandStack.push({
				command_type: "change-text",
				command_target: element,
				value: element.innerText,
				previousState: previousText,
				input: element,
			});
			previousText = element.innerText;
		};
		resizeHandler();
		const resizeObserver = new ResizeObserver((entries) => {
			requestAnimationFrame(resizeHandler);
		});
		resizeObserver.observe(element);
		element.addEventListener("input", inputHandler);
		element.addEventListener(
			"inactive",
			() => {
				resizeObserver.unobserve(element);
				resizeObserver.disconnect();
				element.removeEventListener("input", inputHandler);
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
	window.addEventListener("keydown", (event) => {
		if (
			event.key === "z" &&
			(event.ctrlKey || event.metaKey) &&
			commandStack.length > 0
		) {
			event.preventDefault();
			let command: Command;
			if (event.shiftKey) {
				if (undid.length <= 0) return;
				command = undid.pop();
				redo(command);
			} else {
				command = commandStack.pop();
				undo(command);
				undid.push(command);
			}
			let targetBoundingBox = command.command_target.getBoundingClientRect();
			command.command_target.click();
			command.command_target.focus();
			window.scrollTo({
				left: targetBoundingBox.left,
				top: targetBoundingBox.top,
			});
		}
	});
});
function undo(command: Command) {
	if (command.command_type === "change-text-color") {
		command.command_target.style.color = command.previousState;
	} else if (command.command_type === "change-text-size") {
		command.command_target.style.fontSize = command.previousState;
	} else if (command.command_type === "change-text-decoration") {
		command.command_target.style.textDecoration = command.previousState;
	} else if (command.command_type === "change-font-weight") {
		command.command_target.style.fontWeight = command.previousState;
	} else if (command.command_type === "change-text-align") {
		command.command_target.style.textAlign = command.previousState;
	} else if (command.command_type === "change-text") {
		command.command_target.innerText = command.previousState;
	}
}
function redo(command: Command) {
	if (command.command_type === "change-text-color") {
		command.command_target.style.color = command.value;
	} else if (command.command_type === "change-text-size") {
		command.command_target.style.fontSize = command.value;
	} else if (command.command_type === "change-text-decoration") {
		command.command_target.style.textDecoration = command.value;
	} else if (command.command_type === "change-font-weight") {
		command.command_target.style.fontWeight = command.value;
	} else if (command.command_type === "change-text-align") {
		command.command_target.style.textAlign = command.value;
	} else if (command.command_type === "change-text") {
		command.command_target.innerText = command.value;
	}
}
function isPointInRect(point: { x: number; y: number }, rect: DOMRect) {
	return (
		point.x >= rect.left &&
		point.x <= rect.right &&
		point.y >= rect.top &&
		point.y <= rect.bottom
	);
}
function convertToHex(color: string) {
	const rgbMatch = color.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
	if (rgbMatch) {
		const [, r, g, b] = rgbMatch.map(Number);
		return rgbToHex(r, g, b);
	}

	// Check for HEX format
	const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	if (hexMatch) {
		return `#${hexMatch[1]}${hexMatch[2]}${hexMatch[3]}`.toLowerCase();
	}

	// Check for 3-digit HEX format
	const hexShortMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
	if (hexShortMatch) {
		return `#${hexShortMatch[1]}${hexShortMatch[1]}${hexShortMatch[2]}${hexShortMatch[2]}${hexShortMatch[3]}${hexShortMatch[3]}`.toLowerCase();
	}
}
function componentToHex(c) {
	const hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
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
								let previousState = convertToHex(
									window.getComputedStyle(currentlyEditing).color
								);
								let newValue = event.target.value;
								currentlyEditing.style.color = newValue;
								let command_target = currentlyEditing;
								commandStack.push({
									command_type: "change-text-color",
									command_target,
									value: newValue,
									previousState,
									input: event.target,
								});
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
							value: "32",
							step: "0.5",
							inputmode: "numeric",
						},
						classes: ["font-size-selector", "menu-item"],
						text: "20",
					},
				],
				eventHandlers: {
					input(event) {
						let previousState =
							window.getComputedStyle(currentlyEditing).fontSize;
						currentlyEditing.style.fontSize = event.target.value + "px";
						commandStack.push({
							command_type: "change-font-size",
							command_target: currentlyEditing,
							value: event.target.value,
							previousState,
							input: event.target,
						});
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
						let previousFontWeight =
							window.getComputedStyle(currentlyEditing).fontWeight;
						currentlyEditing.style.fontWeight =
							previousFontWeight == "700" ? "400" : "700";
						commandStack.push({
							command_type: "change-font-weight",
							command_target: currentlyEditing,
							value: currentlyEditing.style.fontWeight,
							previousState: previousFontWeight,
							input: event.target,
						});
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
						let previousTextDecoration =
							window.getComputedStyle(currentlyEditing).textDecoration;
						let newValue = "";
						if (previousTextDecoration.includes("underline"))
							newValue += "underline";
						if (!previousTextDecoration.includes("line-through"))
							newValue += " line-through";
						currentlyEditing.style.textDecoration = newValue;
						commandStack.push({
							command_type: "change-text-decoration",
							command_target: currentlyEditing,
							value: currentlyEditing.style.textDecoration,
							previousState: previousTextDecoration,
							input: event.target,
						});
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
						let previousTextDecoration =
							window.getComputedStyle(currentlyEditing).textDecoration;
						let newValue = "";
						if (!previousTextDecoration.includes("underline"))
							newValue += "underline";
						if (previousTextDecoration.includes("line-through"))
							newValue += " line-through";
						currentlyEditing.style.textDecoration = newValue;
						commandStack.push({
							command_type: "change-text-decoration",
							command_target: currentlyEditing,
							value: currentlyEditing.style.textDecoration,
							previousState: previousTextDecoration,
							input: event.target,
						});
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
						let previousTextAlign =
							window.getComputedStyle(currentlyEditing).textAlign;
						if (previousTextAlign == "center") {
							currentlyEditing.style.textAlign = "right";
						} else if (previousTextAlign == "right") {
							currentlyEditing.style.textAlign = "left";
						} else currentlyEditing.style.textAlign = "center";

						commandStack.push({
							command_type: "change-text-align",
							command_target: currentlyEditing,
							value: currentlyEditing.style.textAlign,
							previousState: previousTextAlign,
							input: event.target,
						});
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
						commandStack.push({
							command_type: "delete-element",
							command_target: currentlyEditing,
							input: event.target,
						});
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
