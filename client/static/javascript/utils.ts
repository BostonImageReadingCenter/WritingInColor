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

interface CreateElementOptions {
	tag?: string;
	attributes?: { [key: string]: any };
	classes?: string[];
	id?: string;
	text?: string;
	html?: string;
	children?: HTMLElement[] | CreateElementOptions[];
	eventHandlers?: { [key: string]: (event) => void };
	is?: string;
}
// Define function overloads
function createElement(options: CreateElementOptions): HTMLElement;
function createElement(
	elementType: string,
	options: CreateElementOptions
): HTMLElement;

// Implementation
function createElement(
	elementTypeOrOptions: string | CreateElementOptions,
	options?: CreateElementOptions
): HTMLElement {
	let elementType =
		typeof elementTypeOrOptions === "string"
			? elementTypeOrOptions
			: elementTypeOrOptions.tag;
	options =
		typeof elementTypeOrOptions === "string" ? options : elementTypeOrOptions;

	let element = document.createElement(elementType, {
		is: options.is,
	});
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
	for (let handler in options.eventHandlers ?? {}) {
		element.addEventListener(handler, options.eventHandlers[handler]);
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
function isValidUrl(url) {
	try {
		new URL(url);
		return true;
	} catch (_) {
		return false;
	}
}
export { createElement, isValidUrl };
