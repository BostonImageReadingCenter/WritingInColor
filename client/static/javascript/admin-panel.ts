import { createElement } from "./utils.ts";

let edit_mode_toggle = document.getElementById(
	"edit-mode-toggle"
) as HTMLInputElement;
let textEditMenu: HTMLElement;
let currentlyEditing: HTMLElement;

interface Command {
	command_type: string;
	command_target: HTMLElement;
	value?: any;
	previousState?: any;
	input?: HTMLElement;
}
let commandStack: Command[] = []; // Commands performed. This list is used for undo and redo operations.
let undid: Command[] = []; // Commands that were undone with ctrl+z

const selfClosingTags = [
	"area",
	"base",
	"br",
	"col",
	"command",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
];

function isOnlyTextNode(element: Element) {
	// Check if element is a node and has child nodes
	if (element.nodeType === Node.TEXT_NODE) return true;
	if (element.nodeType === Node.ELEMENT_NODE) {
		if (
			element.classList.contains("edit-mode-exempt") ||
			selfClosingTags.includes(element.nodeName.toLowerCase())
		)
			return false;
		for (let child of Array.from(element.children))
			if (!isOnlyTextNode(child)) return false;

		return true; // All child nodes are text nodes
	}
	return false; // Not an element node
}

// Function to check if an element is an image
function isImage(element: Element) {
	return element.nodeName === "IMG";
}

// Function to check if an element is a video
function isVideo(element: Element) {
	return element.nodeName === "VIDEO";
}

// Function to check if an element is audio
function isAudio(element: Element) {
	return element.nodeName === "AUDIO";
}

// Function to check if an element is an iframe
function isIframe(element: Element) {
	return element.nodeName === "IFRAME";
}

// Function to check if an element is a link
function isLink(element: Element) {
	return element.nodeName === "A" && element.hasAttribute("href");
}

function getStyleState(element: HTMLElement, style: string) {
	switch (style) {
		case "color":
			return convertToHex(window.getComputedStyle(currentlyEditing).color);
		case "font-size":
			return window.getComputedStyle(currentlyEditing).fontSize;
		case "font-weight":
			return window.getComputedStyle(currentlyEditing).fontWeight;
	}
}

// The EDITABLE object containing the above functions
const EDITABLE = {
	text: isOnlyTextNode,
	image: isImage,
	video: isVideo,
	audio: isAudio,
	iframe: isIframe,
	link: isLink,
};
function getBoundingPageRect(element: HTMLElement) {
	// Get the bounding client rect of the element
	const rect = element.getBoundingClientRect();

	// Calculate the scroll position
	const scrollX = window.scrollX || document.documentElement.scrollLeft;
	const scrollY = window.scrollY || document.documentElement.scrollTop;

	// Adjust the rect values based on the scroll position
	return {
		top: rect.top + scrollY,
		left: rect.left + scrollX,
		width: rect.width,
		height: rect.height,
		bottom: rect.top + rect.height + scrollY,
		right: rect.left + rect.width + scrollX,
	};
}
function getScrollableAncestors(element: HTMLElement) {
	const scrollableAncestors = [];
	let parent = element.parentElement;
	while (parent) {
		const overflowY = window.getComputedStyle(parent).overflowY;
		const overflowX = window.getComputedStyle(parent).overflowX;
		if (
			overflowY === "auto" ||
			overflowY === "scroll" ||
			overflowX === "auto" ||
			overflowX === "scroll"
		) {
			scrollableAncestors.push(parent);
		}
		parent = parent.parentElement;
	}
	return scrollableAncestors;
}
function openTextEditMenu(element: HTMLElement) {
	currentlyEditing = element;
	textEditMenu.style.display = "flex";
	let updateEditMenuPosition = () => {
		requestAnimationFrame(() => {
			let menuBoundingRect = getBoundingPageRect(textEditMenu);
			let elementBoundingRect = getBoundingPageRect(element);
			textEditMenu.style.left =
				String(
					Math.min(
						Math.max(
							elementBoundingRect.left +
								elementBoundingRect.width / 2 -
								menuBoundingRect.width / 2,
							0
						),
						document.documentElement.scrollWidth - menuBoundingRect.width
					)
				) + "px";
			textEditMenu.style.top =
				String(
					Math.min(
						document.documentElement.scrollHeight - menuBoundingRect.height,
						Math.max(0, elementBoundingRect.bottom + 10)
					)
				) + "px";
		});
	};
	updateEditMenuPosition();
	const resizeObserver = new ResizeObserver((entries) => {
		updateEditMenuPosition();
	});
	resizeObserver.observe(element);

	// Attach scroll listeners to scrollable ancestors
	const scrollableAncestors = getScrollableAncestors(element);
	scrollableAncestors.forEach((ancestor) =>
		ancestor.addEventListener("scroll", updateEditMenuPosition)
	);
	(
		document.getElementById("text-edit-menu-color-picker") as HTMLInputElement
	).value = getStyleState(element, "color");
	console.log(
		(document.getElementById("text-edit-menu-color-picker") as HTMLInputElement)
			.value
	);
	(
		document.getElementById(
			"text-edit-menu-font-size-selector"
		) as HTMLInputElement
	).value = parseFloat(getStyleState(element, "font-size")).toString(); // TODO: Support other units??

	return { resizeObserver, scrollableAncestors };
}

