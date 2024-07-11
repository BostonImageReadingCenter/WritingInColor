import { Action } from "../../../server/types";

const newProperties = {
	setClass(...classes) {
		for (let c of classes) {
			this.classList.add(c);
		}
		return this;
	},
	setId(id: string) {
		this.id = id;
		return this;
	},
	setText(text: string) {
		this.innerText = text;
		return this;
	},
	setHTML(HTML: string) {
		this.innerHTML = HTML;
		return this;
	},
};
// Define function overloads
function createElement(options: { [key: string]: any }): HTMLElement;
function createElement(
	elementType: string,
	options: { [key: string]: any }
): HTMLElement;

// Implementation
function createElement(
	elementTypeOrOptions: string | { [key: string]: any },
	options?: { [key: string]: any }
): HTMLElement {
	let elementType =
		typeof elementTypeOrOptions === "string"
			? elementTypeOrOptions
			: elementTypeOrOptions.tag;
	options =
		typeof elementTypeOrOptions === "string" ? options : elementTypeOrOptions;
	let element = document.createElement(elementType, options);
	for (let attribute in options.attributes ?? {}) {
		element.setAttribute(attribute, options.attributes[attribute]);
	}
	for (let c of options.classes ?? []) {
		element.classList.add(c);
	}
	if (options.id) {
		element.id = options.id;
	}
	if (options.text) {
		element.innerText = options.text;
	}
	if (options.html) {
		element.innerHTML = options.html;
	}
	for (let child of options.children ?? []) {
		if (child instanceof Element) {
			element.appendChild(child);
		} else {
			element.appendChild(createElement(child));
		}
	}
	for (let handler in options.handlers ?? {}) {
		element.addEventListener(handler, options.handlers[handler]);
	}
	return element;
}
function extendElementPrototype() {
	Object.keys(newProperties).forEach((methodName) => {
		Element.prototype[methodName] = newProperties[methodName];
	});
}

// Extend the prototype
extendElementPrototype();

export { createElement };
