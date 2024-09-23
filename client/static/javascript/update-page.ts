import { ElementState } from "../../../server/types";

/**
 * Manipulates CSS/SCSS properties of an element and returns updated file contents.
 * @param element - The HTML element to modify.
 * @param propertyName - The CSS property to change.
 * @param propertyValue - The new value for the CSS property.
 * @returns A promise that resolves to an object mapping file paths to the new versions of the modified SCSS files.
 */
export interface SCSSManipulation {
	element: HTMLElement;
	propertyName: string;
	propertyValue: string;
}
export async function manipulateSCSS(manipulations: SCSSManipulation[]) {
	// Ensure the element has an ID

	// Get all stylesheets
	const stylesheets = Array.from(document.styleSheets);

	// Filter out external stylesheets and map CSS files to SCSS
	const scssFiles = stylesheets
		.filter((stylesheet) => stylesheet.href && stylesheet.href.endsWith(".css"))
		.map((stylesheet) => stylesheet.href.replaceAll("css", "scss"));

	const scssFilesContent: {
		[key: string]: string[];
	} = {};
	const changedFiles = [];
	for (const scssFile of scssFiles) {
		try {
			const response = await fetch(scssFile);
			const scssContent = await response.text();
			const lines = scssContent.split("\n");
			scssFilesContent[scssFile] = lines;
		} catch (error) {
			console.error("Error fetching SCSS file:", error);
		}
	}
	for (let manipulation of manipulations) {
		let { element, propertyName, propertyValue } = manipulation;
		const selector = `#${element.id}`;
		const matchData = [];
		for (let scssFile of scssFiles) {
			let lines = scssFilesContent[scssFile];
			let data = {
				scssFile,
				selectorIndex: includesSelector(lines, selector),
				propertyIndex: -1,
			};
			if (data.selectorIndex !== -1) {
				data.propertyIndex = includesProperty(
					lines,
					data.selectorIndex,
					propertyName
				);
			}
			matchData.push(data);
		}
		let haveProperty = matchData.filter((data) => data.propertyIndex !== -1);
		let editMade = false;
		let lineToAdd = `${propertyName}: ${propertyValue};`;
		for (let hasProperty of haveProperty) {
			if (!editMade) {
				scssFilesContent[hasProperty.scssFile][hasProperty.propertyIndex] =
					lineToAdd; // Set the property
				editMade = true;
			} else {
				scssFilesContent[hasProperty.scssFile].splice(
					hasProperty.propertyIndex,
					1
				); // Remove the conflicting property
			}
			changedFiles.push(hasProperty.scssFile);
		}
		if (!editMade) {
			let hasSelector = matchData.find((data) => data.selectorIndex !== -1);
			if (hasSelector) {
				let line = scssFilesContent[hasSelector.scssFile][
					hasSelector.selectorIndex
				] as string;
				let split = line.split(selector);
				let after = split[split.length - 1];
				let includesLeftBrace = after.includes("{");
				let includesRightBrace = after.includes("}");
				if (includesLeftBrace && !includesRightBrace) {
					scssFilesContent[hasSelector.scssFile].splice(
						hasSelector.selectorIndex + 1,
						0,
						lineToAdd
					);
				} else if (!includesLeftBrace) {
					let afterLines = scssFilesContent[hasSelector.scssFile]
						.slice(hasSelector.selectorIndex + 1)
						.join("\n");
					let indexOfStart = afterLines.indexOf("{");
					afterLines =
						afterLines.slice(0, indexOfStart + 1) +
						lineToAdd +
						"\n" +
						afterLines.slice(indexOfStart + 1);
					scssFilesContent[hasSelector.scssFile] = scssFilesContent[
						hasSelector.scssFile
					]
						.slice(0, hasSelector.selectorIndex + 1)
						.concat(afterLines.split("\n"));
				} else if (includesRightBrace) {
					let replaced = after.replace("}", "\n" + lineToAdd + "\n}");
					split[split.length - 1] = replaced;
					scssFilesContent[hasSelector.scssFile][hasSelector.selectorIndex] =
						split.join(selector);
				}
				changedFiles.push(hasSelector.scssFile);
			} else {
				scssFilesContent[scssFiles[0]].push(`${selector} {`);
				scssFilesContent[scssFiles[0]].push(" ".repeat(2) + lineToAdd);
				scssFilesContent[scssFiles[0]].push("}");
				changedFiles.push(scssFiles[0]);
			}
		}
	}
	let result = {};
	for (let scssFile of changedFiles) {
		let joined = scssFilesContent[scssFile].join("\n");
		result[scssFile] = joined;
	}

	return result;
}

