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
	children?: (HTMLElement | CreateElementOptions)[];
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
function isValidUrl(url: string) {
	try {
		new URL(url);
		return true;
	} catch (_) {
		return false;
	}
}
function namedNodeMapToObject(namedNodeMap: NamedNodeMap) {
	const obj = {};

	for (let i = 0; i < namedNodeMap.length; i++) {
		const attr = namedNodeMap[i];
		obj[attr.name] = attr.value;
	}

	return obj;
}
function buildQuerySelector(attributes: { [key: string]: any }) {
	let selector = "";

	if (attributes.id) {
		selector += `#${attributes.id}`;
	}

	if (attributes.class) {
		const classes = attributes.class.split(" ").filter(Boolean);
		selector += classes.map((cls: string) => `.${cls}`).join("");
	}

	Object.keys(attributes).forEach((attr) => {
		if (attr !== "id" && attr !== "class") {
			selector += `[${attr}="${attributes[attr]}"]`;
		}
	});

	return selector;
}
export { createElement, isValidUrl, namedNodeMapToObject, buildQuerySelector };

/**
 * Joins all given path segments into a single path, using the appropriate separator.
 * @param segments - Path segments to be joined.
 * @returns The combined path.
 */
export function pathJoin(...segments: string[]): string {
	// Define the path separator for client-side
	const separator = "/";

	// Filter out empty segments and normalize each segment
	const filteredSegments = segments
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	// Join the segments using the separator
	let joinedPath = filteredSegments.join(separator);

	// Normalize the path by removing redundant separators
	joinedPath = joinedPath.replace(/\/{2,}/g, separator); // Replace multiple slashes with a single one

	// Remove trailing slash if it is more than just "/"
	if (joinedPath.length > 1 && joinedPath.endsWith(separator)) {
		joinedPath = joinedPath.slice(0, -1);
	}

	return joinedPath;
}
