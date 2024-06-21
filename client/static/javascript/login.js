import { easyEl, createElement } from "./utils.js";
let collectionMessageEl, collectionHeaderEl, collectionFormEl;

window.addEventListener("load", (event) => {
	const supportsWebAuthn =
		window.PublicKeyCredential &&
		navigator.credentials &&
		typeof navigator.credentials.create === "function" &&
		typeof navigator.credentials.get === "function";
	collectionMessageEl = document.getElementById("collection-message");
	collectionHeaderEl = document.getElementById("collection-header");
	collectionFormEl = document.getElementById("collection-form");
	fetch("/api/login/init", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			supportsWebAuthn,
		}),
	}).then((response) => {
		let json = response.json();
		handleAction(json);
	});
});
async function handleAction(data) {
	if (data.action === "collect") {
		collect(data);
	}
}
async function collect(data) {
	if (data.type === "email") {
		collectionMessageEl.innerText = data.message;
		collectionHeaderEl.innerText = data.header;
		let emailInputEl = createElement("input", {
			attributes: {
				type: "email",
			},
			classes: [],
		});
	}
}

function waitForEvent(target, eventName) {
	return new Promise((resolve, reject) => {
		function eventHandler(event) {
			// Remove the event listener once the event occurs
			target.removeEventListener(eventName, eventHandler);
			// Resolve the promise with the event data
			resolve(event);
		}
		// Add the event listener
		target.addEventListener(eventName, eventHandler);
	});
}
