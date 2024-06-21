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
	let element = document.createElement(elementName);
	return new Element(element, option);
}

export { EasyEl, createElement };
