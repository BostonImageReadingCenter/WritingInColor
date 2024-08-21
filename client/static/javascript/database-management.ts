declare var JSON_DATA: {
	[key: string]: {
		[key: string]: string;
	}[];
};

window.addEventListener("load", async (event: Event) => {
	let tables = document.querySelectorAll(".db-table");
	let TDs = document.querySelectorAll(".db-table .row-data");
	let saveButton = document.getElementById("save-button");
	let deleteRowButtons = document.querySelectorAll(
		".db-table .delete-row-button"
	);
	let addRowButtons = document.getElementsByClassName("add-row-button");
	function save() {
		fetch("/api/save-db", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(JSON_DATA),
		}).then(() => {
			saveButton.setAttribute("disabled", "true");
			alert("Saved!");
		});
	}
	function deleteListener(table, rowId) {
		JSON_DATA[table].splice(rowId, 1);
		saveButton.removeAttribute("disabled");
		document.querySelector("tr[data-row-id='" + rowId + "']").remove();
	}
	function editListener(
		element: Element,
		table: string,
		rowId: string | number,
		key: string
	) {
		saveButton.removeAttribute("disabled");
		JSON_DATA[table][rowId][key] = element.textContent;
	}

	for (let td of Array.from(TDs)) {
		let table = td.getAttribute("data-table");
		let rowId = td.getAttribute("data-row-id");
		let key = td.getAttribute("data-key");
		td.addEventListener("input", () => editListener(td, table, rowId, key));
	}
	for (let button of Array.from(deleteRowButtons)) {
		let table = button.getAttribute("data-table");
		let rowId = button.getAttribute("data-row-id");
		button.addEventListener("click", () => deleteListener(table, rowId));
	}

	for (let button of Array.from(addRowButtons)) {
		let table = button.getAttribute("data-table");
		button.addEventListener("click", () => {
			JSON_DATA[table].push({});
			let rowId = JSON_DATA[table].length - 1;
			// Add properties to new row
			for (let key of Object.keys(JSON_DATA[table][0])) {
				JSON_DATA[table][rowId][key] = "";
			}

			let row = document.createElement("tr");
			row.setAttribute("data-row-id", String(JSON_DATA[table].length - 1));
			let td = document.createElement("td");
			let deleteButton = document.createElement("button");
			deleteButton.setAttribute("data-table", table);
			deleteButton.setAttribute(
				"data-row-id",
				String(JSON_DATA[table].length - 1)
			);
			deleteButton.innerText = "Delete";
			deleteButton.addEventListener("click", () =>
				deleteListener(table, rowId)
			);
			td.appendChild(deleteButton);
			row.appendChild(td);

			for (let key of Object.keys(JSON_DATA[table][0])) {
				let td = document.createElement("td");
				td.setAttribute("data-table", table);
				td.setAttribute("data-row-id", String(JSON_DATA[table].length - 1));
				td.setAttribute("data-key", key);
				td.setAttribute("contenteditable", "true");
				td.addEventListener("input", () => editListener(td, table, rowId, key));
				row.appendChild(td);
			}
			let tbody = document.querySelector(
				"table[data-table='" + table + "'] tbody"
			);
			tbody.appendChild(row);
		});
		saveButton.removeAttribute("disabled");
	}

	saveButton.addEventListener("click", save);
});