function includesSelector(lines: string[], selector: string) {
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(selector)) return i;
	}
	return -1;
}
function includesProperty(
	lines: string[],
	selectorIndex: number,
	propertyName: string
) {
	let bracketCount = 0;
	for (let i = selectorIndex + 1; i < lines.length; i++) {
		if (lines[i].includes("{")) bracketCount++;
		if (lines[i].includes("}")) bracketCount--;

		if (bracketCount < 0) break;
		const regex = new RegExp(`^[\\s\\t]*${propertyName}:.*$`);
		const match = lines[i].match(regex);
		if (match) {
			return i;
		}
	}
	return -1;
}
export interface HTMLModification {
	element: HTMLElement;
	elementState: ElementState;
	attributeModifications?: {
		[key: string]: string;
	};
	newHTML?: string;
	delete?: boolean;
}

function generateSelector(elementState: ElementState) {
	if (elementState.id) {
		console.log(elementState.id);
		return `#${elementState.id}`;
	}
	let selector = `${elementState.tag}${elementState.classes.map(
		(c) => `.${c}`
	)}`;
	let parent = "";
	if (elementState.parent) {
		parent = generateSelector(elementState.parent);
		selector = `${parent} > ${selector}`;
	}
	if (elementState.index) {
		selector = `${selector}:nth-child(${elementState.index + 1})`;
	}
	console.log(selector);
	return selector;
}
function getMatchingElementsFromOtherDocuments(
	elementState: ElementState,
	documents: Document[]
) {
	let selector = generateSelector(elementState);
	let elements: Element[] = [];
	for (let doc of documents) {
		elements = elements.concat(Array.from(doc.querySelectorAll(selector)));
	}
	console.log(elements);
	return elements;
}
function getHTMLBodyContent(doc: Document) {
	return doc.body.innerHTML;
}
export async function modifyNunjucksFile(
	HTMLModifications: HTMLModification[]
) {
	let sourceFiles = [];
	document
		.querySelectorAll("meta[name=page-raw-template]")
		.forEach((element) => {
			sourceFiles.push(element.getAttribute("content"));
		});
	let rendered: {
		[key: string]: Document;
	} = {};
	for (let sourceFile of sourceFiles) {
		const response = await fetch(`/template-body/${sourceFile}`);
		const sourceContent = `<!DOCTYPE html><html><body>${await response.text()}</body></html>`;
		let parser = new DOMParser();
		let doc = parser.parseFromString(sourceContent, "text/html");
		rendered[sourceFile] = doc;
	}
	for (let modification of HTMLModifications) {
		console.log(modification);
		let elementState = modification.elementState;
		let candidates: Element[] = getMatchingElementsFromOtherDocuments(
			elementState,
			Object.values(rendered)
		);
		let element = candidates[0];
		if (modification.delete) {
			element.remove();
		}
		if (modification.newHTML) {
			element.innerHTML = modification.newHTML;
		}
		if (modification.attributeModifications) {
			for (let attribute in modification.attributeModifications) {
				let value = modification.attributeModifications[attribute];
				element.setAttribute(attribute, value);
			}
		}
	}
	// Convert back to text.
	let unRendered = {};
	for (let sourceFile of sourceFiles) {
		unRendered[sourceFile] = getHTMLBodyContent(rendered[sourceFile]);
	}
	return unRendered;
}
export function saveElementState(element: Element, depth = 1): ElementState {
	let validParent = !["body", "html", "head"].includes(
		element.parentElement.tagName.toLowerCase()
	);
	return {
		id: element.id,
		classes: Array.from(element.classList).filter(
			(value) => value !== "editable"
		),
		tag: element.tagName.toLowerCase(),
		parent:
			validParent && depth > 0
				? saveElementState(element.parentElement, depth - 1)
				: null,
		children:
			depth > 0
				? Array.from(element.children).map((value) =>
						saveElementState(value, depth - 1)
				  )
				: null,
		innerText: element.textContent,
		innerHTML: element.innerHTML,
		index: validParent
			? Array.prototype.indexOf.call(element.parentElement.children, element)
			: null,
	};
}
