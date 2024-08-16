import { UpdateUserInformationParameters, User } from "../../../server/types";
import { handleAction, registerPasskey } from "./authentication.ts";

declare var user: User;

window.addEventListener("load", (event: Event) => {
	let addEmailButton = document.getElementById("add-email-button");
	let addPasskeyButton = document.getElementById("add-passkey-button");
	let editNameButton = document.getElementById("edit-name-button");
	let saveButton = document.getElementById("save-button");
	let firstNameEl = document.getElementById("first-name") as HTMLInputElement;
	let lastNameEl = document.getElementById("last-name") as HTMLInputElement;
	let updateUserInformationParameters: UpdateUserInformationParameters = {};

	addEmailButton.addEventListener("click", (event: Event) => {
		event.preventDefault();
		event.stopPropagation();
		saveButton.removeAttribute("disabled");
		let email = prompt("Enter an email address to add to your account:");
		if (email) {
			updateUserInformationParameters["add-email"] = email;
		}
	});
	addPasskeyButton.addEventListener("click", (event: Event) => {
		event.preventDefault();
		event.stopPropagation();
		fetch("/api/begin-add-passkey", {
			method: "POST",
		}).then(async (response) => {
			let json = await response.json();
			console.log(json);
			handleAction(json.value, json.id);
		});
	});
	firstNameEl.addEventListener("input", (event: Event) => {
		event.preventDefault();
		saveButton.removeAttribute("disabled");
		updateUserInformationParameters["set-first-name"] = firstNameEl.value;
	});
	lastNameEl.addEventListener("input", (event: Event) => {
		event.preventDefault();
		saveButton.removeAttribute("disabled");
		updateUserInformationParameters["set-last-name"] = lastNameEl.value;
	});
	Array.from(document.getElementsByClassName("make-primary-button")).forEach(
		(element) => {
			element.addEventListener("click", (event: Event) => {
				event.preventDefault();
				event.stopPropagation();
				saveButton.removeAttribute("disabled");
				let email = element.getAttribute("data-email");
				if (email) {
					updateUserInformationParameters["set-primary-email"] = email;
				}
			});
		}
	);
	Array.from(document.getElementsByClassName("remove-email-button")).forEach(
		(element) => {
			element.addEventListener("click", (event: Event) => {
				event.preventDefault();
				event.stopPropagation();
				saveButton.removeAttribute("disabled");
				let email = element.getAttribute("data-email");
				if (email) {
					if (!updateUserInformationParameters["remove-emails"])
						updateUserInformationParameters["remove-emails"] = [];
					updateUserInformationParameters["remove-emails"].push(email);
				}
			});
		}
	);
	saveButton.addEventListener("click", (event: Event) => {
		fetch("/api/update-user-information", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updateUserInformationParameters),
		}).then(async (response) => {
			saveButton.setAttribute("disabled", "true");
		});
	});
});
