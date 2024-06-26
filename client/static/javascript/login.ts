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
		// fetch("")
		handleAction(json);
	});
});
async function handleAction(data) {
	if (data.action === "collect") {
		collect(data);
	} else if (data.action === "register-passkey") {
		registerPasskey(data);
	} else if (data.action === "authenticate-passkey") {
		authenticatePasskey(data);
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
		}) as HTMLInputElement;
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
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(consentInputEl);
		let listener = async (event) => {
			event.preventDefault();
			returnData({
				value: consentInputEl.checked,
			});
			collectionFormEl.removeEventListener("submit", listener);
		};
		collectionFormEl.addEventListener("submit", listener);
	} else if (data.type === "choice") {
		// Using radio buttons
		for (let i = 0; i < data.options.length; i++) {
			let choiceInputEl = createElement("input", {
				attributes: {
					type: "radio",
					name: "choice",
					value: i,
					required: true,
				},
				classes: [],
				id: "",
			});
			collectionInputsEl.appendChild(choiceInputEl);
			let choiceLabelEl = createElement("label", {
				attributes: {
					for: "choice",
				},
				classes: [],
				id: "",
			});
			choiceLabelEl.innerText = data.options[i];
			collectionInputsEl.appendChild(choiceLabelEl);
		}
		let listener = async (event) => {
			event.preventDefault();
			const selectedOption = document.querySelector(
				'input[name="choice"]:checked'
			) as HTMLInputElement;
			returnData({
				value: parseInt(selectedOption.value),
			});
			collectionFormEl.removeEventListener("submit", listener);
		};
		collectionFormEl.addEventListener("submit", listener);
	}
}

async function registerPasskey(data) {
	// @ts-ignore
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
	let json = await verificationResponse.json();
	if (json.success) {
		// TODO: handle success
	} else {
		// TODO: handle failure
	}
}
async function authenticatePasskey(data) {
	console.log(data);
	// @ts-ignore
	const assertionResponse = await SimpleWebAuthnBrowser.startAuthentication(
		data.options
	);
	const verificationResponse = await fetch("/api/login/return", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: sessionID,
			assertionResponse,
		}),
	});
	let json = await verificationResponse.json();
	if (json.success) {
		// TODO: handle success
	} else {
		// TODO: handle failure
	}
}
