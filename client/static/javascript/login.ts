import { createElement } from "./utils.ts";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types";
var collectionMessageEl: HTMLElement,
	collectionHeaderEl: HTMLElement,
	collectionFormEl: HTMLFormElement,
	collectionInputsEl: HTMLDivElement,
	sessionID: string,
	supportsWebAuthn: boolean,
	supportsConditionalUI: boolean,
	authenticationOptions: PublicKeyCredentialRequestOptionsJSON;

window.addEventListener("load", async (event) => {
	supportsWebAuthn =
		window.PublicKeyCredential &&
		navigator.credentials &&
		typeof navigator.credentials.create === "function" &&
		typeof navigator.credentials.get === "function";
	supportsConditionalUI =
		typeof PublicKeyCredential.isConditionalMediationAvailable === "function" &&
		(await PublicKeyCredential.isConditionalMediationAvailable());
	collectionMessageEl = document.getElementById("collection-message");
	collectionHeaderEl = document.getElementById("collection-header");
	collectionFormEl = document.getElementById(
		"collection-form"
	) as HTMLFormElement;
	collectionInputsEl = document.getElementById(
		"collection-inputs"
	) as HTMLDivElement;
	fetch("/api/login/init", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			supportsWebAuthn,
			supportsConditionalUI,
		}),
	}).then(async (response) => {
		let json = await response.json();
		sessionID = json.id;
		authenticationOptions = json.value.authenticationOptions;
		if (json.done) return;
		// fetch("")
		handleAction(json.value);
	});
});
async function handleAction(data) {
	let actions = data.actions;
	if (!Array.isArray(actions)) actions = [data];
	for (let item of actions) {
		if (item.action === "collect") {
			collect(item);
		} else if (item.action === "register-passkey") {
			registerPasskey(item);
		} else if (item.action === "authenticate-passkey") {
			authenticatePasskey(item);
		} else if (item.action === "init-conditional-ui") {
			initConditionalUI(item);
		}
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
		if (json.done) return;
		handleAction(json.value);
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
				autocomplete: "email webauthn",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(emailInputEl);
		let listener = async (event: SubmitEvent) => {
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
		let listener = async (event: SubmitEvent) => {
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
		let listener = async (event: SubmitEvent) => {
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
	const attestationResponse = await startRegistration(data.WebAuthnOptions);
	const verificationResponse = await fetch("/api/login/return", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: sessionID,
			attestationResponse,
		}),
	});
	let json = await verificationResponse.json();
	if (json.value.success) {
		// TODO: handle success
	} else {
		// TODO: handle failure
	}
}
async function authenticatePasskey(data = { WebAuthnOptions: null }) {
	let WebAuthnOptions = authenticationOptions;
	if (data.WebAuthnOptions) {
		WebAuthnOptions = data.WebAuthnOptions;
	}
	const assertionResponse = await startAuthentication(WebAuthnOptions);
	const verificationResponse = await fetch("/api/login/return", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: sessionID,
			assertionResponse,
		}),
	});
	let json = await verificationResponse.json();
	if (json.value.success) {
		// TODO: handle success
	} else {
		// TODO: handle failure
	}
}
async function initConditionalUI(data) {
	if (supportsConditionalUI) {
		if (
			!(
				typeof PublicKeyCredential.isConditionalMediationAvailable ===
					"function" && PublicKeyCredential.isConditionalMediationAvailable()
			)
		) {
			return;
		}

		startAuthentication(authenticationOptions, true)
			.then(async (assertionResponse) => {
				const verificationResponse = await fetch("/api/login/return", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: sessionID,
						assertionResponse,
					}),
				});
				let json = await verificationResponse.json();
				if (json.value.success) {
					alert("Login Success!");
					// TODO: handle success
				} else {
					alert("Login Failure!");
					// TODO: handle failure
				}
			})
			.catch(async (err) => {
				console.log(err);
				// TODO: handle failure
			});
	}
	let usePasskeyButton = createElement("button", {
		attributes: {},
		classes: [],
		id: "usePasskey",
	});
	usePasskeyButton.innerText = "Sign in with a passkey";
	async function eventHandler(event: PointerEvent) {
		usePasskeyButton.removeEventListener("click", eventHandler);
		await authenticatePasskey();
	}
	usePasskeyButton.addEventListener("click", eventHandler);
	collectionFormEl.appendChild(usePasskeyButton);
}
