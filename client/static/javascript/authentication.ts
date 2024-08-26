import { createElement } from "./utils.ts";
import {
	Action,
	AssertionResponseLoginDataReturn,
	AttestationResponseLoginDataReturn,
	AuthenticatePasskeyAction,
	CollectAction,
	CollectionType,
	CollectionTypeString,
	InputLoginDataReturn,
	LoginData,
	LoginDataReturn,
	LoginInitializationOptions,
	OtherAction,
	RegisterPasskeyAction,
} from "../../../server/types.ts";
import { checkPassword } from "../../../server/utils.ts";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types";
import validator from "validator";
import { RegistrationResponseJSON } from "@simplewebauthn/server/esm/deps";

var collectionMessageEl: HTMLElement,
	collectionHeaderEl: HTMLElement,
	collectionFormEl: HTMLFormElement,
	collectionInputsEl: HTMLDivElement,
	collectionFormNextButton: HTMLButtonElement,
	hiddentDataEl: HTMLDivElement,
	sessionID: string,
	supportsWebAuthn: boolean,
	supportsConditionalUI: boolean,
	authenticationOptions: PublicKeyCredentialRequestOptionsJSON,
	documentDisplayBoxEl: HTMLElement,
	afterFormEl: HTMLElement,
	createAccountButton: HTMLElement;

export var onload: Function[] = [];
let collectionHandlers: ((event: SubmitEvent) => Promise<
	| {
			value: any;
			collectionType: CollectionTypeString;
	  }
	| false
>)[] = [];
let collectionFormSubmitHandler: (event: SubmitEvent) => Promise<void>;

window.addEventListener("load", async (event: Event) => {
	// Check if browser supports WebAuthn
	supportsWebAuthn =
		window.PublicKeyCredential &&
		navigator.credentials &&
		typeof navigator.credentials.create === "function" &&
		typeof navigator.credentials.get === "function";
	// Check if browser supports Conditional UI
	supportsConditionalUI =
		typeof PublicKeyCredential.isConditionalMediationAvailable === "function" &&
		(await PublicKeyCredential.isConditionalMediationAvailable());
	for (let onload_function of onload) onload_function();
});

/**
 * Handles actions from LoginData returned from the server
 */
export async function handleAction(data: LoginData, new_sessionID?: string) {
	if (new_sessionID) sessionID = new_sessionID;
	let actions = data.actions;
	for (let item of actions) {
		if (item.action === "reset-form") {
			collectionInputsEl.innerHTML = "";
		}
		if (item.action === "collect") {
			collectionInputsEl.innerHTML = "";
			collectionMessageEl.innerText = item.message;
			collectionHeaderEl.innerText = item.header;
			collectionFormNextButton.style.display = "block";
			collectionHandlers = [];
			for (let type of item.types) collect(type);
			collectionFormSubmitHandler = async (event: SubmitEvent) => {
				event.preventDefault();
				let values = {};
				for (let handler of collectionHandlers) {
					let value = await handler(event);
					if (value === false) {
						collectionFormNextButton.addEventListener(
							"click",
							collectionFormSubmitHandler,
							{
								once: true,
							}
						);
						return;
					} // The data was rejected
					if (value === null) continue; // No data
					values[value.collectionType] = value.value;
				}
				returnData([
					{
						type: "input",
						values,
					},
				]);
			};
			collectionFormNextButton.addEventListener(
				"click",
				collectionFormSubmitHandler,
				{
					once: true,
				}
			);
		} else if (item.action === "register-passkey") {
			registerPasskey(item);
		} else if (item.action === "authenticate-passkey") {
			authenticatePasskey(item);
		} else if (item.action === "init-conditional-ui") {
			initConditionalUI(item);
		} else if (item.action === "show-use-passkey-button") {
			showUsePasskeyButton(item);
		} else if (item.action === "exit") {
			// Go back to the home page
			window.location.href = "/";
		} else if (item.action === "reload") {
			// Reload the page
			window.location.reload();
		} else if (item.action === "set-authentication-options") {
			authenticationOptions = item.authenticationOptions;
		} else if (item.action === "redirect") {
			window.location.href = item.path;
		} else if (item.action === "error" && item.errors.length > 0) {
			alert(item.errors.join("\n"));
		}
	}
}

/**
 * Returns data to the server
 */
export async function returnData(data: LoginDataReturn[] = []) {
	fetch("/api/session/return", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			id: sessionID,
			return: data,
		}),
	}).then(async (response) => {
		let json = await response.json();
		handleAction(json.value);
		if (json.done) return;
	});
}

/**
 * For collecting values from the user.
 */
