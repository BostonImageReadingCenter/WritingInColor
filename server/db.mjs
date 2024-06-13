const mysql = require("mysql");

const pool = mysql.createPool({
	connectionLimit: 10,
	host: "localhost",
	user: "admin",
	password: "WritingInColor01!",
	database: "WritingInColor",
});

// Define your SQL query to create the table if it doesn't exist
// roles are admin, student, moderator, or instructor
//
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email TEXT,
    first_name TEXT,
    password TEXT,
    salt TEXT,
  )
`;

// Execute the query
pool.query(createTableQuery, (error, results, fields) => {
	if (error) {
		console.error("\x1b[31mError creating table:", error, "\x1b[0m");
		return;
	}
	console.log("\x1b[32mTable created successfully\x1b[0m");
});
