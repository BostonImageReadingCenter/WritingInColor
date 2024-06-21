class EasyEl extends Element {
	constructor(element, options) {
		super(element, options);
		this.element = element;
		for (let attribute in options.attributes) {
			this.setAttribute(attribute, options.attributes[attribute]);
		}
		for (let c of options.classes) {
			this.classList.add(c);
		}
		if (options.id) {
			this.id = options.id;
		}
	}
	setClass(...classes) {
		for (let c of classes) {
			this.element.classList.add(c);
		}
		return this;
	}
	setId(id) {
		this.id = id;
		return this;
	}
	setText(text) {
		this.innerText = text;
		return this;
	}
	setHTML(HTML) {
		this.innerHTML = HTML;
		return this;
	}
}
function createElement(elementName, options) {
	let element = document.createElement(elementName, options);
	for (let attribute in options.attributes) {
		element.setAttribute(attribute, options.attributes[attribute]);
	}
	for (let c of options.classes) {
		element.classList.add(c);
	}
	if (options.id) {
		element.id = options.id;
	}
	return element;
}

function extendElementPrototype() {
	// Get all property names of EasyEl.prototype
	const properties = Object.getOwnPropertyNames(EasyEl.prototype);

	properties.forEach((property) => {
		if (property !== "constructor") {
			// Copy each method from EasyEl.prototype to Element.prototype
			Element.prototype[property] = EasyEl.prototype[property];
		}
	});
}

// Extend the prototype
extendElementPrototype();

export { EasyEl, createElement };
