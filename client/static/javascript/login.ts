import { createElement } from "./utils.ts";
let collectionMessageEl,
	collectionHeaderEl,
	collectionFormEl,
	collectionInputsEl,
	sessionID;

window.addEventListener("load", (event) => {
	const supportsWebAuthn =
		window.PublicKeyCredential &&
		navigator.credentials &&
		typeof navigator.credentials.create === "function" &&
		typeof navigator.credentials.get === "function";
	collectionMessageEl = document.getElementById("collection-message");
	collectionHeaderEl = document.getElementById("collection-header");
	collectionFormEl = document.getElementById("collection-form");
	collectionInputsEl = document.getElementById("collection-inputs");
	fetch("/api/login/init", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			supportsWebAuthn,
		}),
	}).then(async (response) => {
		let json = await response.json();
		sessionID = json.id;
		console.log(json);
		// fetch("")
		handleAction(json);
	});
});
async function handleAction(data) {
	console.log(data);
	if (data.action === "collect") {
		collect(data);
	} else if (data.action === "register-passkey") {
		registerPasskey(data);
	}
}
async function returnData(data) {
	fetch("/api/login/return", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			id: sessionID,
			...data,
		}),
	}).then(async (response) => {
		let json = await response.json();
		console.log(json);
		handleAction(json);
	});
}
async function collect(data) {
	// collectionMessageEl.innerHTML = "";
	// collectionHeaderEl.innerHTML = "";
	collectionMessageEl.innerText = data.message;
	collectionHeaderEl.innerText = data.header;
	collectionInputsEl.innerHTML = "";

	if (data.type === "email") {
		let emailInputEl = createElement("input", {
			attributes: {
				type: "email",
				placeholder: "Email",
				required: true,
			},
			classes: [],
			id: "",
		});
		collectionInputsEl.appendChild(emailInputEl);
		let listener = async (event) => {
			event.preventDefault();
			returnData({
				value: emailInputEl.value,
			});
			collectionFormEl.removeEventListener("submit", listener);
		};
		collectionFormEl.addEventListener("submit", listener);
	} else if (data.type === "binary") {
		// TODO: use yes and no buttons
		let consentInputEl = createElement("input", {
			attributes: {
				type: "checkbox",
				required: true,
			},
			classes: [],
			id: "",
		});
		collectionInputsEl.appendChild(consentInputEl);
		let listener = async (event) => {
			event.preventDefault();
			returnData({
				value: consentInputEl.checked,
			});
			collectionFormEl.removeEventListener("submit", listener);
		};
		collectionFormEl.addEventListener("submit", listener);
	}
}

async function registerPasskey(data) {
	const attestationResponse = await SimpleWebAuthnBrowser.startRegistration(
		data.WebAuthnOptions
	);
	const verificationResponse = await fetch("/api/login/return", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: sessionID,
			attestationResponse,
		}),
	});
}
