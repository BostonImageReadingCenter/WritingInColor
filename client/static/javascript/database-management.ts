window.addEventListener("load", async (event: Event) => {
	let tables = document.querySelectorAll(".db-table");
	let TDs = document.querySelectorAll(".db-table td");
	let saveButton = document.getElementById("save-button");
	function save() {
		fetch("/api/save-db", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			// @ts-ignore
			body: JSON.stringify(JSON_DATA),
		}).then(() => {
			saveButton.setAttribute("disabled", "true");
			alert("Saved!");
		});
	}

	for (let td of Array.from(TDs)) {
		let table = td.getAttribute("data-table");
		let rowId = td.getAttribute("data-row-id");
		let key = td.getAttribute("data-key");
		td.addEventListener("input", () => {
			saveButton.removeAttribute("disabled");
			// @ts-ignore
			JSON_DATA[table][rowId][key] = td.textContent;
		});
	}

	saveButton.addEventListener("click", save);
});
