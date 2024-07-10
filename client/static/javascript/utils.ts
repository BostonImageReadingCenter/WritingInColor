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
function createElement(elementType: string, options) {
	let element = document.createElement(elementType, options);
	for (let attribute in options.attributes) {
		element.setAttribute(attribute, options.attributes[attribute]);
	}
	for (let c of options.classes) {
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
