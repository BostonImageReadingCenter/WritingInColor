/**
 * Manipulates CSS/SCSS properties of an element and returns updated file contents.
 * @param element - The HTML element to modify.
 * @param propertyName - The CSS property to change.
 * @param propertyValue - The new value for the CSS property.
 * @returns A promise that resolves to an object mapping file paths to the new versions of the modified SCSS files.
 */
interface manipulation {
	element: HTMLElement;
	propertyName: string;
	propertyValue: string;
}
export async function manipulateSCSS(manipulations: manipulation[]) {
	// Ensure the element has an ID

	// Get all stylesheets
	const stylesheets = Array.from(document.styleSheets);

	// Filter out external stylesheets and map CSS files to SCSS
	const scssFiles = stylesheets
		.filter((stylesheet) => stylesheet.href && stylesheet.href.endsWith(".css"))
		.map((stylesheet) => stylesheet.href.replace(".css", ".scss"));

	const result = {};
	const scssFilesContent: {
		[key: string]: string[];
	} = {};
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
		if (!element.id) {
			element.id = generateUniqueId();
		}
		const selector = `#${element.id}`;
		const matchData = [];
		for (let scssFile of scssFiles) {
			let lines = scssFilesContent[scssFile];
			let data = {
				scssFile,
				selectorIndex: includesSelector(lines, selector),
				propertyIndex: -1,
			};
			if (data.selectorIndex) {
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
		let lineToAdd = `${propertyName}: ${propertyValue}`;
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
			}
		}
	}

	return result;
}

/**
 * Generates a unique ID for an element.
 * @returns A unique ID.
 */
function generateUniqueId(): string {
	return "element-" + Math.random().toString(36).substring(2, 11);
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
