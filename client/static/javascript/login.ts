import { createElement } from "./utils.ts";
import {
	Action,
	AuthenticatePasskeyAction,
	CollectAction,
	InitConditionalUIAction,
	LoginData,
	LoginInitializationOptions,
	RegisterPasskeyAction,
	ShowUsePasskeyButtonAction,
} from "../../../server/types";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types";
var collectionMessageEl: HTMLElement,
	collectionHeaderEl: HTMLElement,
	collectionFormEl: HTMLFormElement,
	collectionInputsEl: HTMLDivElement,
	hiddenData: HTMLDivElement,
	sessionID: string,
	supportsWebAuthn: boolean,
	supportsConditionalUI: boolean,
	authenticationOptions: PublicKeyCredentialRequestOptionsJSON;

window.addEventListener("load", async (event) => {
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

	// Get HTML elements
	collectionMessageEl = document.getElementById("collection-message");
	collectionHeaderEl = document.getElementById("collection-header");
	collectionFormEl = document.getElementById(
		"collection-form"
	) as HTMLFormElement;
	collectionInputsEl = document.getElementById(
		"collection-inputs"
	) as HTMLDivElement;
	hiddenData = document.getElementById("hidden-data") as HTMLDivElement;

	// Initiate login
	fetch("/api/login/init", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			supportsWebAuthn,
			supportsConditionalUI,
		} as LoginInitializationOptions),
	}).then(async (response) => {
		let json = await response.json();
		sessionID = json.id;
		authenticationOptions = json.value.authenticationOptions;
		handleAction(json.value);
		if (json.done) return;
	});
});

/**
 * Handles actions from LoginData returned from the server
 */
async function handleAction(data: LoginData) {
	console.log(data);
	let actions = data.actions;
	for (let item of actions) {
		if (item.action === "collect") {
			collect(item);
		} else if (item.action === "register-passkey") {
			registerPasskey(item);
		} else if (item.action === "authenticate-passkey") {
			authenticatePasskey(item);
		} else if (item.action === "init-conditional-ui") {
			initConditionalUI(item);
		} else if (item.action === "show-use-passkey-button") {
			showUsePasskeyButton(item);
		} else if (item.action === "exit") {
			// Reload
			window.location.reload();
		} else if (item.action === "set-authentication-options") {
			authenticationOptions = item.authenticationOptions;
		} else if (item.action === "redirect") {
			window.location.href = item.path;
		}
	}
}

/**
 * Returns data to the server
 */
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
		handleAction(json.value);
		if (json.done) return;
	});
}

/**
 * For collecting values from the user.
 */
async function collect(data: CollectAction) {
	collectionMessageEl.innerText = data.message;
	collectionHeaderEl.innerText = data.header;
	collectionInputsEl.innerHTML = "";

	if (data.type === "email") {
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
		let listener = async (event: SubmitEvent) => {
			event.preventDefault();
			hiddenData.appendChild(
				createElement("input", {
					attributes: {
						type: "email",
						name: "email",
						value: emailInputEl.value,
						autocomplete: "email",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			returnData({
				value: emailInputEl.value,
			});
		};
		collectionFormEl.addEventListener("submit", listener, {
			once: true,
		});
	} else if (data.type === "binary") {
		let yesButtonEl = createElement("button", {
			attributes: {},
			classes: [],
			id: "",
			text: "yes",
		});
		let noButtonEl = createElement("button", {
			attributes: {},
			classes: [],
			id: "",
			text: "no",
		});
		collectionInputsEl.appendChild(yesButtonEl);
		collectionInputsEl.appendChild(noButtonEl);
		yesButtonEl.addEventListener(
			"click",
			async (event) => {
				returnData({
					value: true,
				});
			},
			{
				once: true,
			}
		);
		noButtonEl.addEventListener(
			"click",
			async (event) => {
				returnData({
					value: false,
				});
			},
			{
				once: true,
			}
		);
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
		collectionFormEl.addEventListener(
			"submit",
			async (event: SubmitEvent) => {
				event.preventDefault();
				const selectedOption = document.querySelector(
					'input[name="choice"]:checked'
				) as HTMLInputElement;
				returnData({
					value: parseInt(selectedOption.value),
				});
			},
			{
				once: true,
			}
		);
	} else if (data.type === "create-password") {
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
		let listener = async (event: SubmitEvent) => {
			event.preventDefault();
			if (passwordInputEl.value !== passwordConfirmInputEl.value) {
				alert("Passwords do not match.");
				return;
			}
			hiddenData.appendChild(
				createElement("input", {
					attributes: {
						type: "password",
						name: "password",
						value: passwordInputEl.value,
						autocomplete: "current-password",
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
			returnData({
				value: passwordInputEl.value,
			});
		};
		collectionFormEl.addEventListener("submit", listener, {
			once: true,
		});
	} else if (data.type === "get-password") {
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
		collectionFormEl.addEventListener("submit", async (event: SubmitEvent) => {
			event.preventDefault();
			hiddenData.appendChild(
				createElement("input", {
					attributes: {
						type: "password",
						name: "password",
						style: "display: none;",
						value: passwordInputEl.value,
						autocomplete: "current-password",
					},
					classes: [],
					id: "",
				})
			);
			returnData({
				value: passwordInputEl.value,
			});
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
		collectionFormEl.addEventListener(
			"submit",
			async (event: SubmitEvent) => {
				event.preventDefault();
				hiddenData.appendChild(
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
				returnData({
					value: telephoneInputEl.value,
				});
			},
			{
				once: true,
			}
		);
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
		collectionFormEl.addEventListener("submit", async (event: SubmitEvent) => {
			event.preventDefault();
			hiddenData.appendChild(
				createElement("input", {
					attributes: {
						type: "text",
						name: "text",
						value: textInputEl.value,
						style: "display: none;",
					},
					classes: [],
					id: "",
				})
			);
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
		collectionFormEl.addEventListener("submit", async (event: SubmitEvent) => {
			event.preventDefault();
			hiddenData.appendChild(
				createElement("input", {
					attributes: {
						type: "url",
						name: "url",
						value: urlInputEl.value,
						style: "display: none;",
					},
				})
			);
		});
	}
}

async function registerPasskey(data: RegisterPasskeyAction) {
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
	handleAction(json.value);
	if (json.value.data.success) {
		if (!json.done) returnData({});
		// TODO: handle success
	} else {
		alert("Registration Failed.");
		// TODO: handle failure
	}
}
async function authenticatePasskey(
	data: AuthenticatePasskeyAction = {
		action: "authenticate-passkey",
		WebAuthnOptions: null,
	}
) {
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
	handleAction(json.value);
	if (json.value.data.success) {
		if (!json.done) returnData({});
		// TODO: handle success
	} else {
		alert("Authentication Failed.");
		// TODO: handle failure
	}
}
async function initConditionalUI(data: InitConditionalUIAction) {
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
				const verificationResponse = await fetch("/api/login/return", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: sessionID,
						assertionResponse,
					}),
				});
				let json = await verificationResponse.json();
				handleAction(json.value);
				if (json.value.data.success) {
					// TODO: handle success
					if (!json.done) returnData({});
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

async function showUsePasskeyButton(data: ShowUsePasskeyButtonAction) {
	let usePasskeyButton = createElement("button", {
		attributes: {},
		classes: [],
		id: "usePasskey",
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
	collectionFormEl.appendChild(usePasskeyButton);
}