const HANDLERS = {
	/**
	 * Handles editing text elements
	 */
	text: (element: HTMLElement) => {
		element.setAttribute("contenteditable", "true");
		element.focus();
		element.style.outline = "1px solid blue";
		element.focus();
		let { resizeObserver } = openTextEditMenu(element);
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
function hasAncestorWithClass(element: Element, className: string) {
	return element.closest(`.${className}`) !== null;
}
window.addEventListener("load", () => {
	textEditMenu = createTextEditMenu();
	textEditMenu.style.display = "none";

	// Add event listeners to elements
	document.body.querySelectorAll("*").forEach((element) => {
		if (
			hasAncestorWithClass(element, "edit-mode-exempt") ||
			hasAncestorWithClass(element, "templated")
		)
			return;
		for (let type in EDITABLE) {
			if (EDITABLE[type](element)) {
				element.addEventListener(
					"click",
					(event: PointerEvent) => {
						// Run the handlers if edit mode is on
						if (edit_mode_toggle.checked) {
							event.preventDefault();
							event.stopImmediatePropagation();
							if (currentlyEditing)
								currentlyEditing.dispatchEvent(new CustomEvent("inactive"));
							HANDLERS[type](element);
						}
					},
					{
						capture: true,
					}
				);
			}
		}
	});
	window.addEventListener("click", (event: PointerEvent) => {
		// Disable editing for an element if the user clicks off of it.
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
		// Undo and redo
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
			let targetBoundingBox = getBoundingPageRect(command.command_target);
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
function componentToHex(c: number) {
	const hex = c.toString(16); // Convert the number to a base 16 (hex) string
	return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function createTextEditMenu() {
	let menu = createElement("menu", {
		classes: ["editor-menu", "edit-mode-exempt"],
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
						id: "text-edit-menu-color-picker",
						eventHandlers: {
							input(event) {
								let previousState = getStyleState(currentlyEditing, "color");
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
						classes: ["font-selector", "menu-item", "edit-mode-exempt"],
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
						classes: ["font-size-selector", "menu-item", "edit-mode-exempt"],
						text: "20",
						id: "text-edit-menu-font-size-selector",
					},
				],
				eventHandlers: {
					input(event) {
						let previousState = getStyleState(currentlyEditing, "font-size");
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
						classes: ["bold-toggle", "menu-item", "edit-mode-exempt"],
						text: "B",
					},
				],
				eventHandlers: {
					click(event) {
						let previousFontWeight = getStyleState(
							currentlyEditing,
							"font-weight"
						);
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
						classes: ["strikethrough-toggle", "menu-item", "edit-mode-exempt"],
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
						classes: ["underline-toggle", "menu-item", "edit-mode-exempt"],
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
							{
								tag: "li",
								classes: ["hover-menu__item", "edit-mode-exempt"],
								text: "Item 0",
							},
							{
								tag: "li",
								classes: ["hover-menu__item", "edit-mode-exempt"],
								text: "Item 1",
							},
							{
								tag: "li",
								classes: ["hover-menu__item", "edit-mode-exempt"],
								text: "Item 2",
							},
						],
					},
				],
			},
		],
	});
	document.body.appendChild(menu);
	return menu;
}

function createImageEditMenu() {
	let menu = createElement({
		tag: "div",
		classes: ["image-selector"],
		id: "image-selector",
		children: [],
	});
}

function createFileManager() {
	let menu = createElement({
		tag: "div",
		classes: ["file-manager"],
		id: "file-manager",
		children: [],
	});
}

function handleFileUpload() {
	// TODO: Handle file upload
}

export { createTextEditMenu };
