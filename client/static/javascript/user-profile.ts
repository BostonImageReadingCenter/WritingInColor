import { User } from "../../../server/types";

declare var user: User;

window.addEventListener("load", (event: Event) => {
	let addEmailButton = document.getElementById("add-email-button");
	let addPasskeyButton = document.getElementById("add-passkey-button");
	let editNameButton = document.getElementById("edit-name-button");
	let saveButton = document.getElementById("save-button");
	let firstNameEl = document.getElementById("first-name") as HTMLInputElement;
	let lastNameEl = document.getElementById("last-name") as HTMLInputElement;

	addEmailButton.addEventListener("click", (event: Event) => {
		event.preventDefault();
		event.stopPropagation();
		// TODO
	});
	addPasskeyButton.addEventListener("click", (event: Event) => {
		event.preventDefault();
		event.stopPropagation();
		// TODO
	});
	firstNameEl.addEventListener("input", (event: Event) => {
		event.preventDefault();
		saveButton.removeAttribute("disabled");
	});
	lastNameEl.addEventListener("input", (event: Event) => {
		event.preventDefault();
		saveButton.removeAttribute("disabled");
	});
	saveButton.addEventListener("click", (event: Event) => {
		fetch("/api/update-user-information", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				"first-name": firstNameEl.value,
				"last-name": lastNameEl.value,
			}),
		});
	});
});
