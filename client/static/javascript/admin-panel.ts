import { getFileType, uploadTags } from "../../../server/utils.ts";
import {
	buildQuerySelector,
	createElement,
	isValidUrl,
	namedNodeMapToObject,
} from "./utils.ts";

let edit_mode_toggle = document.getElementById(
	"edit-mode-toggle"
) as HTMLInputElement;
let textEditMenu: HTMLElement;
let currentlyEditing: HTMLElement;
let wrapTextButton: HTMLElement;
let fileManager: HTMLElement;

interface Command {
	command_type: string;
	command_target: HTMLElement;
	command_target_parent?: HTMLElement;
	command_target_index?: number;
	value?: any;
	previousState?: any;
	input?: HTMLElement;
}
let commandStack: Command[] = []; // Commands performed. This list is used for undo and redo operations.
let undid: Command[] = []; // Commands that were undone with ctrl+z
let windowWidth: number, windowHeight: number;
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
const fontFamilies = [
	["Arial", "Helvetica", "sans-serif"],
	["Verdana", "Geneva", "sans-serif"],
	["Times New Roman", "Times", "serif"],
	["Courier New", "Courier", "monospace"],
	["Georgia", "serif"],
	["Palatino Linotype", "Book Antiqua", "Palatino", "serif"],
	["Trebuchet MS", "Helvetica", "sans-serif"],
	["Impact", "Charcoal", "sans-serif"],
	["Comic Sans MS", "cursive", "sans-serif"],
	["Lucida Sans Unicode", "Lucida Grande", "sans-serif"],
	["Tahoma", "Geneva", "sans-serif"],
	["Lucida Console", "Monaco", "monospace"],
	["Garamond", "serif"],
	["Bookman", "serif"],
	["Arial Black", "Gadget", "sans-serif"],
	["Helvetica", "Arial", "sans-serif"],
	["Gill Sans", "Gill Sans MT", "sans-serif"],
	["Century Gothic", "sans-serif"],
	["Candara", "sans-serif"],
	["Calibri", "Candara", "Segoe", "sans-serif"],
	["Cambria", "Georgia", "serif"],
	["Franklin Gothic Medium", "Arial Narrow", "Arial", "sans-serif"],
	["Copperplate", "Copperplate Gothic Light", "fantasy"],
	["Didot", "serif"],
	["Rockwell", "serif"],
	["Consolas", "monospace"],
	["Futura", "sans-serif"],
	["Baskerville", "serif"],
	["Lato", "Helvetica", "Arial", "sans-serif"],
	["Inter", "Arial", "sans-serif"],
	["Fraunces", "serif"],
	["serif"],
	["sans-serif"],
	["monospace"],
	["cursive"],
	["fantasy"],
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
			if (!isOnlyTextNode(child)) {
				return false;
			}
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
/**
 * Gets the raw value of a CSS property for an element, as defined in the element's style.
 */
function getRawCSSValue(element: HTMLElement, property: string): string | null {
	// Check inline styles first
	if (element.style[property]) {
		return element.style[property];
	}

	const styleSheets = document.styleSheets;

	// Check all style sheets
	for (let i = 0; i < styleSheets.length; i++) {
		let rules: CSSRuleList | null = null;
		try {
			rules = styleSheets[i].cssRules || styleSheets[i].rules;
		} catch (e) {
			// The stylesheet cannot be accessed. It may be from another domain or restricted for some other reason.
			continue;
		}
		if (rules) {
			for (let j = 0; j < rules.length; j++) {
				const rule = rules[j];
				if (rule instanceof CSSStyleRule && rule.style[property]) {
					// Check if the rule applies to the element
					if (element.matches(rule.selectorText)) {
						return rule.style[property];
					}
				}
			}
		}
	}

	// If no value found
	return null;
}
function getStyleState(element: HTMLElement, style: string) {
	switch (style) {
		case "color":
			return convertToHex(window.getComputedStyle(element).color);
		case "font-size":
			return getRawCSSValue(element, "font-size") || "1em";
		case "font-weight":
			return window.getComputedStyle(element).fontWeight;
		case "font-family":
			return (
				getRawCSSValue(element, "font-family") ||
				(element.parentElement
					? getStyleState(element.parentElement, "font-family")
					: "sans-serif")
			);
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
let updateEditMenuPosition = () => {
	if (!currentlyEditing) return requestAnimationFrame(updateEditMenuPosition);
	let menuBoundingRect = getBoundingPageRect(textEditMenu);
	let elementBoundingRect = getBoundingPageRect(currentlyEditing);
	let padding = 15;
	let left =
		elementBoundingRect.left +
		elementBoundingRect.width / 2 -
		menuBoundingRect.width / 2;
	let top = elementBoundingRect.bottom + padding;
	// Ensure the menu doesn't go off-screen
	if (left < window.scrollX) left = window.scrollX + padding;
	if (left + menuBoundingRect.width + padding > windowWidth + window.scrollX)
		left = windowWidth + window.scrollX - menuBoundingRect.width - padding;
	if (top < window.scrollY) top = window.scrollY + padding;
	if (top + menuBoundingRect.height + padding > windowHeight + window.scrollY)
		top = windowHeight + window.scrollY - menuBoundingRect.height - padding;
	textEditMenu.style.left = String(left) + "px";
	textEditMenu.style.top = String(top) + "px";
	requestAnimationFrame(updateEditMenuPosition);
};
function openTextEditMenu(element: HTMLElement) {
	currentlyEditing = element;
	textEditMenu.classList.add("show");
	textEditMenu.style.display = "flex";

	// Attach scroll listeners to scrollable ancestors
	(
		document.getElementById("text-edit-menu-color-picker") as HTMLInputElement
	).value = getStyleState(element, "color");
	(
		document.getElementById(
			"text-edit-menu-font-size-selector"
		) as HTMLInputElement
	).value = getStyleState(element, "font-size");
	document.getElementById("text-edit-menu-font-selector").style.fontFamily =
		getStyleState(element, "font-family");
}

const HANDLERS = {
	/**
	 * Handles editing text elements
	 */
	text: (element: HTMLElement) => {
		element.setAttribute("contenteditable", "true");
		element.style.outline = "1px solid blue";
		element.focus();
		openTextEditMenu(element);
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
			(event) => {
				element.removeEventListener("input", inputHandler);
				element.style.outline = "none";
				textEditMenu.classList.remove("show");
				textEditMenu.style.display = "none";
				element.setAttribute("contenteditable", "false");
				wrapTextButton.classList.remove("show");
				wrapTextButton.classList.add("hide");
				document
					.querySelectorAll(".editor-menu .show")
					.forEach((menu) => menu.classList.remove("show"));
			},
			{ once: true }
		);
	},
	image: (element: HTMLElement) => {},
	video: (element: HTMLElement) => {},
	iframe: (element: HTMLElement) => {},
	audio: (element: HTMLElement) => {},
	link: (element: HTMLElement) => {},
};
function hasAncestorWithClass(element: Element, className: string) {
	return element.closest(`.${className}`) !== null;
}
function flashText(element: HTMLElement, onComplete?: () => void) {
	element.classList.add("flash");
	setTimeout(() => {
		element.classList.remove("flash");
		if (onComplete) onComplete();
	}, 800);
}
function editableClickHandler(
	event: PointerEvent,
	type: string,
	element: Element
) {
	// Run the handlers if edit mode is on
	if (edit_mode_toggle.checked) {
		event.preventDefault();
		event.stopImmediatePropagation();
		if (currentlyEditing === element) return false;
		if (currentlyEditing) {
			currentlyEditing.dispatchEvent(new CustomEvent("inactive"));
		}
		HANDLERS[type](element);
		return true;
	}
}
window.addEventListener("DOMContentLoaded", () => {
	windowHeight = window.innerHeight;
	windowWidth = window.innerWidth;
	window.addEventListener("resize", () => {
		windowHeight = window.innerHeight;
		windowWidth = window.innerWidth;
	});
	textEditMenu = createTextEditMenu();
	updateEditMenuPosition();
	textEditMenu.style.display = "none";
	fileManager = createFileManager();
	wrapTextButton = createElement("button", {
		id: "wrap-text-button",
		classes: ["hide", "edit-mode-exempt"],
		html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-in-down" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1z"/>
  <path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
</svg>`,
	});
	document.body.appendChild(wrapTextButton);
	document.addEventListener("selectionchange", () => {
		if (!currentlyEditing) {
			wrapTextButton.classList.remove("show");
			wrapTextButton.classList.add("hide");
			return;
		}
		const selection = window.getSelection();
		const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		const isWithinElement =
			range && currentlyEditing.contains(range.commonAncestorContainer);
		if (isWithinElement && !selection.isCollapsed) {
			const rect = range.getBoundingClientRect();
			const padding = 15;
			// Calculate the button position
			let top =
				window.scrollY + rect.top - wrapTextButton.offsetHeight - padding;
			let left =
				window.scrollX +
				rect.left +
				rect.width / 2 -
				wrapTextButton.offsetWidth / 2;
			// Ensure the button doesn't go off-screen
			if (left < 0) left = padding;
			if (left + wrapTextButton.offsetWidth > window.innerWidth)
				left = window.innerWidth - wrapTextButton.offsetWidth - padding;
			if (top < 0) top = rect.bottom + padding;

			wrapTextButton.style.top = `${top}px`;
			wrapTextButton.style.left = `${left}px`;

			wrapTextButton.classList.add("show");
			wrapTextButton.classList.remove("hide");
		} else {
			wrapTextButton.classList.remove("show");
			wrapTextButton.classList.add("hide");
		}
	});
	wrapTextButton.addEventListener("click", function () {
		const selection = window.getSelection();
		let range = selection.getRangeAt(0);
		if (range && !range.collapsed) {
			const span = document.createElement("span");
			try {
				range.surroundContents(span);
			} catch (e) {
				alert(
					`Error: Failed to wrap due to partial selection.\nHelp: You accidentally selected part of another element. Try again.`
				);
			}
			span.addEventListener("click", (event: PointerEvent) =>
				editableClickHandler(event, "text", span)
			);
			selection.removeAllRanges();
			currentlyEditing.dispatchEvent(new CustomEvent("inactive"));
			flashText(span, () => {
				if (
					editableClickHandler(new PointerEvent("click"), "text", span) ===
					false
				) {
					openTextEditMenu(span);
				}
			});
			wrapTextButton.classList.remove("show");
			wrapTextButton.classList.add("hide");
		}
	});
	// Add event listeners to elements
	document.body.querySelectorAll("*").forEach((element) => {
		if (
			element.classList.contains("templated") ||
			element.classList.contains("edit-mode-exempt") ||
			hasAncestorWithClass(element, "edit-mode-exempt") ||
			hasAncestorWithClass(element, "templated")
		)
			return;
		for (let type in EDITABLE) {
			if (EDITABLE[type](element)) {
				element.addEventListener(
					"click",
					(event: PointerEvent) => editableClickHandler(event, type, element),
					{
						capture: false,
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
			let wrapTextButtonBoundingRect = wrapTextButton.getBoundingClientRect();
			let textEditMenuBoundingRect = textEditMenu.getBoundingClientRect();
			if (
				!isPointInRect(
					{ x: event.clientX, y: event.clientY },
					currentlyEditingBoundingRect
				) &&
				!isPointInRect(
					{ x: event.clientX, y: event.clientY },
					textEditMenuBoundingRect
				) &&
				!isPointInRect(
					{ x: event.clientX, y: event.clientY },
					wrapTextButtonBoundingRect
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
			event.key.toLowerCase() === "z" &&
			(event.ctrlKey || event.metaKey) &&
			(commandStack.length > 0 || (event.shiftKey && undid.length > 0))
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
function copyAttributes(source: Element, target: HTMLElement) {
	for (let i = 0; i < source.attributes.length; i++) {
		const attr = source.attributes[i];
		target.setAttribute(attr.name, attr.value);
	}
}
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
	} else if (command.command_type === "change-font-family") {
		command.command_target.style.fontFamily = fontFamilies
			.find((family) => {
				return family[0].toLowerCase() === command.previousState;
			})
			.join(", ");
	} else if (command.command_type === "change-link") {
		if (command.previousState === null) {
			let anchor = command.command_target.querySelector("a");
			while (anchor.firstChild) {
				command.command_target.appendChild(anchor.firstChild);
			}
			anchor.remove();
		} else {
			command.command_target.setAttribute("href", command.previousState);
		}
	} else if (command.command_type === "delete-element") {
		// Reinsert the element at the stored index
		if (
			command.command_target_index <
			command.command_target_parent.children.length
		) {
			command.command_target_parent.insertBefore(
				command.command_target,
				command.command_target_parent.children[command.command_target_index]
			);
		} else {
			// If the index is out of bounds, append the element at the end
			command.command_target_parent.appendChild(command.command_target);
		}
	} else if (command.command_type === "change-bullet-point") {
		command.command_target.innerHTML = command.previousState.html;
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
	} else if (command.command_type === "change-font-family") {
		command.command_target.style.fontFamily = fontFamilies
			.find((family) => {
				return family[0].toLowerCase() === command.value;
			})
			.join(", ");
	} else if (command.command_type === "change-link") {
		if (
			command.previousState == null &&
			command.command_target.tagName.toLowerCase() !== "a"
		) {
			const anchor = document.createElement("a");
			anchor.href = command.value;

			while (command.command_target.firstChild) {
				anchor.appendChild(command.command_target.firstChild);
			}

			command.command_target.appendChild(anchor);
		}
		command.command_target.setAttribute("href", command.value);
	} else if (command.command_type === "delete-element") {
		command.command_target.remove();
	} else if (command.command_type === "change-bullet-point") {
		let list = command.previousState.list;
		if (!list) {
			let listItems = command.command_target.innerText.split("\n");
			command.command_target.innerHTML = "";
			let ul = document.createElement("ul");
			listItems.forEach((item) => {
				let li = document.createElement("li");
				li.innerText = item;
				ul.appendChild(li);
			});
			command.command_target.appendChild(ul);
		} else {
			const newTagName = list.tagName.toLowerCase() === "ul" ? "ol" : "ul";
			const newList = document.createElement(newTagName);

			copyAttributes(list, newList);

			// Copy the content
			newList.innerHTML = list.innerHTML;

			// Replace old element with the new one
			list.replaceWith(newList);
		}
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
let createColorPicker = () =>
	createElement({
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
	});
let createFontSelector = () =>
	createElement({
		tag: "div",
		classes: ["menu-item-wrapper", "menu-item-box"],
		children: [
			{
				tag: "span",
				classes: ["font-selector", "menu-item", "edit-mode-exempt"],
				text: "Aa",
				id: "text-edit-menu-font-selector",
				children: [
					{
						tag: "div",
						classes: ["editor-item-selector", "font-selector-menu"],
						id: "font-selector-menu",
						children: [
							{
								tag: "ul",
								classes: ["font-list"],
								children: fontFamilies.map((family) => ({
									tag: "li",
									text: family[0],
									id: `font-${family[0].toLowerCase().replaceAll(" ", "-")}`,
									attributes: {
										"data-font": family[0],
										style: `font-family: ${family.join(", ")};`,
									},
									classes: ["font-item"],
									eventHandlers: {
										click(event) {
											let previousState = getStyleState(
												currentlyEditing,
												"font-family"
											)
												.split(",")[0]
												.trim()
												.toLowerCase()
												.replaceAll(/["']+/g, "");
											document
												.getElementById(
													`font-${previousState.replaceAll(" ", "-")}`
												)
												.classList.remove("selected");
											event.target.classList.add("selected");
											currentlyEditing.style.fontFamily = family.join(", ");
											document.getElementById(
												"text-edit-menu-font-selector"
											).style.fontFamily = family.join(", ");
											commandStack.push({
												command_type: "change-font-family",
												command_target: currentlyEditing,
												value: family[0].toLowerCase(),
												previousState,
												input: event.target,
											});
											event.stopImmediatePropagation();
										},
									},
								})),
							},
						],
					},
				],
			},
		], // Wow, look at all those levels of nesting! This is messy!
		eventHandlers: {
			click(event) {
				let previousState = getStyleState(currentlyEditing, "font-family")
					.split(",")[0]
					.trim()
					.toLowerCase()
					.replaceAll(" ", "-")
					.replaceAll(/["']+/g, "");
				document.getElementById("font-selector-menu").classList.toggle("show");
				document
					.getElementById(`font-${previousState}`)
					.classList.add("selected");
			},
		},
	});
let createFontSizeSelector = () =>
	createElement({
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
					type: "text",
					value: "32px",
				},
				classes: ["font-size-selector", "menu-item", "edit-mode-exempt"],
				text: "20",
				id: "text-edit-menu-font-size-selector",
			},
		],
		eventHandlers: {
			input(event) {
				let previousState = getStyleState(currentlyEditing, "font-size");
				currentlyEditing.style.fontSize = event.target.value;
				commandStack.push({
					command_type: "change-font-size",
					command_target: currentlyEditing,
					value: event.target.value,
					previousState,
					input: event.target,
				});
			},
		},
	});
let createBoldToggle = () =>
	createElement({
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
				let previousFontWeight = getStyleState(currentlyEditing, "font-weight");
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
	});
let createStrikeThroughToggle = () =>
	createElement({
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
	});

let createUnderlineToggle = () =>
	createElement({
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
	});

let createTextAlignButton = () =>
	createElement({
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
	});
let createBulletPointToggle = () =>
	createElement({
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
		eventHandlers: {
			click(event) {
				let list = currentlyEditing.querySelector("ul, ol");
				let html = currentlyEditing.innerHTML;
				let command = {
					command_type: "change-bullet-point",
					command_target: currentlyEditing,
					value: currentlyEditing.innerText,
					previousState: {
						list,
						html,
					},
					input: event.target,
				};
				commandStack.push(command);
				redo(command);
			},
		},
	});
let createLinkManager = () =>
	createElement({
		tag: "div",
		classes: ["menu-item-wrapper", "menu-item-round", "link-button-wrapper"],
		children: [
			{
				tag: "img",
				attributes: { src: "/static/media/image/icon/link.svg" },
				classes: ["menu-item"],
			},
			{
				tag: "div",
				id: "link-manager",
				classes: ["editor-item-selector"],
				children: [
					{
						tag: "input",
						id: "link-url-input",
						attributes: {
							type: "url",
							placeholder: "https://example.com",
						},
						eventHandlers: {
							click(event) {
								event.stopImmediatePropagation();
							},
						},
					},
					{
						tag: "button",
						id: "link-apply-button",
						text: "Apply",
						eventHandlers: {
							click(event) {
								let previousValue = currentlyEditing.getAttribute("href");
								let value = (
									document.getElementById("link-url-input") as HTMLInputElement
								).value;
								if (!isValidUrl(value)) {
									alert("Invalid URL");
									return;
								}
								currentlyEditing.setAttribute("href", value);
								commandStack.push({
									command_type: "change-link",
									command_target: currentlyEditing,
									value: value,
									previousState: previousValue,
									input: event.target,
								});
								redo(commandStack[commandStack.length - 1]);
								event.stopImmediatePropagation();
							},
						},
					},
				],
			},
		],
		eventHandlers: {
			click(event) {
				let previousValue = currentlyEditing.getAttribute("href");
				(document.getElementById("link-url-input") as HTMLInputElement).value =
					previousValue;
				document.getElementById("link-manager").classList.toggle("show");
			},
		},
	});

let createCopyButton = () =>
	createElement({
		tag: "div",
		classes: ["menu-item-wrapper", "menu-item-round"],
		children: [
			{
				tag: "img",
				attributes: { src: "/static/media/image/icon/Copy.svg" },
				classes: ["copy-button", "menu-item"],
			},
		],
		eventHandlers: {
			click(event) {
				let text = currentlyEditing.innerText;
				navigator.clipboard.writeText(text);
				alert("Text copied to clipboard");
			},
		},
	});

let createDeleteButton = () =>
	createElement({
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
				commandStack.push({
					command_type: "delete-element",
					command_target: currentlyEditing,
					command_target_parent: currentlyEditing.parentElement,
					command_target_index: Array.prototype.indexOf.call(
						currentlyEditing.parentElement.children,
						currentlyEditing
					),
					input: event.target,
				});
				currentlyEditing.remove();
			},
		},
	});

let createTextEditThreeDotsMenu = () =>
	createElement({
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
	});
let createTextEditMenu = () =>
	document.body.appendChild(
		createElement("menu", {
			classes: ["editor-menu", "edit-mode-exempt"],
			children: [
				createColorPicker(),
				createFontSelector(),
				createFontSizeSelector(),
				createBoldToggle(),
				createStrikeThroughToggle(),
				createUnderlineToggle(),
				createTextAlignButton(),
				createBulletPointToggle(),
				createLinkManager(),
				createCopyButton(),
				createDeleteButton(),
				createTextEditThreeDotsMenu(),
			],
		})
	);

interface FileData {
	filename: string;
	tag: string;
	file: File;
}
function createFileManager() {
	let filesToUpload: FileData[] = [];
	function createTagSelectorDropdown(file: FileData) {
		let mimetype = file.file.type;
		let tags = Object.keys(uploadTags[getFileType(mimetype)]);

		let tagSelector = createElement("select", {
			classes: ["file-manager-file-list-tag-selector"],
			attributes: {
				value: "other",
			},
			children: tags.map((tag) => {
				return {
					tag: "option",
					attributes: { value: tag, selected: tag === "other" },
					text: tag,
				};
			}),
			eventHandlers: {
				change(event) {
					const selectedOption =
						event.target.options[event.target.selectedIndex];
					const selectedValue = selectedOption.value;
					file.tag = selectedValue;
				},
			},
		});
		return tagSelector;
	}
	function createFileElement(file: FileData) {
		let fileElement = createElement("li", {
			classes: ["file-manager-file-list-file"],
			children: [
				{
					tag: "span",
					text: file.filename,
					attributes: { contenteditable: "true" },
					eventHandlers: {
						input(event) {
							file.filename = event.target.innerText;
						},
					},
				},
				createTagSelectorDropdown(file),
				{
					tag: "span",
					classes: ["file-manager-file-list-file-delete"],
					text: "×",
					eventHandlers: {
						click: () => {
							filesToUpload.splice(filesToUpload.indexOf(file), 1);
							fileElement.remove();
						},
					},
				},
			],
		});
		fileList.appendChild(fileElement);
		return fileElement;
	}
	function isInFilesToUpload(file: File) {
		return filesToUpload.some(
			(f) =>
				f.file.name === file.name &&
				f.file.size === file.size &&
				f.file.type === file.type &&
				f.file.lastModified === file.lastModified
		);
	}
	function handleFiles(files: FileList) {
		console.log("handleFiles", files);
		let files_array = Array.from(files);
		for (let i = 0; i < files_array.length; i++) {
			if (isInFilesToUpload(files_array[i])) continue;
			let fileData: FileData = {
				filename: files_array[i].name,
				tag: "other",
				file: files_array[i],
			};
			filesToUpload.push(fileData);
			createFileElement(fileData);
		}
		if (files_array.length > 0) {
			fileDropZone.classList.add("has-files");
		}
	}
	function handleFilesUpload() {
		const formData = new FormData();
		formData.append("numFiles", String(filesToUpload.length));
		filesToUpload.forEach((fileObject) => {
			formData.append("files[]", fileObject.file);
			formData.append("tags[]", fileObject.tag);
			formData.append("filenames[]", fileObject.filename);
		});

		fetch("/api/upload", {
			method: "POST",
			body: formData,
		})
			.then((response) => {
				if (response.ok) {
					return response.json();
				} else {
					throw new Error("Upload failed");
				}
			})
			.then((data) => {
				console.log("Upload successful:", data);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	}
	let fileInput = createElement("input", {
		attributes: {
			type: "file",
			multiple: true,
		},
		text: "Upload files",
		classes: ["file-manager-upload-input"],
		eventHandlers: {
			change: (event) => {
				handleFiles(event.target.files);
				fileInput.value = "";
			},
			click: (event) => {
				event.stopImmediatePropagation();
			},
		},
	}) as HTMLInputElement;
	let fileList = createElement("ul", {
		classes: ["file-manager-files-list"],
		children: [],
	});
	let fileDropZone = createElement("div", {
		classes: ["file-manager-upload-drop-zone"],
		children: [fileInput],
		eventHandlers: {
			dragover: (event) => {
				event.preventDefault();
				event.stopPropagation();
				event.target.classList.add("dragover");
			},
			dragleave: (event) => {
				event.preventDefault();
				event.stopPropagation();
				event.target.classList.remove("dragover");
			},
			drop: (event) => {
				event.preventDefault();
				event.stopPropagation();
				event.target.classList.remove("dragover");
				console.log("drop");
				handleFiles(event.dataTransfer.files);
			},
			click: (event) => {
				fileInput.click();
			},
		},
	});
	let uploadButton = createElement("button", {
		classes: ["file-manager-upload-button"],
		text: "Upload",
		eventHandlers: {
			click: () => {
				console.log(filesToUpload);
				handleFilesUpload();
			},
		},
	});
	let menu = createElement({
		tag: "div",
		classes: ["file-manager", "edit-mode-exempt"],
		id: "file-manager",
		children: [
			{
				tag: "div",
				classes: ["file-manager-header"],
				children: [
					{
						tag: "span",
						text: "×",
						eventHandlers: {
							click: () => {
								menu.classList.remove("show");
							},
						},
					},
				],
			},
			fileDropZone,
			fileList,
			uploadButton,
		],
	});
	return document.body.appendChild(menu);
}

export { createTextEditMenu };