export async function collect(data: CollectionType) {
	if (data.type === "email") {
		hiddentDataEl.querySelectorAll("input[name=email]").forEach((input) => {
			input.remove(); // Remove old inputs
		});
		let emailInputEl = createElement("input", {
			attributes: {
				type: "email",
				name: "email",
				placeholder: "Email",
				required: true,
				autocomplete: "email webauthn",
				imputmode: "email",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(emailInputEl);

		collectionHandlers.push(async (event: SubmitEvent) => {
			if (!validator.isEmail(emailInputEl.value)) {
				alert("Please enter a valid email.");
				return false;
			}
			hiddentDataEl.appendChild(
				createElement("input", {
					attributes: {
						type: "email",
						name: "email",
						value: emailInputEl.value,
						autocomplete: "email webauthn",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			return {
				value: emailInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "binary") {
		if (data.submits === true) {
			collectionFormNextButton.style.display = "none";
		}
		let yesButtonEl = createElement("button", {
			attributes: {},
			classes: ["yes-button"],
			id: "",
			text: "yes",
		});
		let noButtonEl = createElement("button", {
			attributes: {},
			classes: ["no-button"],
			id: "",
			text: "no",
		});
		collectionInputsEl.appendChild(yesButtonEl);
		collectionInputsEl.appendChild(noButtonEl);
		let value: boolean;
		yesButtonEl.addEventListener(
			"click",
			async (event) => {
				value = true;
				if (data.submits === true) {
					collectionFormNextButton.dispatchEvent(new PointerEvent("click"));
				}
			},
			{
				once: true,
			}
		);
		noButtonEl.addEventListener(
			"click",
			async (event) => {
				value = false;
				if (data.submits === true) {
					collectionFormNextButton.dispatchEvent(new PointerEvent("click"));
				}
			},
			{
				once: true,
			}
		);
		collectionHandlers.push(async (event: SubmitEvent) => {
			return {
				value: value,
				collectionType: data.type,
			};
		});
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
		collectionHandlers.push(async (event: SubmitEvent) => {
			const selectedOption = document.querySelector(
				'input[name="choice"]:checked'
			) as HTMLInputElement;
			return {
				value: parseInt(selectedOption.value),
				collectionType: data.type,
			};
		});
	} else if (data.type === "create-password") {
		hiddentDataEl
			.querySelectorAll("input[name=new-password]")
			.forEach((input) => {
				input.remove(); // Remove old inputs
			});
		let passwordInputEl = createElement("input", {
			attributes: {
				type: "password",
				name: "password",
				placeholder: "Password",
				required: true,
				autocomplete: "new-password",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		let passwordConfirmInputEl = createElement("input", {
			attributes: {
				type: "password",
				placeholder: "Confirm Password",
				required: true,
				autocomplete: "new-password",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(passwordInputEl);
		collectionInputsEl.appendChild(passwordConfirmInputEl);
		collectionHandlers.push(async (event: SubmitEvent) => {
			if (passwordInputEl.value !== passwordConfirmInputEl.value) {
				alert("Passwords do not match.");
				return false;
			}
			let value = passwordInputEl.value;
			let errors = checkPassword(value, data.requirements);
			if (errors.length > 0) {
				alert(errors.join("\n"));
				return false;
			}
			hiddentDataEl.appendChild(
				createElement("input", {
					attributes: {
						type: "password",
						name: "new-password",
						value,
						autocomplete: "current-password",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			return {
				value: passwordInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "get-password") {
		hiddentDataEl
			.querySelectorAll("input[name=current-password]")
			.forEach((input) => {
				input.remove(); // Remove old inputs
			});
		let passwordInputEl = createElement("input", {
			attributes: {
				type: "password",
				placeholder: "Password",
				required: true,
				autocomplete: "current-password",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(passwordInputEl);
		collectionHandlers.push(async (event: SubmitEvent) => {
			hiddentDataEl.appendChild(
				createElement("input", {
					attributes: {
						type: "password",
						name: "current-password",
						value: passwordInputEl.value,
						autocomplete: "current-password",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			return {
				value: passwordInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "telephone") {
		let telephoneInputEl = createElement("input", {
			attributes: {
				type: "tel",
				placeholder: "Telephone",
				required: true,
				autocomplete: "tel webauthn",
				inputmode: "tel",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(telephoneInputEl);
		collectionHandlers.push(async (event: SubmitEvent) => {
			hiddentDataEl.appendChild(
				createElement("input", {
					attributes: {
						type: "tel",
						name: "tel",
						value: telephoneInputEl.value,
						autocomplete: "tel",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			return {
				value: telephoneInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "text") {
		let textInputEl = createElement("input", {
			attributes: {
				type: "text",
				placeholder: "Text",
				required: true,
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(textInputEl);
		collectionHandlers.push(async (event: SubmitEvent) => {
			return {
				value: textInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "url") {
		let urlInputEl = createElement("input", {
			attributes: {
				type: "url",
				placeholder: "URL",
				required: true,
				inputmode: "url",
			},
			classes: [],
			id: "",
		}) as HTMLInputElement;
		collectionInputsEl.appendChild(urlInputEl);
		collectionHandlers.push(async (event: SubmitEvent) => {
			return {
				value: urlInputEl.value,
				collectionType: data.type,
			};
		});
	} else if (data.type === "show-document") {
		documentDisplayBoxEl.innerHTML = data.html;
		if (data.required) {
			collectionFormNextButton.disabled = true;
		}
		documentDisplayBoxEl.style.display = "block";
		let read = false;
		let handler = () => {
			// If the user scrolls to the end, enable the next button
			if (
				documentDisplayBoxEl.scrollTop + documentDisplayBoxEl.clientHeight >=
				documentDisplayBoxEl.scrollHeight - 25
			) {
				collectionFormNextButton.disabled = false;
				read = true;
			}
		};
		handler();
		documentDisplayBoxEl.addEventListener("scroll", handler);
		collectionHandlers.push(async (event: SubmitEvent) => {
			if (!read) {
				alert("Please read the document first.");
				return false;
			}
			documentDisplayBoxEl.removeEventListener("scroll", handler);
			documentDisplayBoxEl.style.display = "none";
			return null;
		});
	}
}

export async function registerPasskey(data: RegisterPasskeyAction) {
	async function handleAttestationResponse(
		attestationResponse: RegistrationResponseJSON | null
	) {
		const verificationResponse = await fetch("/api/session/return", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: sessionID,
				return: [
					{
						type: "attestation-response",
						attestationResponse,
					} as AttestationResponseLoginDataReturn,
				],
			}),
		});
		let json = await verificationResponse.json();
		handleAction(json.value);
		if (json.value.data.success) {
			if (!json.done) returnData();
			// TODO: handle success
		} else {
			// Passkey registration failed
			// Just keep going on with the registration
			if (!json.done) returnData();
			// TODO: handle failure
		}
	}
	startRegistration(data.WebAuthnOptions)
		.then((attestationResponse) => {
			handleAttestationResponse(attestationResponse);
		})
		.catch((error) => {
			handleAttestationResponse(null);
		});
}
export async function authenticatePasskey(
	data: AuthenticatePasskeyAction = {
		action: "authenticate-passkey",
		WebAuthnOptions: null,
	}
) {
	let WebAuthnOptions = authenticationOptions;
	if (data.WebAuthnOptions) WebAuthnOptions = data.WebAuthnOptions;
	startAuthentication(WebAuthnOptions)
		.then(async (assertionResponse) => {
			const verificationResponse = await fetch("/api/session/return", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: sessionID,
					return: [
						{
							type: "assertion-response",
							assertionResponse,
						} as AssertionResponseLoginDataReturn,
					],
				}),
			});
			let json = await verificationResponse.json();
			handleAction(json.value);
			if (json.value.data.success) {
				if (!json.done) returnData();
				// TODO: handle success
			} else {
				alert("Authentication Failed.");
				// TODO: handle failure
			}
		})
		.catch(() => returnData());
}
async function initConditionalUI(data: OtherAction) {
	if (!supportsWebAuthn) {
		return;
	}
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
				const verificationResponse = await fetch("/api/session/return", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: sessionID,
						return: [
							{
								type: "assertion-response",
								assertionResponse,
							} as AssertionResponseLoginDataReturn,
						],
					}),
				});
				let json = await verificationResponse.json();
				handleAction(json.value);
				if (json.value.data.success) {
					// TODO: handle success
					if (!json.done) returnData();
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
}

async function showUsePasskeyButton(data: OtherAction) {
	let usePasskeyButton = createElement("button", {
		attributes: {},
		classes: [],
		id: "use-passkey",
	});
	usePasskeyButton.innerText = "Sign in with a passkey";
	usePasskeyButton.addEventListener(
		"click",
		async (event: PointerEvent) => {
			await authenticatePasskey();
		},
		{
			once: true,
		}
	);
	afterFormEl.appendChild(usePasskeyButton);
}
async function initLoginSession(conditionalUIOnly: boolean) {
	let response = await fetch("/api/login/init", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			supportsWebAuthn,
			supportsConditionalUI,
			conditionalUIOnly,
		} as LoginInitializationOptions),
	});
	let json = await response.json();
	sessionID = json.id;
	authenticationOptions = json.value.authenticationOptions;
	handleAction(json.value);
	return response;
}
export async function initPassiveLogin() {
	let input = createElement("input", {
		attributes: {
			style: "display: none;",
			autocomplete: "webauthn",
		},
	});
	document.body.appendChild(input);
	if (!(supportsWebAuthn && supportsConditionalUI)) return;
	// Initiate login
	initLoginSession(true);
}

export async function initLoginPage() {
	// Get HTML elements
	collectionMessageEl = document.getElementById(
		"collection-message"
	) as HTMLHeadingElement;
	collectionHeaderEl = document.getElementById(
		"collection-header"
	) as HTMLHeadingElement;
	collectionFormEl = document.getElementById(
		"collection-form"
	) as HTMLFormElement;
	collectionInputsEl = document.getElementById(
		"collection-inputs"
	) as HTMLDivElement;
	collectionFormNextButton = document.getElementById(
		"collection-form-next-button"
	) as HTMLButtonElement;
	documentDisplayBoxEl = document.getElementById(
		"document-display-box"
	) as HTMLDivElement;
	afterFormEl = document.getElementById("after-form") as HTMLDivElement;
	hiddentDataEl = document.getElementById("hidden-data") as HTMLDivElement;
	createAccountButton = document.getElementById("create-account");

	// Initiate login
	initLoginSession(false);
}
