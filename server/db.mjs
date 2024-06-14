import mysql from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";

// Load environment variables
config();

// Database connection configuration
const MySQL_config = {
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
};

// Utility function to convert UUID to binary
function uuidToBinary(uuid) {
	return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

async function initDatabase() {
	const pool = mysql.createPool(MySQL_config);
	const promisePool = await pool.promise();
	return { pool, promisePool };
}
async function createUser(
	promisePool,
	{
		emails = [],
		passkeys = [],
		roles = [],
		password = null,
		salt = null,
		userID = uuidToBinary(uuidv4()),
	}
) {
	await promisePool.execute(
		"INSERT INTO users (id, salt, password) VALUES (?, ?, ?)",
		[userID, salt, password]
	);

	for (const email of emails) {
		await promisePool.execute(
			"INSERT INTO emails (id, user_id, email) VALUES (?, ?, ?)",
			[uuidToBinary(uuidv4()), userID, email]
		);
	}

	for (const passkey of passkeys) {
		// TODO
	}

	for (const role of roles) {
		await promisePool.execute(
			"INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
			[userID, role]
		);
	}
}
async function test() {
	let { pool, promisePool } = await initDatabase();
	try {
		const [rows] = await promisePool.query("SELECT * FROM roles");
		console.log(rows);
	} catch (err) {
		console.error(err);
	} finally {
		// Close the pool to end the program
		pool.end();
	}
}

export { initDatabase, createUser, test };
